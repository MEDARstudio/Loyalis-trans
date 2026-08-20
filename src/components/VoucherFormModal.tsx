import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  User, 
  MapPin, 
  Phone, 
  CreditCard, 
  Calendar, 
  Hash, 
  Package, 
  Scale, 
  Coins, 
  Printer, 
  Share2, 
  Save, 
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Banknote,
  DollarSign,
  Camera,
  Image as ImageIcon,
  FileUp,
  Eye,
  Loader2,
  FileText,
  ScanLine,
  Truck,
  TrendingUp,
  ArrowRightLeft,
  Building2,
  Copy
} from 'lucide-react';
import { AgentProfile, CompanySettings, LuggageItem, PaymentMethod, PaymentStatus, Voucher, VoucherPhoto, VoucherStatus, ExternalPaymentStatus } from '../types';
import { formatCurrency, formatTrackingNumber } from '../utils/formatters';
import { processVoucherPhoto, formatPhotoSize, generatePhotoFilename } from '../utils/imageCompressor';
import { VoucherPhotoViewerModal } from './VoucherPhotoViewerModal';

interface VoucherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (voucherData: Partial<Voucher>, actionAfterSave?: 'print' | 'share') => Promise<void>;
  initialVoucher?: Voucher | null;
  settings: CompanySettings;
  currentAgent?: AgentProfile;
}

export const VoucherFormModal: React.FC<VoucherFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialVoucher,
  settings,
  currentAgent
}) => {
  const isEditing = !!initialVoucher;
  const currency = settings.currency || 'DH';

  // Form State
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [isManualTracking, setIsManualTracking] = useState<boolean>(false);
  const [sequenceNumber, setSequenceNumber] = useState<number>(1);

  // Sender
  const [senderName, setSenderName] = useState<string>('');
  const [senderCin, setSenderCin] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [senderAddress, setSenderAddress] = useState<string>('');

  // Recipient
  const [recipientName, setRecipientName] = useState<string>('');
  const [destinationCity, setDestinationCity] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [departureCity, setDepartureCity] = useState<string>('');
  const [copiedFromSenderToast, setCopiedFromSenderToast] = useState<boolean>(false);

  // Luggage Items
  const [items, setItems] = useState<LuggageItem[]>([
    {
      id: `item-${Date.now()}-1`,
      nature: 'Valise',
      weightKg: 20,
      quantity: 1,
      price: 200,
      notes: ''
    }
  ]);

  // Pricing & Weight (Saisie libre du prix et du poids total avec remises)
  const [customTotalPrice, setCustomTotalPrice] = useState<string>('200');
  const [isPriceManual, setIsPriceManual] = useState<boolean>(false);
  const [customTotalWeight, setCustomTotalWeight] = useState<string>('20');
  const [isWeightManual, setIsWeightManual] = useState<boolean>(false);
  
  // Payment: 'NON_PAYE' | 'PAYE' | 'AVANCE'
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PAYE');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYE');

  const [status, setStatus] = useState<VoucherStatus>('EN_ATTENTE');
  const [notes, setNotes] = useState<string>('');
  const [agentName, setAgentName] = useState<string>('');

  // Sous-traitance & Transporteur Externe
  const [isExternalTransport, setIsExternalTransport] = useState<boolean>(false);
  const [externalCarrierName, setExternalCarrierName] = useState<string>('');
  const [externalCarrierPhone, setExternalCarrierPhone] = useState<string>('');
  const [externalCarrierVoucherRef, setExternalCarrierVoucherRef] = useState<string>('');
  const [externalCost, setExternalCost] = useState<string>('');
  const [externalPaymentStatus, setExternalPaymentStatus] = useState<ExternalPaymentStatus>('PAID');
  const [externalNotes, setExternalNotes] = useState<string>('');

  // Photos & Documents attachés
  const [bonReelPhoto, setBonReelPhoto] = useState<VoucherPhoto | null>(null);
  const [casePhotos, setCasePhotos] = useState<VoucherPhoto[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [photoPreviewModalOpen, setPhotoPreviewModalOpen] = useState<boolean>(false);
  const [previewPhotoTarget, setPreviewPhotoTarget] = useState<VoucherPhoto | null>(null);

  // File & Camera input refs
  const bonReelCameraInputRef = useRef<HTMLInputElement>(null);
  const bonReelFileInputRef = useRef<HTMLInputElement>(null);
  const caseCameraInputRef = useRef<HTMLInputElement>(null);
  const caseFileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Track previous open state & voucher id to prevent background updates from wiping user inputs
  const prevIsOpenRef = React.useRef<boolean>(false);
  const prevVoucherIdRef = React.useRef<string | null | undefined>(undefined);

  // Initialize form ONLY when modal opens or when editing target changes
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const voucherChanged = initialVoucher?.id !== prevVoucherIdRef.current;

    if (isOpen && (isOpening || voucherChanged)) {
      if (initialVoucher) {
        // Edit mode
        setDate(initialVoucher.date || '');
        setTime(initialVoucher.time || '');
        setTrackingNumber(initialVoucher.trackingNumber || '');
        setSequenceNumber(initialVoucher.sequenceNumber || 1);
        setIsManualTracking(true);
        
        setSenderName(initialVoucher.sender?.name || '');
        setSenderCin(initialVoucher.sender?.cin || '');
        setSenderPhone(initialVoucher.sender?.phone || '');
        setSenderAddress(initialVoucher.sender?.address || '');

        setRecipientName(initialVoucher.recipient?.name || '');
        setDestinationCity(initialVoucher.recipient?.destination || initialVoucher.destinationCity || '');
        setRecipientPhone(initialVoucher.recipient?.phone || '');
        setRecipientAddress(initialVoucher.recipient?.address || '');
        setDepartureCity(initialVoucher.departureCity || settings.defaultDepartureCity || 'Casablanca');

        const loadedItems = initialVoucher.items?.length
          ? initialVoucher.items.map((it, idx) => ({
              ...it,
              id: it.id || `item-${idx}`,
              quantity: it.quantity || 1,
              weightKg: it.weightKg || 0,
              price: it.price !== undefined ? it.price : (it.unitPrice !== undefined ? it.unitPrice * (it.quantity || 1) : 0),
              notes: it.notes || ''
            }))
          : [{ id: `item-1`, nature: 'Valise', weightKg: 20, quantity: 1, price: 200, notes: '' }];

        setItems(loadedItems);
        setCustomTotalPrice(String(initialVoucher.totalPrice ?? ''));
        setIsPriceManual(true);
        setCustomTotalWeight(String(initialVoucher.totalWeightKg ?? ''));
        setIsWeightManual(true);
        
        const initStatus: PaymentStatus = initialVoucher.paymentStatus 
          || (initialVoucher.paymentMethod === 'A_LA_LIVRAISON' || initialVoucher.paymentMethod === 'NON_PAYE' ? 'NON_PAYE' : initialVoucher.paymentMethod === 'AVANCE' ? 'AVANCE' : 'PAYE');
        setPaymentStatus(initStatus);
        setAdvanceAmount(initialVoucher.advanceAmount !== undefined && initialVoucher.advanceAmount > 0 ? String(initialVoucher.advanceAmount) : '');
        setPaymentMethod(initialVoucher.paymentMethod || initStatus);

        setStatus(initialVoucher.status || 'EN_ATTENTE');
        setNotes(initialVoucher.notes || '');
        setAgentName(initialVoucher.agentName || '');
        setBonReelPhoto(initialVoucher.bonReelPhoto || null);
        setCasePhotos(initialVoucher.casePhotos || []);

        setIsExternalTransport(Boolean(initialVoucher.isExternalTransport));
        setExternalCarrierName(initialVoucher.externalCarrierName || '');
        setExternalCarrierPhone(initialVoucher.externalCarrierPhone || '');
        setExternalCarrierVoucherRef(initialVoucher.externalCarrierVoucherRef || '');
        setExternalCost(initialVoucher.externalCost !== undefined && initialVoucher.externalCost > 0 ? String(initialVoucher.externalCost) : '');
        setExternalPaymentStatus(initialVoucher.externalPaymentStatus || 'PAID');
        setExternalNotes(initialVoucher.externalNotes || '');
      } else {
        // New mode
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toTimeString().substring(0, 5);
        setDate(today);
        setTime(nowTime);
        
        const nextNum = settings.nextTrackingNumber || 1;
        setSequenceNumber(nextNum);
        setTrackingNumber(
          formatTrackingNumber(nextNum, settings.trackingCodeDigits, settings.trackingPrefix, settings.trackingSuffix)
        );
        setIsManualTracking(false);

        setSenderName('');
        setSenderCin('');
        setSenderPhone('');
        setSenderAddress('');

        setRecipientName('');
        setDestinationCity(settings.defaultAgencies?.[0] || 'Paris');
        setRecipientPhone('');
        setRecipientAddress('');
        const agentInitialDeparture = currentAgent?.name === 'Sofiane' 
          ? 'Casablanca' 
          : (currentAgent?.agencyCity || settings.defaultDepartureCity || 'Agadir');
        setDepartureCity(agentInitialDeparture);

        setItems([
          {
            id: `item-${Date.now()}-1`,
            nature: 'Valise',
            weightKg: 20,
            quantity: 1,
            price: 200,
            notes: ''
          }
        ]);
        setCustomTotalPrice('200');
        setIsPriceManual(false);
        setCustomTotalWeight('20');
        setIsWeightManual(false);
        setPaymentStatus('PAYE');
        setAdvanceAmount('');
        setPaymentMethod('PAYE');
        setStatus('EN_ATTENTE');
        setNotes('');
        setAgentName(currentAgent?.name ? `${currentAgent.name} (${currentAgent.agencyCity})` : 'Agent Loyalis Trans');
        setBonReelPhoto(null);
        setCasePhotos([]);

        setIsExternalTransport(false);
        setExternalCarrierName('');
        setExternalCarrierPhone('');
        setExternalCarrierVoucherRef('');
        setExternalCost('');
        setExternalPaymentStatus('PAID');
        setExternalNotes('');
      }
      setErrorMsg('');
    }

    prevIsOpenRef.current = isOpen;
    prevVoucherIdRef.current = initialVoucher?.id;
  }, [isOpen, initialVoucher]);

  // Automatic Computations:
  // 1. Total parcels count (sum of quantities entered by user)
  const calculatedTotalColis = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [items]);

  // 2. Total weight in kg (sum of total weights entered by user)
  const calculatedTotalWeightKg = useMemo(() => {
    const total = items.reduce((sum, item) => {
      const w = Number(item.weightKg) || 0;
      return sum + w;
    }, 0);
    return Math.round(total * 100) / 100;
  }, [items]);

  // 3. Sum of item line prices (Montants totaux des natures de colis)
  const calculatedItemsPrice = useMemo(() => {
    const sum = items.reduce((total, item) => {
      const p = item.price !== undefined ? Number(item.price) : (Number(item.unitPrice) || 0);
      return total + (isNaN(p) ? 0 : p);
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [items]);

  // When calculatedItemsPrice updates and user hasn't manually edited the total price
  useEffect(() => {
    if (!isPriceManual && !initialVoucher) {
      setCustomTotalPrice(String(calculatedItemsPrice));
    }
  }, [calculatedItemsPrice, isPriceManual, initialVoucher]);

  // When calculatedTotalWeightKg updates and user hasn't manually edited the total weight
  useEffect(() => {
    if (!isWeightManual && !initialVoucher) {
      setCustomTotalWeight(String(calculatedTotalWeightKg));
    }
  }, [calculatedTotalWeightKg, isWeightManual, initialVoucher]);

  // Final Price resolution (Allows user to directly enter any amount / discount)
  const finalPrice = useMemo(() => {
    if (customTotalPrice !== '' && !isNaN(Number(customTotalPrice))) {
      return Number(customTotalPrice);
    }
    return calculatedItemsPrice;
  }, [customTotalPrice, calculatedItemsPrice]);

  // Final Total Weight resolution (Allows user to directly enter total weight of all baggages)
  const finalTotalWeightKg = useMemo(() => {
    if (customTotalWeight !== '' && !isNaN(Number(customTotalWeight))) {
      return Math.round(Number(customTotalWeight) * 100) / 100;
    }
    return calculatedTotalWeightKg;
  }, [customTotalWeight, calculatedTotalWeightKg]);

  // Discount calculation
  const calculatedDiscount = useMemo(() => {
    if (calculatedItemsPrice > 0 && finalPrice < calculatedItemsPrice) {
      return Math.round((calculatedItemsPrice - finalPrice) * 100) / 100;
    }
    return 0;
  }, [calculatedItemsPrice, finalPrice]);

  // Remaining payment calculation
  const numericAdvance = useMemo(() => {
    if (paymentStatus === 'PAYE') return finalPrice;
    if (paymentStatus === 'NON_PAYE') return 0;
    return Math.max(0, Number(advanceAmount) || 0);
  }, [paymentStatus, finalPrice, advanceAmount]);

  const remainingToPay = useMemo(() => {
    if (paymentStatus === 'PAYE') return 0;
    if (paymentStatus === 'NON_PAYE') return finalPrice;
    return Math.max(0, Math.round((finalPrice - numericAdvance) * 100) / 100);
  }, [paymentStatus, finalPrice, numericAdvance]);

  // External Subcontracting Calculations (Coût Transporteur Tiers & Marge Nette)
  const numericExternalCost = useMemo(() => {
    if (!isExternalTransport) return 0;
    const num = Number(externalCost);
    return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
  }, [isExternalTransport, externalCost]);

  const calculatedNetProfit = useMemo(() => {
    return Math.round((finalPrice - numericExternalCost) * 100) / 100;
  }, [finalPrice, numericExternalCost]);

  const profitMarginPercent = useMemo(() => {
    if (finalPrice <= 0) return 0;
    return Math.round((calculatedNetProfit / finalPrice) * 100);
  }, [finalPrice, calculatedNetProfit]);

  // Item Management Handlers
  const handleAddItem = (presetNature?: string) => {
    const newItem: LuggageItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      nature: presetNature || 'Colis',
      weightKg: 0,
      quantity: 1,
      price: 0,
      notes: ''
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof LuggageItem, value: any) => {
    setItems(items.map(it => {
      if (it.id === id) {
        return { ...it, [field]: value };
      }
      return it;
    }));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      // Keep at least one row, just reset it
      setItems([{
        id: `item-${Date.now()}`,
        nature: 'Colis',
        weightKg: 0,
        quantity: 1,
        price: 0,
        notes: ''
      }]);
      return;
    }
    setItems(items.filter(it => it.id !== id));
  };

  // Form Submit Handler
  // --- Photo handling functions ---
  const handleBonReelSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      setErrorMsg('');
      const processed = await processVoucherPhoto(file, 'BON_REEL', trackingNumber);
      setBonReelPhoto(processed);
    } catch (err: any) {
      console.error('Error processing bon reel photo:', err);
      setErrorMsg(err.message || 'Erreur lors du traitement de la photo');
    } finally {
      setIsProcessingPhoto(false);
      // Reset input value so user can re-select same file if desired
      if (e.target) e.target.value = '';
    }
  };

  const handleCaseFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsProcessingPhoto(true);
      setErrorMsg('');
      const newPhotos: VoucherPhoto[] = [];
      const currentCount = casePhotos.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processVoucherPhoto(
          file, 
          'PARCEL_CASE', 
          trackingNumber, 
          currentCount + i + 1
        );
        newPhotos.push(processed);
      }

      setCasePhotos(prev => [...prev, ...newPhotos]);
    } catch (err: any) {
      console.error('Error processing case photos:', err);
      setErrorMsg(err.message || 'Erreur lors du traitement des photos de cas');
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveBonReel = () => {
    setBonReelPhoto(null);
  };

  const handleRemoveCasePhoto = (id: string) => {
    setCasePhotos(prev => {
      const remaining = prev.filter(p => p.id !== id);
      // Re-index names automatically with trackingNumber
      return remaining.map((p, idx) => ({
        ...p,
        name: generatePhotoFilename('PARCEL_CASE', trackingNumber, idx + 1)
      }));
    });
  };

  const handleUpdateCaseCaption = (id: string, caption: string) => {
    setCasePhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  // Sync photo names if trackingNumber is manually or automatically updated
  useEffect(() => {
    if (bonReelPhoto) {
      const expectedName = generatePhotoFilename('BON_REEL', trackingNumber);
      if (bonReelPhoto.name !== expectedName) {
        setBonReelPhoto(prev => prev ? { ...prev, name: expectedName } : null);
      }
    }

    if (casePhotos.length > 0) {
      setCasePhotos(prev =>
        prev.map((p, idx) => ({
          ...p,
          name: generatePhotoFilename('PARCEL_CASE', trackingNumber, idx + 1)
        }))
      );
    }
  }, [trackingNumber]);

  const handleFormSubmit = async (e?: React.FormEvent, actionAfterSave?: 'print' | 'share') => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // Validation
    if (!senderName.trim()) {
      setErrorMsg('Veuillez renseigner le nom de l\'expéditeur');
      return;
    }
    if (!senderPhone.trim()) {
      setErrorMsg('Veuillez renseigner le téléphone de l\'expéditeur');
      return;
    }
    if (!recipientName.trim()) {
      setErrorMsg('Veuillez renseigner le nom du destinataire');
      return;
    }
    if (!destinationCity.trim()) {
      setErrorMsg('Veuillez renseigner la destination');
      return;
    }
    if (!recipientPhone.trim()) {
      setErrorMsg('Veuillez renseigner le téléphone du destinataire');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Veuillez ajouter au moins un colis/bagage');
      return;
    }

    if (paymentStatus === 'AVANCE') {
      const adv = Number(advanceAmount);
      if (isNaN(adv) || adv <= 0) {
        setErrorMsg('Veuillez mentionner le montant de l\'avance reçue (ex: 50 DH)');
        return;
      }
      if (adv > finalPrice) {
        setErrorMsg(`Le montant de l'avance (${adv} ${currency}) ne peut pas dépasser le montant total (${finalPrice} ${currency})`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const voucherPayload: Partial<Voucher> = {
        date,
        time,
        trackingNumber: trackingNumber.trim(),
        sequenceNumber,
        departureCity: departureCity.trim() || settings.defaultDepartureCity || 'Casablanca',
        destinationCity: destinationCity.trim(),
        sender: {
          name: senderName.trim(),
          cin: senderCin.trim(),
          phone: senderPhone.trim(),
          address: senderAddress.trim()
        },
        recipient: {
          name: recipientName.trim(),
          destination: destinationCity.trim(),
          phone: recipientPhone.trim(),
          address: recipientAddress.trim()
        },
        items: items.map(it => {
          const qty = Number(it.quantity) || 1;
          const totalW = Number(it.weightKg) || 0;
          const itemP = it.price !== undefined ? Number(it.price) : (Number(it.unitPrice) || 0);
          return {
            ...it,
            nature: it.nature.trim() || 'Colis',
            quantity: qty,
            weightKg: totalW,
            price: itemP,
            unitPrice: qty > 0 ? Math.round((itemP / qty) * 100) / 100 : itemP,
            notes: (it.notes || '').trim()
          };
        }),
        totalColis: calculatedTotalColis,
        totalWeightKg: finalTotalWeightKg,
        totalPrice: finalPrice,
        paymentStatus,
        advanceAmount: numericAdvance,
        remainingAmount: remainingToPay,
        paymentMethod: paymentStatus,
        status,
        notes: notes.trim(),
        agentName: agentName.trim(),
        createdByAgent: initialVoucher?.createdByAgent || currentAgent?.name || 'Sofiane',
        isValidated: initialVoucher?.isValidated !== undefined 
          ? initialVoucher.isValidated 
          : (currentAgent?.name === 'Amine'),
        validatedBy: initialVoucher?.validatedBy || (currentAgent?.name === 'Amine' ? 'Amine' : undefined),
        validatedByAgent: initialVoucher?.validatedByAgent || (currentAgent?.name === 'Amine' ? 'Amine' : undefined),
        validatedAt: initialVoucher?.validatedAt || (currentAgent?.name === 'Amine' ? new Date().toISOString() : undefined),
        validationNotes: initialVoucher?.validationNotes || '',
        bonReelPhoto,
        casePhotos,
        isExternalTransport,
        externalCarrierName: isExternalTransport ? externalCarrierName.trim() : '',
        externalCarrierPhone: isExternalTransport ? externalCarrierPhone.trim() : '',
        externalCarrierVoucherRef: isExternalTransport ? externalCarrierVoucherRef.trim() : '',
        externalCost: isExternalTransport ? numericExternalCost : 0,
        externalPaymentStatus: isExternalTransport ? externalPaymentStatus : 'PAID',
        externalNotes: isExternalTransport ? externalNotes.trim() : '',
      };

      await onSubmit(voucherPayload, actionAfterSave);
      onClose();
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMsg(err.message || 'Erreur lors de l\'enregistrement du bon');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex items-center justify-between text-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-md shadow-orange-600/30 font-black text-lg">
              LT
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>{isEditing ? 'Modifier le Bon de Bagages' : 'Nouveau Bon de Bagages'}</span>
                <span className="font-mono text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded text-sm border border-orange-800">
                  N° {trackingNumber || '0000000'}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Société Loyalis Trans • Bordereau d'expédition & Transport
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable Form */}
        <form onSubmit={e => handleFormSubmit(e)} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Top Tracking & Date Bar */}
          <div className="bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Tracking Code with manual edit toggle */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-orange-950 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-orange-600" />
                  N° de Suivi du Bon
                </label>
                <button
                  type="button"
                  onClick={() => setIsManualTracking(!isManualTracking)}
                  className="text-[11px] text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1"
                  title="Modifier manuellement le numéro de suivi si besoin"
                >
                  {isManualTracking ? <Unlock className="w-3 h-3 text-orange-600" /> : <Lock className="w-3 h-3" />}
                  <span>{isManualTracking ? 'Manuel' : 'Automatique'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  disabled={!isManualTracking}
                  className={`w-full px-3 py-2 text-base font-mono font-bold rounded-lg border transition-all ${
                    isManualTracking
                      ? 'bg-white dark:bg-slate-800 border-orange-500 text-orange-700 dark:text-orange-400 ring-2 ring-orange-500/20'
                      : 'bg-orange-100/60 dark:bg-slate-800/80 border-orange-300 dark:border-orange-900 text-orange-900 dark:text-orange-300 cursor-not-allowed'
                  }`}
                  placeholder="Ex: 0000001"
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                Format standard à {settings.trackingCodeDigits} chiffres (modifiable dans Paramètres)
              </span>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date d'expédition
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium"
              />
            </div>

            {/* Ville Départ */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Agence / Ville de Départ
              </label>
              <input
                type="text"
                value={departureCity}
                onChange={e => setDepartureCity(e.target.value)}
                placeholder="Ex: Casablanca"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* Section 2: Expéditeur & Destinataire (2-Column Responsive Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* EXPÉDITEUR (Sender) */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4.5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  Expéditeur (Client Départ)
                </h3>
              </div>

              {/* Sender Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nom & Prénom <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Ex: Mohammed El Amrani"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Sender CIN & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    N° CIN / Passeport
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={senderCin}
                      onChange={e => setSenderCin(e.target.value.toUpperCase())}
                      placeholder="Ex: AB123456"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 uppercase font-mono font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Téléphone <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={senderPhone}
                      onChange={e => setSenderPhone(e.target.value)}
                      placeholder="Ex: 0661234567"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Sender Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Adresse Expéditeur
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={senderAddress}
                    onChange={e => setSenderAddress(e.target.value)}
                    placeholder="Ex: 25 Rue Mohamed V, Casablanca"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* DESTINATAIRE (Recipient) */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4.5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  Destinataire (Arrivée)
                </h3>

                {/* Bouton Destinataire est le même que l'expéditeur (Auto-envoi) */}
                <button
                  type="button"
                  id="btn-same-as-sender"
                  onClick={() => {
                    setRecipientName(senderName);
                    setRecipientPhone(senderPhone);
                    if (senderAddress) setRecipientAddress(senderAddress);
                    setCopiedFromSenderToast(true);
                    setTimeout(() => setCopiedFromSenderToast(false), 3000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/70 dark:hover:bg-orange-900/80 text-orange-800 dark:text-orange-200 font-bold text-xs transition-all flex items-center gap-1.5 border border-orange-300 dark:border-orange-800 shadow-2xs cursor-pointer active:scale-95"
                  title="Copier les coordonnées de l'expéditeur vers le destinataire"
                >
                  <Copy className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span>{copiedFromSenderToast ? '✓ Données Expéditeur Copiées !' : "Même que l'expéditeur (Lui-même)"}</span>
                </button>
              </div>

              {/* Recipient Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nom & Prénom Destinataire <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="Ex: Karim Bennani"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Destination & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Destination (Ville / Agence) <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      list="agencies-list"
                      value={destinationCity}
                      onChange={e => setDestinationCity(e.target.value)}
                      placeholder="Ex: Paris, Bruxelles..."
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                    <datalist id="agencies-list">
                      {settings.defaultAgencies?.map(ag => (
                        <option key={ag} value={ag} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Téléphone Destinataire <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={e => setRecipientPhone(e.target.value)}
                      placeholder="Ex: +33 6 12 34 56 78"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Recipient Detailed Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Adresse de livraison / Remise
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={e => setRecipientAddress(e.target.value)}
                    placeholder="Ex: Agence Gare ou Adresse à domicile"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Infos de Bagages & Colis (Dynamic item list with totals & custom pricing) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  Détail des Bagages & Colis
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remplissez chaque nature de colis (nature, quantité, poids total de la ligne et montant convenu)
                </p>
              </div>

              {/* Quick Nature Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  Ajout rapide :
                </span>
                {settings.defaultNatureOptions?.slice(0, 5).map(nature => (
                  <button
                    key={nature}
                    type="button"
                    onClick={() => handleAddItem(nature)}
                    className="px-2 py-1 text-xs rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-orange-400 hover:text-orange-600 transition-colors font-medium"
                  >
                    + {nature}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Items Table / Rows */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-1 flex items-center gap-1 text-xs font-bold text-slate-400">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-mono">
                      {index + 1}
                    </span>
                  </div>

                  {/* Nature / Description */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                      Nature du colis / Bagage
                    </label>
                    <input
                      type="text"
                      required
                      value={item.nature}
                      onChange={e => handleUpdateItem(item.id, 'nature', e.target.value)}
                      placeholder="Ex: Valise grande, Carton, Sac..."
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>

                  {/* Quantity (User fills manually) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                      Quantité
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                      placeholder="1"
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-black text-center"
                    />
                  </div>

                  {/* Total Weight for this nature line */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                      Poids Total (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.weightKg === 0 ? '' : (item.weightKg ?? '')}
                        onChange={e => handleUpdateItem(item.id, 'weightKg', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-bold"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400 pointer-events-none">kg</span>
                    </div>
                  </div>

                  {/* Total Price / Amount for this nature line */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                      Montant ({currency})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={item.price === 0 ? '' : (item.price ?? (item.unitPrice ?? ''))}
                        onChange={e => handleUpdateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 font-bold"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400 pointer-events-none">{currency}</span>
                    </div>
                  </div>

                  {/* Delete Item Button */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Supprimer ce bagage"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={() => handleAddItem()}
              className="w-full py-2.5 border-2 border-dashed border-orange-300 dark:border-orange-900/60 hover:border-orange-500 rounded-xl text-orange-600 dark:text-orange-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une autre nature de colis / bagage</span>
            </button>

            {/* TOTALS & CUSTOM PRICE BAR (Total Colis, Poids Total, Saisie libre du Prix Total & Remises) */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              
              {/* Total Colis */}
              <div className="flex items-center gap-3 bg-black/15 p-3 rounded-lg border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[11px] text-orange-100 uppercase font-bold tracking-wider block">Total Colis (Auto)</span>
                  <span className="text-2xl font-black">{calculatedTotalColis}</span>
                  <span className="text-xs text-orange-200 ml-1 font-medium">colis</span>
                </div>
              </div>

              {/* Total Weight (Auto or Direct Manual Global Input) */}
              <div className="bg-black/25 p-3 rounded-lg border border-white/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-orange-100 uppercase font-black tracking-wider flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-amber-300" />
                    Poids Total du Bon
                  </span>
                  {isWeightManual && calculatedTotalWeightKg !== finalTotalWeightKg && (
                    <span className="text-[10px] bg-sky-500 text-white font-bold px-1.5 py-0.5 rounded shadow-sm">
                      Saisie globale
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={customTotalWeight}
                      onChange={e => {
                        setCustomTotalWeight(e.target.value);
                        setIsWeightManual(true);
                      }}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white text-slate-900 font-black rounded-lg text-xl focus:ring-2 focus:ring-white focus:outline-none shadow-inner"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-black text-slate-500 pointer-events-none">
                      kg
                    </span>
                  </div>

                  {isWeightManual && calculatedTotalWeightKg !== finalTotalWeightKg && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTotalWeight(String(calculatedTotalWeightKg));
                        setIsWeightManual(false);
                      }}
                      className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1.5 rounded-lg font-bold transition-all shrink-0"
                      title="Réaligner sur la somme des lignes de colis"
                    >
                      Somme ({calculatedTotalWeightKg} kg)
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-orange-100 block">
                  {isWeightManual
                    ? `Poids global saisi (Somme des lignes : ${calculatedTotalWeightKg} kg)`
                    : `Saisissez directement le poids total de tous les bagages`}
                </span>
              </div>

              {/* Free Manual Final Price & Discount */}
              <div className="bg-black/25 p-3 rounded-lg border border-white/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-orange-100 uppercase font-black tracking-wider flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-300" />
                    Prix Total du Bon
                  </span>
                  {calculatedDiscount > 0 && (
                    <span className="text-[10px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded shadow-sm">
                      Remise -{calculatedDiscount} {currency}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={customTotalPrice}
                      onChange={e => {
                        setCustomTotalPrice(e.target.value);
                        setIsPriceManual(true);
                      }}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white text-slate-900 font-black rounded-lg text-xl focus:ring-2 focus:ring-white focus:outline-none shadow-inner"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-black text-slate-500 pointer-events-none">
                      {currency}
                    </span>
                  </div>
                  
                  {isPriceManual && calculatedItemsPrice !== finalPrice && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTotalPrice(String(calculatedItemsPrice));
                        setIsPriceManual(false);
                      }}
                      className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1.5 rounded-lg font-bold transition-all shrink-0"
                      title="Réaligner sur la somme des lignes de colis"
                    >
                      Somme ({calculatedItemsPrice})
                    </button>
                  )}
                </div>
                
                <span className="text-[10px] text-orange-100 block">
                  {isPriceManual 
                    ? `Prix personnalisé saisi (Somme des lignes : ${calculatedItemsPrice} ${currency})` 
                    : `Saisissez librement votre prix final (avec ou sans remise)`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Paiement & Règlement (Non payé, Payé, Avance) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Règlement / Statut du Paiement</span>
                <span className="text-[11px] font-semibold text-slate-500 normal-case">
                  Sélectionnez l'état de paiement du bagage
                </span>
              </label>

              {/* 3 Main Payment Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. PAYÉ */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PAYE');
                    setAdvanceAmount('');
                    setPaymentMethod('PAYE');
                  }}
                  className={`p-3.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all ${
                    paymentStatus === 'PAYE'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className={`w-4 h-4 ${paymentStatus === 'PAYE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      Payé
                    </span>
                    {paymentStatus === 'PAYE' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-sm font-bold">Totalité réglée</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatCurrency(finalPrice, currency)} payé au départ
                  </div>
                </button>

                {/* 2. NON PAYÉ */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('NON_PAYE');
                    setAdvanceAmount('');
                    setPaymentMethod('NON_PAYE');
                  }}
                  className={`p-3.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all ${
                    paymentStatus === 'NON_PAYE'
                      ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-sm ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className={`w-4 h-4 ${paymentStatus === 'NON_PAYE' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                      Non payé
                    </span>
                    {paymentStatus === 'NON_PAYE' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-sm font-bold">À la livraison</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatCurrency(finalPrice, currency)} à encaisser à destination
                  </div>
                </button>

                {/* 3. AVANCE */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('AVANCE');
                    setPaymentMethod('AVANCE');
                    if (!advanceAmount || Number(advanceAmount) === 0) {
                      // Default 50%
                      setAdvanceAmount(String(Math.round(finalPrice / 2)));
                    }
                  }}
                  className={`p-3.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all ${
                    paymentStatus === 'AVANCE'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Banknote className={`w-4 h-4 ${paymentStatus === 'AVANCE' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                      Avance
                    </span>
                    {paymentStatus === 'AVANCE' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-sm font-bold">Acompte partiel</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Avance au départ + reste à l'arrivée
                  </div>
                </button>
              </div>

              {/* Special Box for AVANCE Details */}
              {paymentStatus === 'AVANCE' && (
                <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 uppercase mb-1">
                        Montant de l'avance reçue ({currency}) <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={finalPrice}
                          step="1"
                          value={advanceAmount}
                          onChange={e => setAdvanceAmount(e.target.value)}
                          placeholder="Ex: 50"
                          className="w-full pl-3 pr-12 py-2 bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 rounded-lg text-lg font-black text-amber-950 dark:text-amber-100 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                          {currency}
                        </span>
                      </div>
                    </div>

                    {/* Quick percentage buttons */}
                    <div className="w-full sm:w-auto">
                      <span className="block text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-1">
                        Raccourcis rapides
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAdvanceAmount(String(Math.round(finalPrice * 0.25)))}
                          className="px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 rounded-md border border-amber-300 dark:border-amber-700"
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvanceAmount(String(Math.round(finalPrice * 0.5)))}
                          className="px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 rounded-md border border-amber-300 dark:border-amber-700"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvanceAmount(String(Math.round(finalPrice * 0.75)))}
                          className="px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 rounded-md border border-amber-300 dark:border-amber-700"
                        >
                          75%
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Breakdown of Avance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-amber-200/80 dark:border-amber-800/60 text-xs">
                    <div className="p-2 bg-white/80 dark:bg-slate-900/60 rounded-lg">
                      <span className="text-slate-500 dark:text-slate-400 block">Total du bon</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(finalPrice, currency)}</span>
                    </div>
                    <div className="p-2 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-700 dark:text-emerald-300 block font-semibold">Avance versée</span>
                      <span className="font-black text-emerald-800 dark:text-emerald-200 text-sm">
                        {formatCurrency(numericAdvance, currency)}
                      </span>
                    </div>
                    <div className="p-2 bg-rose-100/60 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
                      <span className="text-rose-700 dark:text-rose-300 block font-semibold">Reste à payer à l'arrivée</span>
                      <span className="font-black text-rose-800 dark:text-rose-200 text-sm">
                        {formatCurrency(remainingToPay, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-row: Statut du colis & Agent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Statut du Colis / Acheminement
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as VoucherStatus)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="EN_ATTENTE">En attente (Départ)</option>
                  <option value="EN_TRANSIT">En transit (En route)</option>
                  <option value="ARRIVE_AGENCE">Arrivé en Agence</option>
                  <option value="LIVRE">Livré / Retiré</option>
                  <option value="ANNULE">Annulé</option>
                </select>
              </div>

              {/* Agent Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Agent / Guichetier
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="Ex: Responsable Agence"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Sous-traitance & Transporteur Externe (Quand notre transport ne voyage pas) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isExternalTransport 
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/70 shadow-sm' 
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  isExternalTransport 
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <span>Sous-Traitance / Transporteur Externe</span>
                    {isExternalTransport && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white animate-pulse">
                        Activé
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cochez si notre transport ne voyage pas et que les bagages sont confiés à un autre transporteur (suivi des dépenses & marge nette).
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isExternalTransport}
                  onChange={e => setIsExternalTransport(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {isExternalTransport && (
              <div className="mt-4 space-y-4 animate-fadeIn">
                {/* Partner quick presets */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Sélection rapide du transporteur partenaire :
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Trans Ghazala', 'CTM Messagerie', 'Voiture Express', 'Car Nord', 'Partenaire Transit', 'Autre Transporteur'].map(partner => (
                      <button
                        key={partner}
                        type="button"
                        onClick={() => setExternalCarrierName(partner)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          externalCarrierName === partner
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {partner}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Carrier info row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Nom Transporteur Tiers *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={externalCarrierName}
                        onChange={e => setExternalCarrierName(e.target.value)}
                        placeholder="Ex: Trans Ghazala"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Tél Transporteur Tiers
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={externalCarrierPhone}
                        onChange={e => setExternalCarrierPhone(e.target.value)}
                        placeholder="Ex: 0522..."
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      N° Bon / Reçu Externe
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={externalCarrierVoucherRef}
                        onChange={e => setExternalCarrierVoucherRef(e.target.value)}
                        placeholder="Ex: GHZ-8941"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Cost & Settlement Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-amber-200 dark:border-amber-800/80">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                      Montant payé / dû au transporteur tiers ({currency}) *
                    </label>
                    <div className="relative">
                      <Coins className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={externalCost}
                        onChange={e => setExternalCost(e.target.value)}
                        placeholder="Ex: 150"
                        className="w-full pl-9 pr-12 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-black text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                        {currency}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      La dépense réelle que vous donnez au transporteur.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Statut du Règlement Transporteur
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setExternalPaymentStatus('PAID')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          externalPaymentStatus === 'PAID'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Réglé / Payé</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExternalPaymentStatus('UNPAID')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          externalPaymentStatus === 'UNPAID'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>À Régler (Dette)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subcontracting notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Notes & Consignes de Transfert (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={externalNotes}
                    onChange={e => setExternalNotes(e.target.value)}
                    placeholder="Ex: Colis remis au chauffeur à la gare routière de Rabat à 15h"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Live Profitability Breakdown Card */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                      <span>Calculateur de Marge Nette en Direct</span>
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
                      calculatedNetProfit > 0 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : calculatedNetProfit === 0
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      Taux de Marge : {profitMarginPercent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Prix Client</span>
                      <span className="text-sm font-black text-white">
                        {formatCurrency(finalPrice, currency)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                      <span className="text-[10px] text-amber-400 block font-semibold uppercase">Coût Externe</span>
                      <span className="text-sm font-black text-amber-400">
                        -{formatCurrency(numericExternalCost, currency)}
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border ${
                      calculatedNetProfit >= 0 
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' 
                        : 'bg-rose-950/80 border-rose-700 text-rose-300'
                    }`}>
                      <span className="text-[10px] block font-semibold uppercase">Bénéfice Net</span>
                      <span className="text-sm font-black">
                        {calculatedNetProfit >= 0 ? '+' : ''}{formatCurrency(calculatedNetProfit, currency)}
                      </span>
                    </div>
                  </div>

                  {calculatedNetProfit < 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-300 bg-rose-900/40 p-2 rounded-lg border border-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Attention : Vous payez le transporteur ({numericExternalCost} {currency}) plus cher que ce que le client vous a payé ({finalPrice} {currency}).</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Photos & Bon Réel Manuscrit (Archivage Base de Données) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            {/* Hidden File / Camera Inputs */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={bonReelCameraInputRef} 
              onChange={handleBonReelSelected} 
            />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={bonReelFileInputRef} 
              onChange={handleBonReelSelected} 
            />
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={caseCameraInputRef} 
              onChange={handleCaseFilesSelected} 
            />
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              ref={caseFileInputRef} 
              onChange={handleCaseFilesSelected} 
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Photos & Bon Réel Manuscrit (Base de Données)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Stockées en base de données avec nommage automatique #{trackingNumber}. Masquées par défaut, consultables via l'icône photo.
                  </p>
                </div>
              </div>

              {isProcessingPhoto && (
                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-lg border border-orange-200 dark:border-orange-800">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Traitement et optimisation HD...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Option A: Photo du Bon Réel / Manuscrit rédigé sur place */}
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
                      Bon Réel Manuscrit
                    </span>
                  </div>
                  {bonReelPhoto && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Joint ({formatPhotoSize(bonReelPhoto.sizeBytes)})
                    </span>
                  )}
                </div>

                {bonReelPhoto ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
                    <img 
                      src={bonReelPhoto.dataUrl} 
                      alt={bonReelPhoto.name} 
                      className="w-full h-40 object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded border border-white/20 font-bold">
                          {bonReelPhoto.name}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveBonReel}
                          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow transition-colors"
                          title="Supprimer la photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-300">
                          {formatPhotoSize(bonReelPhoto.sizeBytes)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewPhotoTarget(bonReelPhoto);
                              setPhotoPreviewModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Voir HD</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => bonReelCameraInputRef.current?.click()}
                            className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Remplacer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Photo du bon papier rempli sur place
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Nommé auto : <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">{generatePhotoFilename('BON_REEL', trackingNumber)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => bonReelCameraInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Prendre Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => bonReelFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Galerie / Fichier</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Option B: Photos des Cas / Colis / Marchandises */}
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
                      Photos des Colis & Cas Particuliers
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    casePhotos.length > 0
                      ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {casePhotos.length} photo(s)
                  </span>
                </div>

                {casePhotos.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {casePhotos.map((photo, idx) => (
                        <div 
                          key={photo.id} 
                          className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 p-1.5 flex gap-2 items-center"
                        >
                          <img 
                            src={photo.dataUrl} 
                            alt={photo.name} 
                            className="w-14 h-14 rounded object-cover cursor-pointer shrink-0" 
                            onClick={() => {
                              setPreviewPhotoTarget(photo);
                              setPhotoPreviewModalOpen(true);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] text-orange-400 font-bold truncate block">
                                {photo.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCasePhoto(photo.id)}
                                className="text-rose-500 hover:text-rose-400 p-0.5 shrink-0"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={photo.caption || ''}
                              onChange={e => handleUpdateCaseCaption(photo.id, e.target.value)}
                              placeholder="Note / Description du cas..."
                              className="mt-1 w-full text-[10px] px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add more button */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => caseCameraInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Prendre Autre Cas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => caseFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Ajouter Fichiers</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Photos des colis, emballages ou litiges
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Nommé auto : <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">{generatePhotoFilename('PARCEL_CASE', trackingNumber, 1)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => caseCameraInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Prendre Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => caseFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Galerie / Multi-fichiers</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Notes & Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Observations particulières / Fragilité / Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Colis fragile, garder au sec, remettre contre présentation de la CIN originale..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </form>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
          >
            Annuler
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Save & Print directly */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFormSubmit(undefined, 'print')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-sm flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>Enregistrer & Imprimer</span>
            </button>

            {/* Save & Share */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFormSubmit(undefined, 'share')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Enregistrer & Partager</span>
            </button>

            {/* Save Primary */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFormSubmit()}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/30 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer le Bon'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submodal for Photo Inspection during Form Filling */}
      {photoPreviewModalOpen && (
        <VoucherPhotoViewerModal
          isOpen={photoPreviewModalOpen}
          onClose={() => {
            setPhotoPreviewModalOpen(false);
            setPreviewPhotoTarget(null);
          }}
          voucher={{
            id: 'temp-preview',
            trackingNumber: trackingNumber || '0000000',
            sequenceNumber,
            date,
            createdAt: new Date().toISOString(),
            sender: { name: senderName || 'Expéditeur', cin: senderCin, phone: senderPhone, address: senderAddress },
            recipient: { name: recipientName || 'Destinataire', destination: destinationCity, phone: recipientPhone, address: recipientAddress },
            departureCity,
            destinationCity,
            items,
            totalColis: calculatedTotalColis,
            totalWeightKg: finalTotalWeightKg,
            totalPrice: finalPrice,
            paymentStatus,
            status,
            bonReelPhoto,
            casePhotos
          }}
          initialTab={previewPhotoTarget?.type || 'BON_REEL'}
        />
      )}
    </div>
  );
};
