import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  MessageSquare, 
  Copy, 
  Check, 
  Download, 
  Image as ImageIcon, 
  Mail, 
  PhoneCall, 
  Printer, 
  Package, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  FileText, 
  Palette, 
  ScanLine,
  Camera,
  User,
  Send,
  ExternalLink,
  Info
} from 'lucide-react';
import { CompanySettings, Voucher } from '../types';
import { generateVoucherQRDataUrl } from '../utils/qrGenerator';
import { 
  buildVoucherSummaryText, 
  copyVoucherText, 
  shareViaEmail, 
  shareViaSMS, 
  shareViaWhatsApp,
  shareDirectVoucherPack
} from '../utils/shareUtils';
import { downloadVoucherCanvasImage, copyVoucherCanvasImageToClipboard } from '../utils/voucherImageCanvasGenerator';
import { downloadVoucherNativePDF } from '../utils/voucherPdfGenerator';
import { formatCurrency, formatDate, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';

interface VoucherShareModalProps {
  voucher: Voucher;
  settings: CompanySettings;
  isOpen: boolean;
  onClose: () => void;
  onOpenPrint?: () => void;
}

export const VoucherShareModal: React.FC<VoucherShareModalProps> = ({
  voucher,
  settings,
  isOpen,
  onClose,
  onOpenPrint
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'card' | 'text'>('whatsapp');
  const [targetRecipient, setTargetRecipient] = useState<'recipient' | 'sender' | 'custom'>('recipient');
  const [customPhone, setCustomPhone] = useState<string>(voucher.recipient.phone || '');
  const [includeVoucherImage, setIncludeVoucherImage] = useState<boolean>(true);
  const [includeParcelPhotos, setIncludeParcelPhotos] = useState<boolean>(true);
  const [cardTheme, setCardTheme] = useState<'modern-ticket' | 'corporate-receipt'>('modern-ticket');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSharingPack, setIsSharingPack] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  const currency = settings.currency || 'DH';
  const previewText = buildVoucherSummaryText(voucher, settings);
  const statusInfo = getStatusBadge(voucher.status);
  const paymentInfo = getPaymentStatusInfo(
    voucher.paymentStatus || voucher.paymentMethod,
    voucher.advanceAmount || 0,
    voucher.totalPrice,
    voucher.remainingAmount
  );

  const parcelPhotos: string[] = [
    ...(voucher.casePhotos?.map(p => (typeof p === 'string' ? p : p.dataUrl)) || []),
    ...(voucher.bonReelPhoto ? [typeof voucher.bonReelPhoto === 'string' ? voucher.bonReelPhoto : voucher.bonReelPhoto.dataUrl] : [])
  ].filter(Boolean);

  useEffect(() => {
    if (isOpen) {
      // Default to recipient phone, fallback to sender
      if (voucher.recipient.phone) {
        setTargetRecipient('recipient');
        setCustomPhone(voucher.recipient.phone);
      } else if (voucher.sender.phone) {
        setTargetRecipient('sender');
        setCustomPhone(voucher.sender.phone);
      } else {
        setTargetRecipient('custom');
        setCustomPhone('');
      }
      
      generateVoucherQRDataUrl(voucher, { size: 420 }).then(setQrCodeUrl);
      setCopiedText(false);
      setCopiedImage(false);
      setIsExportingImage(false);
      setIsExportingPdf(false);
      setIsSharingPack(false);
      setExportFeedback(null);
      setPreviewPhotoModal(null);
    }
  }, [isOpen, voucher, settings]);

  const handleSelectRecipient = (type: 'recipient' | 'sender' | 'custom') => {
    setTargetRecipient(type);
    if (type === 'recipient') {
      setCustomPhone(voucher.recipient.phone || '');
    } else if (type === 'sender') {
      setCustomPhone(voucher.sender.phone || '');
    }
  };

  const handleCopyText = async () => {
    const success = await copyVoucherText(voucher, settings);
    if (success) {
      setCopiedText(true);
      setExportFeedback('Message texte copié dans le presse-papier !');
      setTimeout(() => {
        setCopiedText(false);
        setExportFeedback(null);
      }, 2500);
    }
  };

  /**
   * Copies crisp pure Canvas image directly to clipboard
   */
  const handleCopyImage = async () => {
    try {
      const success = await copyVoucherCanvasImageToClipboard(voucher, settings);
      if (success) {
        setCopiedImage(true);
        setExportFeedback('Image HD du bon copiée dans le presse-papier !');
        setTimeout(() => {
          setCopiedImage(false);
          setExportFeedback(null);
        }, 2500);
      } else {
        handleDownloadImage();
      }
    } catch {
      handleDownloadImage();
    }
  };

  /**
   * Direct WhatsApp Opening
   */
  const handleDirectWhatsApp = () => {
    shareViaWhatsApp(voucher, settings, customPhone);
  };

  /**
   * Complete direct share pack: sends WhatsApp with HD voucher file and photos if supported
   */
  const handleDirectPackShare = async () => {
    try {
      setIsSharingPack(true);
      const result = await shareDirectVoucherPack(voucher, settings, {
        targetPhone: customPhone,
        includeVoucherImage: includeVoucherImage,
        includeCasePhotos: includeParcelPhotos
      });

      if (result.method === 'web-share' && result.success) {
        setExportFeedback('Partage WhatsApp / multimédia lancé avec succès !');
        setTimeout(() => setExportFeedback(null), 3000);
      }
    } finally {
      setIsSharingPack(false);
    }
  };

  const handleSMS = () => {
    shareViaSMS(voucher, settings);
  };

  const handleEmail = () => {
    shareViaEmail(voucher, settings);
  };

  /**
   * 100% Reliable Image Download (Canvas 2D Engine)
   */
  const handleDownloadImage = async () => {
    try {
      setIsExportingImage(true);
      const success = await downloadVoucherCanvasImage(
        voucher, 
        settings, 
        `Bon_Transport_LoyalisTrans_${voucher.trackingNumber}.png`
      );
      if (success) {
        setExportFeedback('Image PNG HD du bon téléchargée !');
        setTimeout(() => setExportFeedback(null), 3000);
      } else {
        alert("Impossible de générer l'image. Veuillez télécharger le PDF.");
      }
    } finally {
      setIsExportingImage(false);
    }
  };

  /**
   * Download a single photo
   */
  const handleDownloadSinglePhoto = (photoUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `Photo_Colis_${voucher.trackingNumber}_${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Download all photos
   */
  const handleDownloadAllPhotos = () => {
    parcelPhotos.forEach((photo, idx) => {
      setTimeout(() => {
        handleDownloadSinglePhoto(photo, idx);
      }, idx * 200);
    });
    setExportFeedback(`${parcelPhotos.length} photo(s) de colis téléchargée(s) !`);
    setTimeout(() => setExportFeedback(null), 3000);
  };

  /**
   * Native Vector PDF Download
   */
  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const success = await downloadVoucherNativePDF(
        voucher, 
        settings, 
        'double-stub', 
        `Bon_Transport_LoyalisTrans_${voucher.trackingNumber}`
      );
      if (success) {
        setExportFeedback('PDF vectoriel officiel généré et téléchargé !');
        setTimeout(() => setExportFeedback(null), 3000);
      } else {
        alert("Erreur lors de la génération du PDF.");
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="voucher-share-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Top Header Bar */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-lg text-white shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Envoi WhatsApp & Partage du Bon
                </h2>
                <span className="font-mono text-orange-400 bg-orange-950/80 px-2.5 py-0.5 rounded-lg text-xs font-black border border-orange-800/60">
                  {voucher.trackingNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Envoi direct par clic avec photos de colis, bon du site et message résumé
              </p>
            </div>
          </div>

          <button
            id="btn-close-share-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-900/60 p-1 rounded-xl">
            <button
              id="tab-whatsapp-direct"
              onClick={() => setActiveTab('whatsapp')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Direct</span>
            </button>

            <button
              id="tab-hd-image"
              onClick={() => setActiveTab('card')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'card'
                  ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Aperçu Bon Image</span>
            </button>

            <button
              id="tab-text-msg"
              onClick={() => setActiveTab('text')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Texte & SMS</span>
            </button>
          </div>

          {/* Theme Switcher when in card view */}
          {activeTab === 'card' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Palette className="w-3.5 h-3.5 text-orange-500" />
              <span>Style :</span>
              <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-900 p-0.5 rounded-lg">
                <button
                  onClick={() => setCardTheme('modern-ticket')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cardTheme === 'modern-ticket'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Billet Express
                </button>
                <button
                  onClick={() => setCardTheme('corporate-receipt')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    cardTheme === 'corporate-receipt'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Reçu Facture
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Scrollable Area */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-slate-100/70 dark:bg-slate-950/50">
          
          {/* Feedback toast */}
          {exportFeedback && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {exportFeedback}
              </span>
              <button onClick={() => setExportFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 1: WHATSAPP DIRECT & MEDIAS (Primary Focus)
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              
              {/* 1. Recipient Selection Bar (1-Click) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  1. Choisir le Destinataire WhatsApp (1 Clic)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Destinataire Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectRecipient('recipient')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      targetRecipient === 'recipient'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                        🎯 Destinataire (Client)
                      </span>
                      {targetRecipient === 'recipient' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-xs font-black truncate">{voucher.recipient.name}</p>
                    <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">{voucher.recipient.phone || 'Non renseigné'}</p>
                  </button>

                  {/* Expéditeur Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectRecipient('sender')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      targetRecipient === 'sender'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                        👤 Expéditeur (Envoyeur)
                      </span>
                      {targetRecipient === 'sender' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-xs font-black truncate">{voucher.sender.name}</p>
                    <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">{voucher.sender.phone || 'Non renseigné'}</p>
                  </button>

                  {/* Autre Numéro Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectRecipient('custom')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      targetRecipient === 'custom'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                        📱 Autre Numéro
                      </span>
                      {targetRecipient === 'custom' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-xs font-bold text-slate-500">Saisie libre...</p>
                    <p className="text-[11px] font-mono text-slate-500">Numéro personnalisé</p>
                  </button>
                </div>

                {/* Phone input field */}
                <div className="pt-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-share-whatsapp-phone-direct"
                      type="tel"
                      value={customPhone}
                      onChange={e => {
                        setCustomPhone(e.target.value);
                        setTargetRecipient('custom');
                      }}
                      placeholder="Numéro WhatsApp (ex: 0612345678 ou +212612345678)"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Media Package (Voucher Image + Parcel Photos) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-orange-500" />
                    2. Médias Associés (Bon du Site & Photos Colis)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Prêts à joindre ou copier dans WhatsApp
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Media Item 1: Bon du site HD */}
                  <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 flex flex-col justify-between gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">Bon Officiel HD</p>
                          <p className="text-[10px] text-slate-500">Image PNG haute résolution</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeVoucherImage}
                          onChange={e => setIncludeVoucherImage(e.target.checked)}
                          className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Inclure</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-orange-200/60 dark:border-orange-900/40">
                      <button
                        type="button"
                        onClick={handleCopyImage}
                        className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-bold border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        title="Copier l'image du bon pour faire Ctrl+V / Coller dans WhatsApp"
                      >
                        {copiedImage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                        <span>{copiedImage ? 'Copié !' : 'Copier Image'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadImage}
                        disabled={isExportingImage}
                        className="flex-1 py-1.5 px-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Télécharger</span>
                      </button>
                    </div>
                  </div>

                  {/* Media Item 2: Photos des colis */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">Photos des Colis</p>
                          <p className="text-[10px] text-slate-500">
                            {parcelPhotos.length > 0 ? `${parcelPhotos.length} photo(s) disponible(s)` : 'Aucune photo attachée'}
                          </p>
                        </div>
                      </div>

                      {parcelPhotos.length > 0 && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeParcelPhotos}
                            onChange={e => setIncludeParcelPhotos(e.target.checked)}
                            className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Inclure</span>
                        </label>
                      )}
                    </div>

                    {parcelPhotos.length > 0 ? (
                      <div>
                        {/* Thumbnails preview */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-1.5">
                          {parcelPhotos.map((photo, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewPhotoModal(photo)}
                              className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0 hover:ring-2 hover:ring-amber-500 cursor-pointer"
                              title="Cliquer pour agrandir"
                            >
                              <img src={photo} alt={`Colis ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={handleDownloadAllPhotos}
                            className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>Télécharger {parcelPhotos.length} Photo(s)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        Les photos prises lors de l'enregistrement ou de la pesée apparaîtront ici.
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* 3. Concise Summary Message Preview (NO TRACKING LINK) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    3. Message Résumé Formaté (Concis • Sans lien de suivi)
                  </label>
                  
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copié !' : 'Copier texte'}</span>
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-100 text-[11px] font-mono whitespace-pre-wrap border border-slate-800 leading-relaxed max-h-44 overflow-y-auto select-all">
                  {previewText}
                </pre>
              </div>

              {/* 4. Main Prominent WhatsApp Action Bar */}
              <div className="bg-emerald-700 rounded-2xl p-4 text-white shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      Envoyer Directement sur WhatsApp
                    </h3>
                    <p className="text-[11px] text-emerald-100 mt-0.5">
                      Vers : <strong className="text-white font-mono">{customPhone || 'Numéro à renseigner'}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Native Web Share with Files (Voucher HD + Photos) */}
                    <button
                      id="btn-whatsapp-share-pack"
                      type="button"
                      onClick={handleDirectPackShare}
                      disabled={isSharingPack}
                      className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                      title="Partage direct complet avec photos et bon"
                    >
                      <Share2 className="w-4 h-4 text-emerald-700" />
                      <span>{isSharingPack ? 'Préparation...' : 'Partager Tout (WhatsApp + Médias)'}</span>
                    </button>

                    {/* Simple WhatsApp Link */}
                    <button
                      id="btn-whatsapp-direct-link"
                      type="button"
                      onClick={handleDirectWhatsApp}
                      className="px-4 py-2.5 bg-emerald-900/80 hover:bg-emerald-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 border border-emerald-400/40 transition-all cursor-pointer active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ouvrir WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 2: HD CLIENT VOUCHER IMAGE PREVIEW
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'card' && (
            <div className="space-y-4">
              
              {/* Quick Actions Command Bar */}
              <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Moteur Canvas 2D HD (Qualité Supérieure)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Download PNG */}
                  <button
                    id="btn-download-hd-png"
                    onClick={handleDownloadImage}
                    disabled={isExportingImage}
                    className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingImage ? 'Génération...' : 'Télécharger PNG HD'}</span>
                  </button>

                  {/* PDF Vectoriel Natif */}
                  <button
                    id="btn-download-pdf-card"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-orange-400" />
                    <span>{isExportingPdf ? 'Génération...' : 'PDF Vectoriel'}</span>
                  </button>

                  {/* Copy Image */}
                  <button
                    id="btn-copy-hd-image"
                    onClick={handleCopyImage}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedImage ? 'Copié !' : 'Copier Image'}</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    id="btn-share-whatsapp-card"
                    onClick={handleDirectWhatsApp}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Live Card Preview */}
              <div className="flex justify-center p-1 sm:p-2">
                
                {/* THEME 1: BILLET EXPRESS */}
                {cardTheme === 'modern-ticket' && (
                  <div 
                    id="client-hd-voucher-card"
                    className="w-full max-w-[620px] bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans select-none"
                    style={{ minWidth: '320px' }}
                  >
                    {/* Header */}
                    <div className="bg-slate-950 text-white px-4 sm:px-5 py-3 border-b-2 border-orange-500 relative overflow-hidden">
                      <div className="flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-0.5 shadow-sm shrink-0 overflow-hidden">
                            <img 
                              src="/logo.png" 
                              alt="Logo" 
                              className="w-full h-full object-contain" 
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerHTML = '<span class="font-black text-orange-500 text-sm">LT</span>';
                                }
                              }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase leading-none">
                                {settings.companyName || 'LOYALIS TRANS'}
                              </h3>
                              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[9px] font-black uppercase tracking-wider">
                                Express
                              </span>
                            </div>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                              Tél : {settings.phone1 || '+212 600-000000'} {settings.phone2 ? `• ${settings.phone2}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[8.5px] text-slate-400 uppercase font-black tracking-wider block leading-tight">N° de Suivi</span>
                            <span className="font-mono text-sm sm:text-base font-black text-orange-400 tracking-wider">
                              #{voucher.trackingNumber}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black border uppercase tracking-wider inline-block shrink-0 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Route Bar */}
                    <div className="bg-slate-100 px-4 sm:px-5 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-black text-slate-900">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Trajet :</span>
                        <span className="text-orange-600 uppercase text-xs sm:text-sm">
                          {voucher.departureCity || settings.defaultDepartureCity || 'Casablanca'}
                        </span>
                        <span className="text-slate-400 font-bold">➔</span>
                        <span className="text-orange-600 uppercase text-xs sm:text-sm">
                          {voucher.recipient.destination || voucher.destinationCity}
                        </span>
                      </div>

                      <div className="text-slate-600 text-[10.5px] font-bold flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-orange-600" />
                        <span>{formatDate(voucher.date)} {voucher.time && `• ${voucher.time}`}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 bg-white space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block">
                            Expéditeur (Envoyeur)
                          </span>
                          <p className="font-black text-slate-900 text-xs sm:text-sm leading-tight">{voucher.sender.name}</p>
                          <p className="font-bold text-slate-700 text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3 text-orange-600" />
                            {voucher.sender.phone}
                          </p>
                          {voucher.sender.cin && (
                            <p className="text-[10px] text-slate-600 font-mono">CIN : <strong className="text-slate-900">{voucher.sender.cin}</strong></p>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-0.5">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-orange-700 block">
                            Destinataire (Réceptionnaire)
                          </span>
                          <p className="font-black text-slate-900 text-xs sm:text-sm leading-tight">{voucher.recipient.name}</p>
                          <p className="font-bold text-slate-700 text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3 text-orange-600" />
                            {voucher.recipient.phone}
                          </p>
                          <p className="text-[10px] text-orange-950 font-bold leading-tight">
                            Destination : <span className="uppercase">{voucher.recipient.destination || voucher.destinationCity}</span>
                          </p>
                        </div>
                      </div>

                      {/* Baggage Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <div className="bg-slate-900 text-white px-3.5 py-1.5 flex items-center justify-between text-[9.5px] font-black uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-orange-400" />
                            Détail des Bagages ({voucher.totalColis} colis • {voucher.totalWeightKg} kg)
                          </span>
                          <span>Montant</span>
                        </div>
                        
                        <div className="divide-y divide-slate-100 bg-white">
                          {voucher.items.map((it, idx) => {
                            const itemPrice = it.price !== undefined ? it.price : (it.unitPrice !== undefined ? it.unitPrice * (it.quantity || 1) : 0);
                            return (
                              <div key={idx} className="px-3.5 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50/60">
                                <div>
                                  <span className="font-black text-slate-900">
                                    {it.quantity}x {it.nature}
                                  </span>
                                  {it.weightKg > 0 && (
                                    <span className="text-slate-500 font-semibold ml-2 text-[11px]">
                                      ({it.weightKg} kg)
                                    </span>
                                  )}
                                  {it.notes && (
                                    <span className="text-[10px] text-slate-400 block italic">{it.notes}</span>
                                  )}
                                </div>
                                <div className="text-right font-mono font-bold text-slate-800 shrink-0">
                                  {itemPrice > 0 ? formatCurrency(itemPrice, currency) : '-'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Financial & QR Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-0.5">
                        <div className="sm:col-span-7 bg-slate-950 text-white p-3 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Général</span>
                              <span className="text-lg sm:text-xl font-black text-orange-400 font-mono">
                                {formatCurrency(voucher.totalPrice, currency)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase">Nombre Colis</span>
                              <span className="text-sm font-black text-white">{voucher.totalColis} pièce(s)</span>
                            </div>
                          </div>

                          <div className="text-xs">
                            {paymentInfo.type === 'PAYE' && (
                              <div className="flex items-center justify-between text-emerald-400 font-black text-[11px]">
                                <span>Statut Paiement :</span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Intégralement Payé
                                </span>
                              </div>
                            )}

                            {paymentInfo.type === 'AVANCE' && (
                              <div className="space-y-0.5 text-[10.5px]">
                                <div className="flex items-center justify-between text-amber-300 font-bold">
                                  <span>Avance reçue :</span>
                                  <span>{formatCurrency(voucher.advanceAmount || 0, currency)}</span>
                                </div>
                                <div className="flex items-center justify-between text-rose-300 font-black">
                                  <span>Reste à payer :</span>
                                  <span>{formatCurrency(voucher.remainingAmount || 0, currency)}</span>
                                </div>
                              </div>
                            )}

                            {paymentInfo.type === 'NON_PAYE' && (
                              <div className="flex items-center justify-between text-rose-300 font-black text-[11px]">
                                <span>Règlement :</span>
                                <span>À régler à la livraison ({formatCurrency(voucher.totalPrice, currency)})</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="sm:col-span-5 p-2.5 rounded-xl bg-orange-50/90 border border-orange-200 flex items-center gap-2.5">
                          {qrCodeUrl ? (
                            <img 
                              src={qrCodeUrl} 
                              alt={`QR Code ${voucher.trackingNumber}`} 
                              className="w-14 h-14 bg-white p-1 rounded-lg border border-orange-300 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-slate-200 rounded-lg animate-pulse shrink-0" />
                          )}
                          <div className="text-left space-y-0.5">
                            <span className="font-black text-slate-900 text-[11px] block leading-tight flex items-center gap-1">
                              <ScanLine className="w-3 h-3 text-orange-600" />
                              Flash QR Suivi
                            </span>
                            <p className="text-[9px] text-slate-600 leading-tight">
                              Scan retrait sécurisé.
                            </p>
                            <span className="font-mono text-[10.5px] font-black text-orange-700 block">
                              #{voucher.trackingNumber}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="bg-slate-900 text-slate-400 px-4 py-1.5 border-t border-slate-800 flex items-center justify-between text-[9.5px]">
                      <span className="font-bold text-slate-300">
                        {settings.companyName || 'LOYALIS TRANS'} • Document Officiel
                      </span>
                      <span>Présenter ce bon lors du retrait</span>
                    </div>

                  </div>
                )}

                {/* THEME 2: REÇU FACTURE */}
                {cardTheme === 'corporate-receipt' && (
                  <div 
                    id="client-hd-voucher-card"
                    className="w-full max-w-[620px] bg-white text-slate-900 rounded-2xl shadow-xl border-2 border-slate-300 p-4 space-y-2.5 font-sans select-none"
                    style={{ minWidth: '320px' }}
                  >
                    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black tracking-tight text-slate-900 uppercase leading-none">
                            {settings.companyName || 'LOYALIS TRANS'}
                          </h3>
                          <span className="text-[8.5px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded uppercase">
                            Reçu Officiel
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-600 mt-0.5">
                          Tél : {settings.phone1} {settings.phone2 ? `• ${settings.phone2}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-900 text-white rounded-md inline-block">
                          N° {voucher.trackingNumber}
                        </span>
                        <p className="text-[9.5px] text-slate-500 font-bold mt-0.5">
                          {formatDate(voucher.date)} {voucher.time && `• ${voucher.time}`}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-100 p-2 rounded-xl flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-800">
                        <span className="text-[9.5px] text-slate-500 uppercase mr-1">Trajet :</span>
                        <span className="font-black text-slate-900">{voucher.departureCity || 'Casablanca'}</span>
                        <span className="text-slate-400 mx-1.5">➔</span>
                        <span className="font-black text-slate-900">{voucher.recipient.destination || voucher.destinationCity}</span>
                      </div>
                      <span className="font-bold text-[9.5px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-0.5">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Expéditeur</span>
                        <p className="font-black text-slate-900 text-xs">{voucher.sender.name}</p>
                        <p className="text-slate-600 text-[10.5px]">{voucher.sender.phone}</p>
                      </div>
                      <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-0.5">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Destinataire</span>
                        <p className="font-black text-slate-900 text-xs">{voucher.recipient.name}</p>
                        <p className="text-slate-600 text-[10.5px]">{voucher.recipient.phone}</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold text-[9px] uppercase">
                          <tr>
                            <th className="p-1.5">Bagages ({voucher.totalColis} colis)</th>
                            <th className="p-1.5 text-center">Poids ({voucher.totalWeightKg} kg)</th>
                            <th className="p-1.5 text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {voucher.items.map((it, idx) => {
                            const itemPrice = it.price !== undefined ? it.price : (it.unitPrice !== undefined ? it.unitPrice * (it.quantity || 1) : 0);
                            return (
                              <tr key={idx}>
                                <td className="p-1.5 font-bold text-slate-800">
                                  {it.quantity}x {it.nature}
                                </td>
                                <td className="p-1.5 text-center text-slate-600 font-mono">
                                  {it.weightKg > 0 ? `${it.weightKg} kg` : '-'}
                                </td>
                                <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                                  {itemPrice > 0 ? formatCurrency(itemPrice, currency) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-7 p-2.5 rounded-xl bg-slate-900 text-white space-y-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">Total à Payer</span>
                          <span className="text-lg font-black text-orange-400 font-mono">
                            {formatCurrency(voucher.totalPrice, currency)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 border-t border-slate-800 pt-1">
                          {paymentInfo.type === 'PAYE' && <span className="text-emerald-400 font-bold text-[10.5px]">✓ Intégralement Payé</span>}
                          {paymentInfo.type === 'AVANCE' && (
                            <div className="space-y-0.5 text-[10px]">
                              <span className="text-amber-300 block">Avance : {formatCurrency(voucher.advanceAmount || 0, currency)}</span>
                              <span className="text-rose-300 font-bold block">Reste dû : {formatCurrency(voucher.remainingAmount || 0, currency)}</span>
                            </div>
                          )}
                          {paymentInfo.type === 'NON_PAYE' && <span className="text-rose-400 font-bold text-[10.5px]">À payer à la livraison</span>}
                        </div>
                      </div>

                      <div className="sm:col-span-5 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                        {qrCodeUrl && (
                          <img src={qrCodeUrl} alt="QR Code" className="w-12 h-12 bg-white p-0.5 rounded-lg border border-slate-300 shrink-0" />
                        )}
                        <div className="text-[10px] space-y-0.5">
                          <span className="font-black text-slate-900 block leading-tight">Flash Suivi</span>
                          <span className="font-mono text-orange-600 font-bold text-[9.5px] block">{voucher.trackingNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              TAB 3: TEXT & ALTERNATIVE SHARING
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  id="btn-copy-formatted-text"
                  onClick={handleCopyText}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                    copiedText
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-black'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-400 text-slate-700 dark:text-slate-200 shadow-xs'
                  }`}
                >
                  {copiedText ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-slate-500" />}
                  <span className="text-xs font-bold">{copiedText ? 'Copié !' : 'Copier le Texte'}</span>
                </button>

                <button
                  id="btn-share-sms"
                  onClick={handleSMS}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-2 text-center transition-all shadow-xs cursor-pointer"
                >
                  <PhoneCall className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-bold">Envoyer SMS</span>
                </button>

                <button
                  id="btn-share-email"
                  onClick={handleEmail}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-2 text-center transition-all shadow-xs cursor-pointer"
                >
                  <Mail className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs font-bold">Par Email</span>
                </button>

                <button
                  id="btn-download-image-from-tab3"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-orange-400 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-2 text-center transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-5 h-5 text-orange-500" />
                  <span className="text-xs font-bold">{isExportingPdf ? 'PDF...' : 'PDF Vectoriel'}</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Texte formaté pour le client :
                  </label>
                  <button
                    onClick={handleCopyText}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Texte copié !' : 'Copier'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono whitespace-pre-wrap border border-slate-800 max-h-60 overflow-y-auto leading-relaxed select-all">
                  {previewText}
                </pre>
              </div>

            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="px-5 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between sticky bottom-0 z-30">
          <div className="text-xs text-slate-500 font-bold">
            Loyalis Trans • Expéditions de Bagages
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrint();
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Format Impression A4</span>
              </button>
            )}

            <button
              id="btn-close-share-footer"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>

      {/* Photo Enlarge Modal if previewing single photo */}
      {previewPhotoModal && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-xl p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhotoModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewPhotoModal} alt="Photo Colis Agrandie" className="w-full max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

    </div>
  );
};
