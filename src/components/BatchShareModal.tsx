import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  MessageSquare, 
  ExternalLink, 
  ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { CompanySettings, Voucher } from '../types';
import { 
  generateVoucherCanvas, 
  getVoucherCanvasBlob, 
  getVoucherCanvasFile, 
  downloadVoucherCanvasImage,
  copyVoucherCanvasImageToClipboard 
} from '../utils/voucherImageCanvasGenerator';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/formatters';

interface BatchShareModalProps {
  selectedVouchers: Voucher[];
  settings: CompanySettings;
  isOpen: boolean;
  onClose: () => void;
}

interface RenderedVoucherCard {
  voucher: Voucher;
  dataUrl: string;
  blob?: Blob;
  file?: File;
  loading: boolean;
}

export const BatchShareModal: React.FC<BatchShareModalProps> = ({
  selectedVouchers,
  settings,
  isOpen,
  onClose
}) => {
  const [renderedCards, setRenderedCards] = useState<RenderedVoucherCard[]>([]);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [isSharingDirect, setIsSharingDirect] = useState<boolean>(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);
  const [copiedSummaryText, setCopiedSummaryText] = useState<boolean>(false);
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const currency = settings.currency || 'DH';

  // Render digital voucher canvas images when modal opens
  useEffect(() => {
    if (!isOpen || selectedVouchers.length === 0) {
      setRenderedCards([]);
      return;
    }

    let isMounted = true;
    setIsRendering(true);

    // Initial placeholder
    const initialList: RenderedVoucherCard[] = selectedVouchers.map(v => ({
      voucher: v,
      dataUrl: '',
      loading: true
    }));
    setRenderedCards(initialList);

    // Render each voucher to canvas
    const generateAll = async () => {
      const results: RenderedVoucherCard[] = [];
      for (const voucher of selectedVouchers) {
        try {
          const canvas = await generateVoucherCanvas(voucher, settings);
          const dataUrl = canvas.toDataURL('image/png', 0.98);
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.98));
          const file = blob ? new File([blob], `Bon_Digital_${voucher.trackingNumber}.png`, { type: 'image/png' }) : undefined;

          results.push({
            voucher,
            dataUrl,
            blob: blob || undefined,
            file,
            loading: false
          });
        } catch (err) {
          console.error(`Error rendering digital canvas for ${voucher.trackingNumber}:`, err);
          results.push({
            voucher,
            dataUrl: '',
            loading: false
          });
        }
      }

      if (isMounted) {
        setRenderedCards(results);
        setIsRendering(false);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedVouchers, settings]);

  if (!isOpen) return null;

  // Build summary text for WhatsApp
  const buildGroupSummaryText = (): string => {
    let text = `📦 *LOYALIS TRANS - ENVOI GROUPÉ (${selectedVouchers.length} BONS)*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    selectedVouchers.forEach((v, idx) => {
      text += `*Bon #${idx + 1} : N° ${v.trackingNumber}*\n`;
      text += `• De : ${v.sender.name} (${v.departureCity || 'Casablanca'})\n`;
      text += `• Pour : ${v.recipient.name} (${v.recipient.destination || v.destinationCity})\n`;
      text += `• Colis : ${v.totalColis} colis • ${v.totalWeightKg} kg • *${formatCurrency(v.totalPrice, currency)}*\n`;
      text += `• Statut : ${getStatusBadge(v.status).label}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📞 Agence Loyalis Trans : ${settings.phone1 || ''}\n`;
    return text;
  };

  // Direct Web Share with all files (WhatsApp on mobile)
  const handleDirectWebShare = async () => {
    const filesToShare = renderedCards
      .map(rc => rc.file)
      .filter((f): f is File => Boolean(f));

    if (filesToShare.length === 0) return;

    setIsSharingDirect(true);
    try {
      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          title: `Bons de Transport Loyalis Trans (${filesToShare.length})`,
          text: buildGroupSummaryText(),
          files: filesToShare
        });
      } else {
        // Fallback: Open WhatsApp with summary text
        handleShareWhatsApp();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share canceled or failed:', err);
        handleShareWhatsApp();
      }
    } finally {
      setIsSharingDirect(false);
    }
  };

  // Open WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(buildGroupSummaryText());
    let cleanPhone = targetPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '212' + cleanPhone.substring(1);
    }

    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Download all digital images one by one
  const handleDownloadAllImages = async () => {
    setIsDownloadingAll(true);
    try {
      for (let i = 0; i < renderedCards.length; i++) {
        const item = renderedCards[i];
        if (item.dataUrl) {
          const a = document.createElement('a');
          a.href = item.dataUrl;
          a.download = `Bon_Digital_${item.voucher.trackingNumber}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Wait 350ms between downloads to avoid browser blocking
          await new Promise(res => setTimeout(res, 350));
        }
      }
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Copy single digital image to clipboard
  const handleCopySingleImage = async (voucher: Voucher) => {
    const success = await copyVoucherCanvasImageToClipboard(voucher, settings);
    if (success) {
      setCopiedVoucherId(voucher.id);
      setTimeout(() => setCopiedVoucherId(null), 2500);
    }
  };

  // Copy summary text to clipboard
  const handleCopySummaryText = async () => {
    try {
      await navigator.clipboard.writeText(buildGroupSummaryText());
      setCopiedSummaryText(true);
      setTimeout(() => setCopiedSummaryText(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 animate-fadeIn overflow-y-auto">
      <div 
        className="w-full max-w-5xl max-h-[96vh] sm:max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-3.5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-black uppercase tracking-tight text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="truncate">Partager les Bons</span>
                <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-orange-500 text-white shrink-0">
                  {selectedVouchers.length} sélectionné(s)
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Génération d'images officielles pour WhatsApp ou téléchargement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar (Top Controls) */}
        <div className="p-3 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          
          {/* Target Phone for WhatsApp */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 max-w-sm">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:inline">
              N° WhatsApp :
            </span>
            <input
              type="tel"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="Ex: 0661000000 (optionnel)"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            
            {/* Direct Native Share (Mobile App / WhatsApp) */}
            <button
              id="btn-batch-native-share"
              type="button"
              onClick={handleDirectWebShare}
              disabled={isRendering || isSharingDirect}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title="Ouvrir le menu de partage WhatsApp avec les images jointes"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Partager Images WhatsApp</span>
            </button>

            {/* Download All PNGs */}
            <button
              id="btn-batch-download-all"
              type="button"
              onClick={handleDownloadAllImages}
              disabled={isRendering || isDownloadingAll}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingAll ? 'Téléchargement...' : 'Télécharger Tout (.PNG)'}</span>
            </button>

            {/* Copy Summary Text */}
            <button
              type="button"
              onClick={handleCopySummaryText}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              {copiedSummaryText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummaryText ? 'Texte Copié !' : 'Copier Récapitulatif'}</span>
            </button>

          </div>
        </div>

        {/* Content Area: Grid of Digital Voucher Image Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          
          {isRendering && (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-400">
                Génération des images de bons digitaux haute définition en cours...
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderedCards.map((item, idx) => (
              <div 
                key={item.voucher.id || idx}
                className="bg-slate-950 border-2 border-slate-800 hover:border-orange-500/60 rounded-2xl p-4 space-y-3 transition-colors flex flex-col"
              >
                {/* Card Top Info */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-orange-400 font-mono">
                      #{item.voucher.trackingNumber}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[140px]">
                      {item.voucher.recipient.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getStatusBadge(item.voucher.status).bg} ${getStatusBadge(item.voucher.status).text} ${getStatusBadge(item.voucher.status).border}`}>
                    {getStatusBadge(item.voucher.status).label}
                  </span>
                </div>

                {/* Digital Voucher Preview Image */}
                <div className="flex-1 min-h-[220px] bg-slate-900 rounded-xl overflow-hidden relative group flex items-center justify-center border border-slate-800">
                  {item.dataUrl ? (
                    <>
                      <img 
                        src={item.dataUrl} 
                        alt={`Bon digital ${item.voucher.trackingNumber}`}
                        className="w-full h-auto max-h-[300px] object-contain cursor-pointer"
                        onClick={() => setZoomImage(item.dataUrl)}
                      />
                      <div 
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                        onClick={() => setZoomImage(item.dataUrl)}
                      >
                        <span className="px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-md">
                          Cliquer pour agrandir
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span>Rendu du bon...</span>
                    </div>
                  )}
                </div>

                {/* Card Bottom Controls */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">
                    {item.voucher.totalColis} colis • {item.voucher.totalWeightKg} kg • <strong className="text-white">{formatCurrency(item.voucher.totalPrice, currency)}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Copy to clipboard */}
                    <button
                      type="button"
                      onClick={() => handleCopySingleImage(item.voucher)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copier l'image digitale dans le presse-papier"
                    >
                      {copiedVoucherId === item.voucher.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Single Download */}
                    {item.dataUrl && (
                      <a
                        href={item.dataUrl}
                        download={`Bon_Digital_${item.voucher.trackingNumber}.png`}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="Télécharger l'image PNG"
                      >
                        <Download className="w-3 h-3" />
                        <span>PNG</span>
                      </a>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            Astuce : Sur mobile ou WhatsApp Web, vous pouvez copier/coller directement les images ou utiliser le bouton de partage.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>

      {/* Lightbox Zoom for single digital card */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div className="w-full max-w-3xl flex items-center justify-end pb-2">
            <button
              onClick={() => setZoomImage(null)}
              className="p-2 rounded-xl bg-slate-800 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img 
            src={zoomImage} 
            alt="Bon Digital Plein Écran" 
            className="max-h-[85vh] max-w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
};
