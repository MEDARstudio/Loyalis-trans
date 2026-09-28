import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Edit3, 
  Trash2, 
  User, 
  MapPin, 
  Phone, 
  CreditCard, 
  Calendar, 
  Clock, 
  Hash, 
  Package, 
  Scale, 
  Coins, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink,
  MessageSquare,
  DollarSign,
  Tag,
  ArrowRight,
  ShieldCheck,
  FileText,
  ScanLine,
  Camera,
  Eye,
  Image as ImageIcon,
  Lock,
  CloudUpload,
  GraduationCap,
  History
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStatus, AgentProfile } from '../types';
import { formatCurrency, formatDate, formatDateTime, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';
import { generateVoucherQRDataUrl } from '../utils/qrGenerator';
import { formatPhotoSize } from '../utils/imageCompressor';
import { VoucherPhotoViewerModal } from './VoucherPhotoViewerModal';
import { ConfirmModal } from './ConfirmModal';

interface VoucherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: Voucher | null;
  settings: CompanySettings;
  onOpenEdit: (voucher: Voucher) => void;
  onOpenPrint: (voucher: Voucher) => void;
  onOpenShare: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  onUpdateStatus: (id: string, status: VoucherStatus) => void;
  onUpdatePayment: (id: string, paymentStatus: 'PAYE' | 'NON_PAYE' | 'AVANCE', advanceAmount?: number) => void;
  currentAgent?: AgentProfile;
  onOpenValidation?: (voucher: Voucher) => void;
  onDirectValidate?: (voucherId: string) => void;
}

export const VoucherDetailModal: React.FC<VoucherDetailModalProps> = ({
  isOpen,
  onClose,
  voucher,
  settings,
  onOpenEdit,
  onOpenPrint,
  onOpenShare,
  onDeleteVoucher,
  onUpdateStatus,
  onUpdatePayment,
  currentAgent,
  onOpenValidation,
  onDirectValidate
}) => {
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showPaymentQuickMenu, setShowPaymentQuickMenu] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [restrictionMsg, setRestrictionMsg] = useState<string | null>(null);
  const [isAdvanceInputOpen, setIsAdvanceInputOpen] = useState<boolean>(false);
  const [advanceInputVal, setAdvanceInputVal] = useState<string>('');

  // Photo viewer state
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState<boolean>(false);
  const [photoViewerTab, setPhotoViewerTab] = useState<'BON_REEL' | 'PARCEL_CASE'>('BON_REEL');
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number>(0);

  useEffect(() => {
    if (voucher) {
      generateVoucherQRDataUrl(voucher, { size: 360 }).then(setQrCodeUrl);
    }
  }, [voucher]);

  if (!isOpen || !voucher) return null;

  const totalPhotosCount = (voucher.bonReelPhoto ? 1 : 0) + (voucher.casePhotos ? voucher.casePhotos.length : 0);
  const isCreatedByAdmin = String(voucher.createdByAgent || voucher.agentName || '').toLowerCase().includes('amine');
  const isActuallyValidated = Boolean(voucher.isValidated) || isCreatedByAdmin;

  const currency = settings.currency || 'DH';
  const statusInfo = getStatusBadge(voucher.status);
  const paymentInfo = getPaymentStatusInfo(
    voucher.paymentStatus || voucher.paymentMethod,
    voucher.advanceAmount || 0,
    voucher.totalPrice,
    voucher.remainingAmount
  );

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(voucher.trackingNumber);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleWhatsAppSender = () => {
    const phone = (voucher.sender?.phone || '').replace(/\D/g, '');
    if (!phone) return;
    const msg = encodeURIComponent(
      `Bonjour ${voucher.sender?.name || ''}, Loyalis Trans confirme l'enregistrement de votre bon de bagages N° ${voucher.trackingNumber} à destination de ${voucher.recipient?.destination || voucher.destinationCity || ''}. Statut: ${statusInfo.label}. Reste à payer: ${formatCurrency(paymentInfo.remaining, currency)}.`
    );
    try {
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  const handleWhatsAppRecipient = () => {
    const phone = (voucher.recipient?.phone || '').replace(/\D/g, '');
    if (!phone) return;
    const msg = encodeURIComponent(
      `Bonjour ${voucher.recipient?.name || ''}, vous avez un envoi de bagages/colis enregistré par ${voucher.sender?.name || ''} chez Loyalis Trans (N° Suivi: ${voucher.trackingNumber}). Destination: ${voucher.recipient?.destination || voucher.destinationCity || ''}. Montant à régler à réception: ${formatCurrency(paymentInfo.remaining, currency)}.`
    );
    try {
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[96vh] sm:max-h-[92vh] flex flex-col">
        
        {/* Top Sticky Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-base sm:text-xl font-black uppercase tracking-tight truncate">
                Bon #{voucher.trackingNumber}
              </h2>
              <button
                type="button"
                onClick={handleCopyTracking}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 transition-colors shrink-0"
                title="Copier le N° de suivi"
              >
                {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate mt-0.5">
              {formatDate(voucher.date)} {voucher.time && `à ${voucher.time}`} • Loyalis Trans
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar (Top Shortcuts) */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Status & Payment Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shipment Status */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
              {statusInfo.label}
            </span>

            {/* Offline Pending Badge */}
            {voucher.isOfflinePending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <CloudUpload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                <span>En attente de synchro</span>
              </span>
            )}

            {/* Payment Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${paymentInfo.badgeBg} ${paymentInfo.badgeText} ${paymentInfo.badgeBorder}`}>
              {paymentInfo.type === 'PAYE' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {paymentInfo.type === 'NON_PAYE' && <Clock className="w-3.5 h-3.5 text-rose-600" />}
              {paymentInfo.type === 'AVANCE' && <DollarSign className="w-3.5 h-3.5 text-amber-600" />}
              {paymentInfo.label}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Photos Viewer Button */}
            <button
              onClick={() => {
                setPhotoViewerTab(voucher.bonReelPhoto ? 'BON_REEL' : 'PARCEL_CASE');
                setPhotoViewerIndex(0);
                setIsPhotoViewerOpen(true);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all ${
                totalPhotosCount > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
              title="Consulter les photos et le bon réel manuscrit"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photos {totalPhotosCount > 0 ? `(${totalPhotosCount})` : ''}</span>
            </button>

            {/* Validation Button if Amine and not validated */}
            {!isActuallyValidated && currentAgent?.name === 'Amine' && onOpenValidation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenValidation(voucher);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all animate-pulse"
                title="Vérifier et valider ce bon par rapport au bon manuscrit"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Auditer & Valider</span>
              </button>
            )}

            {/* Print / PDF */}
            <button
              onClick={() => onOpenPrint(voucher)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
              title="Imprimer le bon officiel ou exporter PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer Bon</span>
            </button>

            {/* WhatsApp / Share */}
            <button
              onClick={() => onOpenShare(voucher)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Envoyer directement par WhatsApp avec photos de colis et bon"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Edit */}
            <button
              onClick={() => {
                onClose();
                onOpenEdit(voucher);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Modifier toutes les informations"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>

            {/* Delete */}
            {currentAgent && !currentAgent.canDelete ? (
              <button
                type="button"
                onClick={() => {
                  setRestrictionMsg("Action restreinte : Seul l'administrateur (Amine) a le droit de supprimer des bons.");
                  setTimeout(() => setRestrictionMsg(null), 3500);
                }}
                className="p-1.5 rounded-xl text-slate-300 dark:text-slate-700 cursor-not-allowed"
                title="Suppression bloquée (Réservée à l'administrateur Amine)"
              >
                <Lock className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-detail-delete-voucher"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Supprimer ce bon"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden flex-1 text-slate-800 dark:text-slate-200">
          
          {/* Restriction Message Banner */}
          {restrictionMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{restrictionMsg}</span>
            </div>
          )}

          {/* Validation Status & Audit Card */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isActuallyValidated 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isActuallyValidated ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm">
                    {isActuallyValidated 
                      ? (isCreatedByAdmin ? 'Bon Validé d\'Office (Créé par Admin)' : 'Bon Vérifié & Validé') 
                      : 'Bon en Attente de Validation par l\'Admin'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 border border-current">
                    Créé par : {voucher.createdByAgent || voucher.agentName || 'Sofiane (Casa)'}
                  </span>
                </div>
                <p className="text-xs opacity-90 mt-0.5">
                  {isActuallyValidated 
                    ? (isCreatedByAdmin 
                        ? 'Ce bon a été créé directement par l\'administrateur (Amine), il est donc validé d\'office et ne nécessite aucune validation.'
                        : `Validé avec succès par ${voucher.validatedByAgent || voucher.validatedBy || 'Amine (Admin)'}${voucher.validatedAt ? ` le ${formatDate(voucher.validatedAt)}` : ''}. ${voucher.validationNotes ? `Note: "${voucher.validationNotes}"` : ''}`)
                    : `Ce bon a été saisi au guichet par l'agent. L'administrateur (Amine) doit vérifier les informations avec le bon réel.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              {voucher.bonReelPhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoViewerTab('BON_REEL');
                    setIsPhotoViewerOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-slate-50 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span>Photo Bon Réel</span>
                </button>
              )}

              {!isActuallyValidated && currentAgent?.name === 'Amine' && (
                <div className="flex items-center gap-1.5">
                  {onDirectValidate && (
                    <button
                      type="button"
                      onClick={() => onDirectValidate(voucher.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Valider ce bon immédiatement sans obliger l'ouverture du bon réel"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Valider Direct</span>
                    </button>
                  )}
                  {onOpenValidation && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenValidation(voucher);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Comparer avec la photo du bon réel et auditer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Auditer</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Trajet & Logistics Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 overflow-hidden">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-orange-300 block">
                  Itinéraire & Trajet
                </span>
                <div className="text-lg sm:text-2xl font-black flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 break-words">
                  <span className="break-words">{voucher.departureCity || 'Casablanca'}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 shrink-0" />
                  <span className="text-orange-400 break-words">{voucher.recipient.destination || voucher.destinationCity}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 text-xs shrink-0 flex-wrap">
              <div className="bg-white/10 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-bold">Agence</span>
                <span className="font-bold truncate max-w-[120px] block">{voucher.agencyName || settings.companyName}</span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/10">
                <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-bold">Agent</span>
                <span className="font-bold truncate max-w-[120px] block">{voucher.agentName || 'Agent Guichet'}</span>
              </div>
            </div>
          </div>

          {/* Cards Grid: Expéditeur & Destinataire */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Sender Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Expéditeur (Départ)
                  </h3>
                </div>
                {voucher.sender.phone && (
                  <button
                    onClick={handleWhatsAppSender}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    title="Envoyer message WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Nom complet</span>
                  <span className="font-black text-slate-900 dark:text-white text-base">
                    {voucher.sender.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block">Téléphone</span>
                    <a 
                      href={`tel:${voucher.sender.phone}`}
                      className="font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{voucher.sender.phone}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">N° C.I.N</span>
                    <span className="font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs inline-block">
                      {voucher.sender.cin || 'Non renseigné'}
                    </span>
                  </div>
                </div>

                {voucher.sender.address && (
                  <div>
                    <span className="text-xs text-slate-400 block">Adresse de départ</span>
                    <span className="font-medium text-xs text-slate-600 dark:text-slate-300">
                      {voucher.sender.address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recipient Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Destinataire (Arrivée)
                  </h3>
                </div>
                {voucher.recipient.phone && (
                  <button
                    onClick={handleWhatsAppRecipient}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    title="Envoyer message WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Nom du destinataire</span>
                  <span className="font-black text-slate-900 dark:text-white text-base">
                    {voucher.recipient.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block">Téléphone</span>
                    <a 
                      href={`tel:${voucher.recipient.phone}`}
                      className="font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{voucher.recipient.phone}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Destination</span>
                    <span className="font-black text-orange-600 dark:text-orange-400 uppercase text-sm inline-block">
                      {voucher.recipient.destination || voucher.destinationCity}
                    </span>
                  </div>
                </div>

                {voucher.recipient.address && (
                  <div>
                    <span className="text-xs text-slate-400 block">Adresse de livraison / retrait</span>
                    <span className="font-medium text-xs text-slate-600 dark:text-slate-300">
                      {voucher.recipient.address}
                    </span>
                  </div>
                )}

                {/* Option Étudiant Badge */}
                {(voucher.isStudent || voucher.recipient?.isStudent) && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-500/40 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase text-purple-900 dark:text-purple-200 block truncate">
                          Destinataire Étudiant 🎓
                        </span>
                        <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium block truncate">
                          Tarif & profil étudiant validé
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs shrink-0">
                      Option Étudiant
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Section: Détails des Colis / Bagages */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Détail des Bagages & Colis ({voucher.items?.length || 1})
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <span>Total: <strong className="text-slate-900 dark:text-white font-black">{voucher.totalColis}</strong> colis</span>
                <span>•</span>
                <span>Poids: <strong className="text-slate-900 dark:text-white font-black">{voucher.totalWeightKg} kg</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Nature / Description du colis</th>
                    <th className="py-2.5 px-4 text-center">Quantité</th>
                    <th className="py-2.5 px-4 text-center">Poids Total (kg)</th>
                    <th className="py-2.5 px-4 text-right">Montant ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {voucher.items?.map((item, idx) => {
                    const itemAmount = item.price !== undefined 
                      ? item.price 
                      : (item.unitPrice !== undefined ? item.unitPrice * (item.quantity || 1) : 0);
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {item.nature}
                          {item.notes && <span className="block text-xs font-normal text-slate-400">{item.notes}</span>}
                        </td>
                        <td className="py-3 px-4 text-center font-black">{item.quantity}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                          {item.weightKg} kg
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                          {formatCurrency(itemAmount, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={2} className="py-3 px-4 uppercase text-xs">Total Général</td>
                    <td className="py-3 px-4 text-center font-black">{voucher.totalColis} colis</td>
                    <td className="py-3 px-4 text-center font-black font-mono">{voucher.totalWeightKg} kg</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-lg text-orange-600 dark:text-orange-400">
                      {formatCurrency(voucher.totalPrice, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section: Paiement & Règlement Détaillé */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-orange-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Règlement & Situation Financière
                </h3>
              </div>

              {/* Quick status change buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold shrink-0">Changer statut paiement :</span>
                <button
                  onClick={() => {
                    setIsAdvanceInputOpen(false);
                    onUpdatePayment(voucher.id, 'PAYE', voucher.totalPrice);
                  }}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 ${
                    paymentInfo.type === 'PAYE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 hover:bg-emerald-50 hover:border-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✓ Payé (100%)</span>
                </button>
                <button
                  onClick={() => {
                    setIsAdvanceInputOpen(false);
                    onUpdatePayment(voucher.id, 'NON_PAYE', 0);
                  }}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 ${
                    paymentInfo.type === 'NON_PAYE'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 hover:bg-rose-50 hover:border-rose-400'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>🚚 À la livraison</span>
                </button>
                <button
                  onClick={() => {
                    setAdvanceInputVal(voucher.advanceAmount ? String(voucher.advanceAmount) : '');
                    setIsAdvanceInputOpen(!isAdvanceInputOpen);
                  }}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95 ${
                    paymentInfo.type === 'AVANCE' || isAdvanceInputOpen
                      ? 'bg-blue-600 text-white border-blue-600 font-black shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 hover:bg-blue-50 hover:border-blue-400'
                  }`}
                >
                  ⏳ Avance...
                </button>
              </div>
            </div>

            {/* Inline Advance Input Form */}
            {isAdvanceInputOpen && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 rounded-xl flex flex-wrap items-center gap-2 animate-fadeIn text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-200">
                  Montant de l'avance reçue ({currency}) :
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <input
                    type="number"
                    min="0"
                    max={voucher.totalPrice}
                    step="any"
                    value={advanceInputVal}
                    onChange={e => setAdvanceInputVal(e.target.value)}
                    placeholder={`Ex: 50 (max ${voucher.totalPrice})`}
                    className="w-36 px-2.5 py-1 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const parsed = parseFloat(advanceInputVal);
                        if (!isNaN(parsed) && parsed > 0) {
                          onUpdatePayment(voucher.id, 'AVANCE', parsed);
                          setIsAdvanceInputOpen(false);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!advanceInputVal || parseFloat(advanceInputVal) <= 0}
                    onClick={() => {
                      const parsed = parseFloat(advanceInputVal);
                      if (!isNaN(parsed) && parsed > 0) {
                        onUpdatePayment(voucher.id, 'AVANCE', parsed);
                        setIsAdvanceInputOpen(false);
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    Valider l'Avance
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdvanceInputOpen(false)}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Financial 3-box Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Price */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                  Montant Total du Bon
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(voucher.totalPrice, currency)}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Calculé d'après les colis
                </span>
              </div>

              {/* Advance Paid */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider block">
                  Montant Payé / Avance
                </span>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {formatCurrency(paymentInfo.advance, currency)}
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-semibold">
                  {paymentInfo.type === 'PAYE' ? 'Réglé en totalité' : paymentInfo.type === 'AVANCE' ? `Avance de ${paymentInfo.advance} DH reçue` : 'Rien payé au départ'}
                </span>
              </div>

              {/* Remaining to pay */}
              <div className={`p-4 rounded-xl border ${
                paymentInfo.remaining > 0 
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' 
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider block ${paymentInfo.remaining > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-slate-500'}`}>
                  Reste à Encaisser à l'arrivée
                </span>
                <div className={`text-2xl font-black mt-1 ${paymentInfo.remaining > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  {formatCurrency(paymentInfo.remaining, currency)}
                </div>
                <span className={`text-[11px] mt-0.5 block font-bold ${paymentInfo.remaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                  {paymentInfo.remaining > 0 ? 'À percevoir du destinataire' : 'Soldé • Aucun reliquat'}
                </span>
              </div>
            </div>

            {/* Subcontracting & External Carrier Information if applicable */}
            {voucher.isExternalTransport && (
              <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 dark:border-amber-500/40 space-y-3 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/40 dark:border-amber-700/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      Sous-Traitance Transporteur Externe
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    voucher.externalPaymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white animate-pulse'
                  }`}>
                    {voucher.externalPaymentStatus === 'PAID' ? '✓ Règlement Transporteur Effectué' : '⏳ Règlement Transporteur en Attente'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Transporteur Partenaire</span>
                    <strong className="text-slate-900 dark:text-white font-black text-sm">
                      {voucher.externalCarrierName || 'Non spécifié'}
                    </strong>
                    {voucher.externalCarrierPhone && (
                      <a href={`tel:${voucher.externalCarrierPhone}`} className="text-amber-600 dark:text-amber-400 font-mono text-xs font-bold flex items-center gap-1 hover:underline mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{voucher.externalCarrierPhone}</span>
                      </a>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Réf / Reçu Externe</span>
                    <strong className="text-slate-900 dark:text-white font-mono font-black text-sm">
                      {voucher.externalCarrierVoucherRef || 'Aucun numéro'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Coût Payé au Transporteur</span>
                    <strong className="text-amber-600 dark:text-amber-400 font-mono font-black text-base">
                      {formatCurrency(voucher.externalCost || 0, currency)}
                    </strong>
                  </div>
                </div>

                {/* Profit Margin Summary Banner */}
                <div className="p-3 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Rentabilité Nette de l'opération :</span>
                    <span className="text-slate-200">
                      Reçu Client : <strong className="text-white font-bold">{formatCurrency(voucher.totalPrice, currency)}</strong> — Coût Externe : <strong className="text-amber-400 font-bold">{formatCurrency(voucher.externalCost || 0, currency)}</strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bénéfice Net :</span>
                    <span className={`text-base font-black ${
                      (voucher.totalPrice - (voucher.externalCost || 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {(voucher.totalPrice - (voucher.externalCost || 0)) >= 0 ? '+' : ''}
                      {formatCurrency(voucher.totalPrice - (voucher.externalCost || 0), currency)}
                    </span>
                  </div>
                </div>

                {voucher.externalNotes && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="font-bold block text-[10px] uppercase text-slate-400">Notes de transfert :</span>
                    {voucher.externalNotes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: QR Code & Suivi Express */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-slate-800/80 dark:via-slate-800 dark:to-slate-800/80 border border-orange-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2 rounded-2xl border-2 border-orange-300 dark:border-slate-600 shadow-sm shrink-0 flex flex-col items-center">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt={`QR Code ${voucher.trackingNumber}`} 
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-xl"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl" />
              )}
              <span className="text-[9px] font-mono text-orange-950 dark:text-orange-300 font-black mt-1 uppercase tracking-wider flex items-center gap-1">
                <ScanLine className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                Flash Direct
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider">
                <QrCode className="w-3 h-3" />
                <span>QR Code Officiel de Suivi</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Scannez pour ouvrir le suivi en direct sur smartphone
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Pointez la caméra d'un téléphone ou un lecteur code-barres pour afficher instantanément la fiche de suivi en direct et valider le retrait.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleCopyTracking}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTracking ? 'Copié !' : 'Copier N° Suivi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenShare(voucher)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Partager le QR Code</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Photos Archivées & Bon Réel Manuscrit */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Photos & Bon Réel Manuscrit ({totalPhotosCount})
                </h3>
              </div>

              {totalPhotosCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoViewerTab(voucher.bonReelPhoto ? 'BON_REEL' : 'PARCEL_CASE');
                    setPhotoViewerIndex(0);
                    setIsPhotoViewerOpen(true);
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ouvrir la visionneuse HD</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(voucher);
                  }}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ajouter une photo</span>
                </button>
              )}
            </div>

            {totalPhotosCount > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {/* Bon Reel Card */}
                {voucher.bonReelPhoto && (
                  <div 
                    onClick={() => {
                      setPhotoViewerTab('BON_REEL');
                      setPhotoViewerIndex(0);
                      setIsPhotoViewerOpen(true);
                    }}
                    className="group relative rounded-xl overflow-hidden border-2 border-amber-300/80 dark:border-amber-700/80 bg-slate-900 cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
                  >
                    <img 
                      src={voucher.bonReelPhoto.dataUrl} 
                      alt={voucher.bonReelPhoto.name}
                      className="w-full h-36 object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <span className="self-start text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono tracking-wider shadow">
                        Bon Réel Papier
                      </span>
                      <div>
                        <p className="font-mono text-[11px] text-white font-bold truncate">
                          {voucher.bonReelPhoto.name}
                        </p>
                        <p className="text-[10px] text-slate-300 flex items-center justify-between mt-0.5">
                          <span>{formatPhotoSize(voucher.bonReelPhoto.sizeBytes)}</span>
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> Cliquer pour zoomer
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Case Photos */}
                {voucher.casePhotos?.map((photo, idx) => (
                  <div 
                    key={photo.id || idx}
                    onClick={() => {
                      setPhotoViewerTab('PARCEL_CASE');
                      setPhotoViewerIndex(idx);
                      setIsPhotoViewerOpen(true);
                    }}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
                  >
                    <img 
                      src={photo.dataUrl} 
                      alt={photo.name}
                      className="w-full h-36 object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                      <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded bg-black/80 text-slate-200 font-mono border border-white/20">
                        Colis / Cas #{idx + 1}
                      </span>
                      <div>
                        <p className="font-mono text-[11px] text-white font-bold truncate">
                          {photo.name}
                        </p>
                        {photo.caption && (
                          <p className="text-[10px] text-amber-300 font-medium truncate mt-0.5">
                            {photo.caption}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-300 flex items-center justify-between mt-0.5">
                          <span>{formatPhotoSize(photo.sizeBytes)}</span>
                          <span className="text-orange-400 font-bold flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> Zoom HD
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50">
                <Camera className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Aucune photo attachée à ce bon
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Vous pouvez photographier le bon manuscrit papier ou les colis à tout moment en cliquant sur Modifier.
                </p>
              </div>
            )}
          </div>

          {/* Observations & Metadata */}
          {voucher.notes && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                Observations particulières
              </span>
              <p className="text-amber-950 dark:text-amber-100 font-medium">
                {voucher.notes}
              </p>
            </div>
          )}

          {/* Section: Historique & Journal des Modifications et Motifs */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-orange-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Historique Complet & Journal des Modifications ({voucher.history?.length || 1})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Traçabilité intégrale avec dates, heures et motifs
              </span>
            </div>

            {/* Timeline entries */}
            {voucher.history && voucher.history.length > 0 ? (
              <div className="space-y-3">
                {voucher.history.map((entry, idx) => (
                  <div 
                    key={entry.id || idx}
                    className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2 relative overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          entry.actionType === 'CREATION' ? 'bg-emerald-500' :
                          entry.actionType === 'PAYMENT_CHANGE' ? 'bg-amber-500' :
                          entry.actionType === 'STATUS_CHANGE' ? 'bg-blue-500' :
                          entry.actionType === 'VALIDATION' ? 'bg-purple-500' : 'bg-orange-500'
                        }`} />
                        <strong className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
                          {entry.title || 'Modification'}
                        </strong>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Par : {entry.authorName || 'Agent'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {entry.dateFormatted || (entry.timestamp ? new Date(entry.timestamp).toLocaleString('fr-FR') : 'Date')}
                        </span>
                      </div>
                    </div>

                    {/* Motif / Raison de la modification */}
                    {entry.motif && (
                      <div className="p-2.5 rounded-lg bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 text-xs">
                        <span className="font-bold text-orange-900 dark:text-orange-300 text-[10px] uppercase block">
                          Motif de la modification :
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                          « {entry.motif} »
                        </p>
                      </div>
                    )}

                    {/* Changed Fields list if any */}
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2">
                        {entry.changes.map((chg, cIdx) => (
                          <div 
                            key={cIdx} 
                            className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300"
                          >
                            <span className="font-bold text-slate-500 dark:text-slate-400">{chg.field} : </span>
                            {chg.oldValue !== undefined && (
                              <span className="line-through text-slate-400 mr-1">{String(chg.oldValue)}</span>
                            )}
                            <span className="font-black text-orange-600 dark:text-orange-400">➔ {String(chg.newValue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span>Création initiale le {formatDateTime(voucher.createdAt || voucher.date)} par {voucher.createdByAgent || voucher.agentName || 'Agent'}. Aucune modification ultérieure.</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold text-[10px]">Version Originale</span>
              </div>
            )}
          </div>

          {/* Footer Timestamp info */}
          <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Créé le : {formatDateTime(voucher.createdAt || voucher.date)}</span>
            {voucher.updatedAt && <span>Dernière modification : {formatDateTime(voucher.updatedAt)}</span>}
          </div>

        </div>

        {/* Modal Footer Bottom */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
          >
            Fermer
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenPrint(voucher)}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Bon / PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Supprimer le bon de bagages"
        message={`Êtes-vous sûr de vouloir supprimer définitivement le bon N° ${voucher.trackingNumber} ? Toutes les informations associées seront supprimées.`}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        isDestructive={true}
        onConfirm={() => {
          onDeleteVoucher(voucher.id);
          setIsDeleteConfirmOpen(false);
          onClose();
        }}
        onClose={() => setIsDeleteConfirmOpen(false)}
      />

      {/* High-Definition Photo Viewer Modal */}
      {isPhotoViewerOpen && (
        <VoucherPhotoViewerModal
          isOpen={isPhotoViewerOpen}
          onClose={() => setIsPhotoViewerOpen(false)}
          voucher={voucher}
          initialTab={photoViewerTab}
          initialPhotoIndex={photoViewerIndex}
        />
      )}
    </div>
  );
};
