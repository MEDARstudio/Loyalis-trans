import React, { useEffect, useState } from 'react';
import { 
  Printer, 
  Download, 
  Image as ImageIcon, 
  Share2, 
  X, 
  QrCode, 
  Check, 
  Copy,
  MapPin,
  Phone,
  User,
  CreditCard,
  Package,
  Scale,
  Calendar,
  Truck,
  FileText,
  Layers,
  Scissors,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Receipt
} from 'lucide-react';
import { CompanySettings, Voucher } from '../types';
import { formatCurrency, formatDate, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';
import { generateVoucherQRDataUrl } from '../utils/qrGenerator';
import { exportElementAsPDF, exportVoucherImage, copyElementAsImageToClipboard } from '../utils/shareUtils';
import { downloadVoucherNativePDF, VoucherPdfLayout } from '../utils/voucherPdfGenerator';

interface VoucherPrintViewProps {
  voucher: Voucher;
  settings: CompanySettings;
  onClose: () => void;
  onOpenShareModal?: () => void;
}

export const VoucherPrintView: React.FC<VoucherPrintViewProps> = ({
  voucher,
  settings,
  onClose,
  onOpenShareModal
}) => {
  const [printLayout, setPrintLayout] = useState<'double-stub' | 'full-page' | 'compact-receipt'>('double-stub');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  
  const currency = settings.currency || 'DH';
  const statusInfo = getStatusBadge(voucher.status);
  const payInfo = getPaymentStatusInfo(
    voucher.paymentStatus || voucher.paymentMethod,
    voucher.advanceAmount || 0,
    voucher.totalPrice,
    voucher.remainingAmount
  );

  useEffect(() => {
    generateVoucherQRDataUrl(voucher, { size: 420 }).then(url => {
      setQrCodeUrl(url);
    });
  }, [voucher]);

  const handlePrint = () => {
    window.print();
  };

  /**
   * Native Crisp Vector PDF generation (100% reliable)
   */
  const handleDownloadNativePDF = async (layoutOverride?: VoucherPdfLayout) => {
    try {
      setIsExportingPDF(true);
      const chosenLayout: VoucherPdfLayout = layoutOverride || 
        (printLayout === 'compact-receipt' ? 'compact-receipt' : printLayout === 'full-page' ? 'full-page' : 'double-stub');
      
      const success = await downloadVoucherNativePDF(voucher, settings, chosenLayout);
      if (success) {
        setDownloadSuccess('PDF Vectoriel téléchargé avec succès !');
        setTimeout(() => setDownloadSuccess(null), 3000);
      } else {
        await exportElementAsPDF('printable-voucher-document', `Bon_Transport_${voucher.trackingNumber}`);
      }
    } catch (err) {
      console.error('PDF export error:', err);
      await exportElementAsPDF('printable-voucher-document', `Bon_Transport_${voucher.trackingNumber}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  /**
   * 100% Crisp Canvas 2D Image Generator (Zero alignment bugs)
   */
  const handleDownloadImage = async () => {
    try {
      setIsExportingImage(true);
      const success = await exportVoucherImage(voucher, settings, 'printable-voucher-document');
      if (success) {
        setDownloadSuccess('Image PNG HD générée avec succès !');
        setTimeout(() => setDownloadSuccess(null), 3000);
      } else {
        alert("Erreur lors de la génération de l'image. Utilisez le téléchargement PDF.");
      }
    } catch (err) {
      console.error('Image export error:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div 
      id="voucher-print-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static"
    >
      {/* Container Box */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[96vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Action Toolbar (Hidden during browser print) */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden sticky top-0 z-30">
          
          {/* Left Title & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-base text-white shadow-lg shadow-orange-600/30">
              LT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base">Téléchargement & Impression</span>
                <span className="font-mono bg-orange-500/20 text-orange-400 px-2.5 py-0.5 rounded-lg text-xs font-black border border-orange-500/40">
                  N° {voucher.trackingNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Génération directe : Image PNG HD réalignée ou PDF Vectoriel officiel
              </p>
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Direct Print */}
            <button
              id="btn-trigger-print"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              <span>Imprimer</span>
            </button>

            {/* Download Image (Pure 2D Canvas Engine) */}
            <button
              id="btn-trigger-download-img"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{isExportingImage ? 'Génération...' : 'Télécharger Image (PNG HD)'}</span>
            </button>

            {/* Download PDF (Native Ultra-Sharp) */}
            <button
              id="btn-trigger-download-pdf"
              onClick={() => handleDownloadNativePDF()}
              disabled={isExportingPDF}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-orange-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? 'Génération...' : 'Télécharger PDF (A4)'}</span>
            </button>

            {/* Share */}
            {onOpenShareModal && (
              <button
                id="btn-open-share-from-print"
                onClick={onOpenShareModal}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            )}

            {/* Close */}
            <button
              id="btn-close-print-modal"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format Selector Sub-Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Layers className="w-4 h-4 text-orange-500" />
            <span>Disposition du bon :</span>
            <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-1 rounded-xl gap-1">
              <button
                id="btn-layout-double-stub"
                onClick={() => setPrintLayout('double-stub')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  printLayout === 'double-stub'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Double Souche A4 (Client + Agence)
              </button>
              <button
                id="btn-layout-full-page"
                onClick={() => setPrintLayout('full-page')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  printLayout === 'full-page'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pleine Page A4 (Facture & Bordereau)
              </button>
              <button
                id="btn-layout-compact"
                onClick={() => setPrintLayout('compact-receipt')}
                className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  printLayout === 'compact-receipt'
                    ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Ticket Caisse (80mm)
              </button>
            </div>
          </div>

          {downloadSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{downloadSuccess}</span>
            </div>
          )}
        </div>

        {/* Printable Document Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-200/70 dark:bg-slate-950 print:bg-white print:p-0 print:overflow-visible flex justify-center">
          
          <div 
            id="printable-voucher-document"
            className="w-full max-w-[780px] bg-white text-slate-900 p-5 sm:p-7 rounded-2xl shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-0 print:max-w-none space-y-5 font-sans"
          >
            
            {/* ═══════════════════════════════════════════════════════
                LAYOUT 1: DOUBLE SOUCHE (CLIENT + AGENCE SUR PAGE A4)
                ═══════════════════════════════════════════════════════ */}
            {printLayout === 'double-stub' && (
              <>
                {/* ── SOUCHE 1 : EXEMPLAIRE CLIENT / EXPÉDITEUR ── */}
                <div className="border-2 border-slate-900 rounded-2xl p-4 sm:p-5 relative overflow-hidden bg-white space-y-3.5">
                  
                  <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-xs">
                    Exemplaire Client / Expéditeur
                  </div>

                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-200 pb-3">
                    <div className="space-y-1 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-orange-600/30">
                          LT
                        </div>
                        <div>
                          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 leading-none uppercase">
                            {settings.companyName || 'LOYALIS TRANS'}
                          </h1>
                          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mt-0.5">
                            Transport Express Bagages & Colis
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-[10.5px] text-slate-600 space-y-0.5 pt-0.5">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <Phone className="w-3 h-3 text-orange-600 shrink-0" />
                          <span>Tél : {settings.phone1 || '+212 600-000000'} {settings.phone2 ? `• ${settings.phone2}` : ''}</span>
                        </p>
                        {settings.address && (
                          <p className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                            <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
                            <span>{settings.address}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* QR Code & Tracking Box */}
                    <div className="flex items-center gap-3 bg-slate-900 text-white p-2.5 sm:p-3 rounded-2xl shadow-md border border-slate-800">
                      <div className="bg-white p-1 rounded-xl border border-slate-700 shadow-sm shrink-0 text-center flex flex-col items-center">
                        {qrCodeUrl ? (
                          <img 
                            src={qrCodeUrl} 
                            alt={`QR Suivi ${voucher.trackingNumber}`} 
                            className="w-16 h-16 sm:w-18 sm:h-18 object-contain rounded-md" 
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-800 animate-pulse rounded-md" />
                        )}
                        <span className="text-[7.5px] font-mono text-slate-800 block font-black uppercase mt-0.5">
                          Suivi QR
                        </span>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                          Bon de Transport N°
                        </span>
                        <span className="text-base sm:text-lg font-black font-mono tracking-widest text-orange-400 block">
                          {voucher.trackingNumber}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold block">
                          Date : {formatDate(voucher.date)} {voucher.time && `(${voucher.time})`}
                        </span>
                        <div className="pt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-orange-600/30 text-orange-300 border border-orange-500/40 text-[8.5px] font-black uppercase">
                            Retrait Sécurisé
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route & Sender/Recipient Grid */}
                  <div className="space-y-2.5">
                    <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-orange-600" />
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Trajet :</span>
                        <span className="font-black text-slate-900 text-xs sm:text-sm uppercase">
                          {voucher.departureCity || settings.defaultDepartureCity || 'Casablanca'} ➔ {voucher.recipient.destination || voucher.destinationCity}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md border font-black text-[9.5px] uppercase ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                          Expéditeur (Envoyeur)
                        </span>
                        <p className="font-black text-xs sm:text-sm text-slate-900">{voucher.sender.name}</p>
                        <p className="text-slate-700 font-bold text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-orange-600" />
                          {voucher.sender.phone}
                        </p>
                        {voucher.sender.cin && (
                          <p className="text-slate-500 font-mono text-[10.5px]">CIN : <strong className="text-slate-800">{voucher.sender.cin}</strong></p>
                        )}
                      </div>

                      <div className="bg-orange-50/60 p-2.5 rounded-xl border border-orange-200/80 space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-orange-800 block">
                          Destinataire (Réceptionnaire)
                        </span>
                        <p className="font-black text-xs sm:text-sm text-slate-900">{voucher.recipient.name}</p>
                        <p className="text-slate-700 font-bold text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-orange-600" />
                          {voucher.recipient.phone}
                        </p>
                        <p className="text-orange-950 font-black text-[10.5px]">
                          Destination : <span className="uppercase">{voucher.recipient.destination || voucher.destinationCity}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Baggage Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900 text-white font-black text-[9.5px] uppercase">
                        <tr>
                          <th className="py-1.5 px-3">#</th>
                          <th className="py-1.5 px-3">Nature du Colis / Bagage</th>
                          <th className="py-1.5 px-3 text-center">Quantité</th>
                          <th className="py-1.5 px-3 text-center">Poids</th>
                          <th className="py-1.5 px-3 text-right">Prix</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {voucher.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-3 font-bold text-slate-400 text-[10.5px]">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-black text-slate-900">
                              {item.nature}
                              {item.notes && <span className="text-[10px] text-slate-500 font-normal italic ml-1.5">({item.notes})</span>}
                            </td>
                            <td className="py-1.5 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                            <td className="py-1.5 px-3 text-center font-bold text-slate-600">{item.weightKg ? `${item.weightKg} kg` : '-'}</td>
                            <td className="py-1.5 px-3 text-right font-black font-mono text-slate-900">
                              {item.price ? formatCurrency(item.price, currency) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial & Payment Summary Box */}
                  <div className="bg-slate-950 text-white rounded-xl p-3 space-y-1.5 text-xs border border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div>
                          <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Total Colis</span>
                          <span className="text-sm sm:text-base font-black text-white">{voucher.totalColis} colis</span>
                        </div>
                        <div className="border-l border-slate-800 pl-3">
                          <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Poids Total</span>
                          <span className="text-sm sm:text-base font-black text-white">{voucher.totalWeightKg} kg</span>
                        </div>
                        <div className="border-l border-slate-800 pl-3">
                          <span className="text-[8.5px] uppercase text-slate-400 font-bold block">Statut Règlement</span>
                          <span className="text-xs font-black uppercase text-orange-400">
                            {payInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Montant Total</span>
                        <span className="text-lg sm:text-xl font-black text-orange-400 font-mono">
                          {formatCurrency(voucher.totalPrice, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown line */}
                    {payInfo.type === 'AVANCE' && (
                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10.5px] font-bold">
                        <span className="text-amber-300">✓ Avance reçue : {formatCurrency(payInfo.advance, currency)}</span>
                        <span className="text-rose-300">⚠ Reste à payer à l'arrivée : {formatCurrency(payInfo.remaining, currency)}</span>
                      </div>
                    )}
                    {payInfo.type === 'NON_PAYE' && (
                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10.5px] font-bold text-rose-300">
                        <span>⚠ Paiement à la livraison / Contre-remboursement</span>
                        <span>Montant à régler : {formatCurrency(voucher.totalPrice, currency)}</span>
                      </div>
                    )}
                    {payInfo.type === 'PAYE' && (
                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10.5px] font-bold text-emerald-300">
                        <span>✓ Réglé en totalité au départ</span>
                        <span>Reste dû : 0 {currency}</span>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-3 pt-0.5 text-[10.5px]">
                    <div className="border border-dashed border-slate-300 rounded-xl p-2 h-12 flex flex-col justify-between">
                      <span className="font-bold text-slate-700 text-[10px]">Signature Expéditeur :</span>
                      <span className="text-[8.5px] text-slate-400 italic">"Lu et approuvé"</span>
                    </div>
                    <div className="border border-dashed border-slate-300 rounded-xl p-2 h-12 flex flex-col justify-between text-right">
                      <span className="font-bold text-slate-700 text-[10px]">Cachet & Visa Loyalis Trans :</span>
                      <span className="text-[9px] text-slate-600 font-bold">{voucher.agentName || 'Responsable Agence'}</span>
                    </div>
                  </div>

                </div>

                {/* Divider */}
                <div className="relative py-1 flex items-center justify-center print:py-2">
                  <div className="border-t-2 border-dashed border-slate-400 w-full" />
                  <span className="absolute bg-white px-3 text-[9.5px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-slate-600" />
                    Couper ici — Souche Agence / Chauffeur & Livreur
                  </span>
                </div>

                {/* ── SOUCHE 2 : EXEMPLAIRE AGENCE & CHAUFFEUR ── */}
                <div className="border-2 border-slate-800 rounded-2xl p-4 relative overflow-hidden bg-white space-y-2.5">
                  <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9.5px] font-black uppercase tracking-widest px-3 py-0.5 rounded-bl-xl shadow-xs">
                    Exemplaire Agence / Chauffeur
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        LT
                      </span>
                      <div>
                        <span className="font-black text-sm text-slate-900 uppercase">LOYALIS TRANS</span>
                        <span className="text-xs text-slate-600 ml-2 font-bold">
                          Bon N° <strong className="font-mono text-orange-600">{voucher.trackingNumber}</strong>
                        </span>
                        <p className="text-[10px] text-orange-600 font-bold uppercase">
                          {voucher.departureCity || 'Casablanca'} ➔ {voucher.recipient.destination}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl mr-24 sm:mr-28">
                      {qrCodeUrl && (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Agence" 
                          className="w-10 h-10 bg-white p-0.5 rounded-lg border border-slate-300 shrink-0" 
                        />
                      )}
                      <div className="text-[8.5px] text-slate-600 font-bold leading-tight">
                        <span className="text-slate-900 block font-black uppercase">Flash Agence</span>
                        <span>Date : {formatDate(voucher.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] font-black uppercase text-slate-500 block">Expéditeur :</span>
                      <p className="font-black text-slate-900 text-xs">{voucher.sender.name}</p>
                      <p className="text-slate-700 font-semibold text-[11px]">Tél : {voucher.sender.phone}</p>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[8.5px] font-black uppercase text-slate-500 block">Destinataire :</span>
                      <p className="font-black text-slate-900 text-xs">{voucher.recipient.name}</p>
                      <p className="text-slate-700 font-semibold text-[11px]">Tél : {voucher.recipient.phone}</p>
                    </div>
                  </div>

                  <div className="bg-slate-100 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <span>Total Colis : <strong className="text-slate-900">{voucher.totalColis} colis</strong> ({voucher.totalWeightKg} kg)</span>
                    <span>Règlement : <strong className="text-slate-900 uppercase">{payInfo.label}</strong></span>
                    <span>Montant : <strong className="text-orange-700 font-mono text-xs sm:text-sm">{formatCurrency(voucher.totalPrice, currency)}</strong></span>
                  </div>

                  {payInfo.remaining > 0 && (
                    <div className="bg-rose-50 border border-rose-200 p-1.5 rounded-xl text-xs font-black text-rose-700 flex items-center justify-between">
                      <span>⚠ À ENCAISSER DU DESTINATAIRE À LA LIVRAISON :</span>
                      <span className="font-mono text-xs sm:text-sm">{formatCurrency(payInfo.remaining, currency)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-0.5 text-[9.5px] text-slate-600">
                    <div className="border border-dashed border-slate-300 rounded-xl p-1.5 h-11 flex flex-col justify-between">
                      <span className="font-bold text-slate-700">Signature Réception Client :</span>
                      <span className="text-[8.5px] text-slate-400">Date : ___/___/2026 à ___:___</span>
                    </div>
                    <div className="border border-dashed border-slate-300 rounded-xl p-1.5 h-11 flex flex-col justify-between text-right">
                      <span className="font-bold text-slate-700">Visa Agent / Livreur :</span>
                      <span className="text-[8.5px] text-slate-400">Colis remis après vérification</span>
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════
                LAYOUT 2: PLEINE PAGE A4
                ═══════════════════════════════════════════════════════ */}
            {printLayout === 'full-page' && (
              <div className="border-2 border-slate-900 rounded-3xl p-5 sm:p-7 space-y-5 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
                  <div className="space-y-1.5 max-w-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-orange-600/30">
                        LT
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 leading-none uppercase">
                          {settings.companyName || 'LOYALIS TRANS'}
                        </h1>
                        <p className="text-xs font-black text-orange-600 uppercase tracking-widest mt-1">
                          Bordereau & Facture de Transport Bagages
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 pt-1">
                      Service Client : <strong>{settings.phone1}</strong> {settings.phone2 ? `• ${settings.phone2}` : ''} | {settings.address}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-900 text-white p-3 rounded-2xl shadow-md border border-slate-800">
                    {qrCodeUrl && (
                      <div className="bg-white p-1.5 rounded-xl border border-slate-700 shrink-0 text-center flex flex-col items-center">
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code" 
                          className="w-18 h-18 sm:w-20 sm:h-20 rounded-lg object-contain" 
                        />
                        <span className="text-[7.5px] font-mono text-slate-800 font-black uppercase mt-0.5">
                          Suivi Direct
                        </span>
                      </div>
                    )}
                    <div className="text-right space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Bon N°</span>
                      <span className="text-xl font-black font-mono text-orange-400 block">{voucher.trackingNumber}</span>
                      <span className="text-xs text-slate-300 font-bold block">Date : {formatDate(voucher.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-orange-600" />
                    <div>
                      <span className="text-[9.5px] uppercase font-black text-slate-400 block">Itinéraire / Trajet</span>
                      <span className="text-base sm:text-lg font-black text-slate-900 uppercase">
                        {voucher.departureCity || 'Casablanca'} ➔ {voucher.recipient.destination}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-xl border font-black text-xs uppercase ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[9.5px] font-black uppercase text-slate-500 block">Expéditeur</span>
                    <p className="text-sm sm:text-base font-black text-slate-900">{voucher.sender.name}</p>
                    <p className="font-bold text-slate-700">Tél : {voucher.sender.phone}</p>
                    {voucher.sender.cin && <p className="text-slate-600 font-mono">CIN : {voucher.sender.cin}</p>}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-1">
                    <span className="text-[9.5px] font-black uppercase text-orange-800 block">Destinataire</span>
                    <p className="text-sm sm:text-base font-black text-slate-900">{voucher.recipient.name}</p>
                    <p className="font-bold text-slate-700">Tél : {voucher.recipient.phone}</p>
                    <p className="text-orange-950 font-bold">Destination : {voucher.recipient.destination}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-black text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Désignation & Nature Colis</th>
                        <th className="p-2.5 text-center">Quantité</th>
                        <th className="p-2.5 text-center">Poids</th>
                        <th className="p-2.5 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {voucher.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5">
                            <span className="font-black text-slate-900 text-xs sm:text-sm block">{it.nature}</span>
                            {it.notes && <span className="text-slate-500 text-[10.5px] italic">{it.notes}</span>}
                          </td>
                          <td className="p-2.5 text-center font-black text-slate-800">{it.quantity}</td>
                          <td className="p-2.5 text-center font-black text-slate-800">{it.weightKg ? `${it.weightKg} kg` : '-'}</td>
                          <td className="p-2.5 text-right font-black font-mono text-xs sm:text-sm text-slate-900">
                            {it.price ? formatCurrency(it.price, currency) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 text-white flex flex-wrap items-center justify-between gap-4 border border-slate-800">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Articles</span>
                      <span className="text-lg sm:text-xl font-black">{voucher.totalColis} colis</span>
                    </div>
                    <div className="border-l border-slate-800 pl-4 sm:pl-6">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Poids Global</span>
                      <span className="text-lg sm:text-xl font-black">{voucher.totalWeightKg} kg</span>
                    </div>
                    <div className="border-l border-slate-800 pl-4 sm:pl-6">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Règlement</span>
                      <span className="text-xs sm:text-sm font-black text-orange-400 uppercase">{payInfo.label}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Net à Payer</span>
                    <span className="text-2xl sm:text-3xl font-black text-orange-400 font-mono">
                      {formatCurrency(voucher.totalPrice, currency)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="border border-slate-200 rounded-2xl p-3 h-20 flex flex-col justify-between text-xs">
                    <span className="font-bold text-slate-700 text-[11px]">Signature du Client Expéditeur :</span>
                    <span className="text-[9px] text-slate-400 italic">"Reconnais avoir pris connaissance des conditions"</span>
                  </div>
                  <div className="border border-slate-200 rounded-2xl p-3 h-20 flex flex-col justify-between text-right text-xs">
                    <span className="font-bold text-slate-700 text-[11px]">Cachet & Signature Loyalis Trans :</span>
                    <span className="text-xs font-bold text-slate-800">{voucher.agentName || 'Direction Loyalis Trans'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                LAYOUT 3: TICKET COMPACT (80MM)
                ═══════════════════════════════════════════════════════ */}
            {printLayout === 'compact-receipt' && (
              <div className="max-w-[420px] mx-auto border-2 border-slate-900 rounded-2xl p-4 space-y-3 bg-white text-slate-900 font-sans shadow-lg">
                <div className="text-center border-b-2 border-slate-900 pb-2 space-y-0.5">
                  <h2 className="text-lg font-black uppercase text-slate-950">{settings.companyName || 'LOYALIS TRANS'}</h2>
                  <p className="text-[10px] font-bold text-orange-600 uppercase">Transport Express Bagages</p>
                  <p className="text-[10px] text-slate-600">Tél : {settings.phone1 || '+212 600-000000'}</p>
                </div>

                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Bon N° : <strong className="font-mono text-orange-600">{voucher.trackingNumber}</strong></span>
                  <span className="text-slate-500 text-[11px]">{formatDate(voucher.date)}</span>
                </div>

                <div className="bg-slate-100 p-2 rounded-xl text-center text-xs font-black uppercase text-slate-800">
                  {voucher.departureCity || 'Casablanca'} ➔ {voucher.recipient.destination}
                </div>

                <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Expéditeur</span>
                    <span className="font-black text-slate-900">{voucher.sender.name}</span> • {voucher.sender.phone}
                  </div>
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-[9px] text-orange-700 font-bold uppercase block">Destinataire</span>
                    <span className="font-black text-slate-900">{voucher.recipient.name}</span> • {voucher.recipient.phone}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {voucher.items.map((it, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between">
                      <span className="font-bold text-slate-800">{it.quantity}x {it.nature}</span>
                      <span className="font-mono font-bold text-slate-900">{it.price ? formatCurrency(it.price, currency) : '-'}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 text-white p-2.5 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Total ({voucher.totalColis} colis • {voucher.totalWeightKg} kg)</span>
                    <span className="text-base font-black text-orange-400 font-mono">{formatCurrency(voucher.totalPrice, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5 border-t border-slate-800">
                    <span>Règlement :</span>
                    <span className="font-bold text-orange-300 uppercase">{payInfo.label}</span>
                  </div>
                  {payInfo.remaining > 0 && (
                    <div className="text-rose-300 text-[10.5px] font-bold">
                      À payer à l'arrivée : {formatCurrency(payInfo.remaining, currency)}
                    </div>
                  )}
                </div>

                {qrCodeUrl && (
                  <div className="text-center pt-1">
                    <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 mx-auto border border-slate-300 p-1 rounded-xl shadow-xs" />
                    <span className="text-[9px] text-slate-400 block mt-1">Conserver pour le retrait</span>
                  </div>
                )}
              </div>
            )}

            <div className="text-[9.5px] text-slate-400 text-center leading-relaxed border-t border-slate-200 pt-2">
              {settings.termsAndConditions || 'Présentation obligatoire de ce bon ou de son QR code pour le retrait des marchandises. Loyalis Trans décline toute responsabilité pour les articles non déclarés.'}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
