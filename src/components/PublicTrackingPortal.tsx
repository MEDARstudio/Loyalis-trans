import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Truck, 
  FileText, 
  ImageIcon, 
  ZoomIn, 
  X, 
  Download, 
  Lock, 
  AlertCircle, 
  ShieldCheck, 
  ChevronRight, 
  ExternalLink,
  Printer,
  Share2,
  Check,
  QrCode,
  History,
  ArrowRight,
  Coins,
  Camera
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStatus, VoucherPhoto } from '../types';
import { formatCurrency, formatDate, formatDateTime, getPaymentStatusInfo, getStatusBadge, formatValueLabel } from '../utils/formatters';
import { generateVoucherQRDataUrl, getVoucherTrackingUrl, extractTrackingCode } from '../utils/qrGenerator';
import { api } from '../services/api';
import { VoucherQRScannerModal } from './VoucherQRScannerModal';

interface PublicTrackingPortalProps {
  vouchers: Voucher[];
  settings: CompanySettings;
  onOpenLogin: () => void;
  onOpenPrint?: (voucher: Voucher) => void;
  initialTrackingCode?: string;
}

export const PublicTrackingPortal: React.FC<PublicTrackingPortalProps> = ({
  vouchers,
  settings,
  onOpenLogin,
  onOpenPrint,
  initialTrackingCode
}) => {
  const [query, setQuery] = useState<string>(initialTrackingCode || '');
  const [searchedVoucher, setSearchedVoucher] = useState<Voucher | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const currency = settings.currency || 'DH';

  // Perform search by tracking number or QR code content
  const handleSearch = async (searchVal?: string) => {
    const rawInput = (searchVal !== undefined ? searchVal : query).trim();
    if (!rawInput) {
      setSearchedVoucher(null);
      setHasSearched(false);
      return;
    }

    const term = extractTrackingCode(rawInput).toLowerCase();
    setHasSearched(true);
    setIsLoading(true);

    const cleanTermDigits = term.replace(/\D/g, '');

    // 1. Try in-memory vouchers first
    let found = vouchers.find(v => {
      if ((v.trackingNumber || '').toLowerCase() === term) return true;
      if (v.id.toLowerCase() === term) return true;

      const vDigits = String(v.trackingNumber || '').replace(/\D/g, '');
      if (cleanTermDigits && vDigits) {
        if (cleanTermDigits === vDigits) return true;
        if (parseInt(cleanTermDigits, 10) === parseInt(vDigits, 10)) return true;
      }

      if (v.sequenceNumber && String(v.sequenceNumber) === cleanTermDigits) return true;
      return false;
    });

    if (found) {
      setSearchedVoucher(found);
      setIsLoading(false);
      // Fetch latest background update from database to guarantee freshest status
      api.getVoucherById(found.trackingNumber || found.id).then(fresh => {
        if (fresh) setSearchedVoucher(fresh);
      }).catch(() => {});
      return;
    }

    // 2. Fetch directly from server API (PostgreSQL database)
    try {
      const serverVoucher = await api.getVoucherById(term);
      if (serverVoucher) {
        setSearchedVoucher(serverVoucher);
      } else {
        setSearchedVoucher(null);
      }
    } catch {
      setSearchedVoucher(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically trigger search on initial tracking code from URL QR parameter
  useEffect(() => {
    if (initialTrackingCode) {
      setQuery(initialTrackingCode);
      handleSearch(initialTrackingCode);
    }
  }, [initialTrackingCode]);

  // Update voucher if vouchers array is refreshed
  useEffect(() => {
    if (searchedVoucher && vouchers.length > 0) {
      const match = vouchers.find(v => v.id === searchedVoucher.id || v.trackingNumber === searchedVoucher.trackingNumber);
      if (match && JSON.stringify(match) !== JSON.stringify(searchedVoucher)) {
        setSearchedVoucher(match);
      }
    }
  }, [vouchers]);

  // Generate QR code whenever searchedVoucher changes
  useEffect(() => {
    if (searchedVoucher) {
      generateVoucherQRDataUrl(searchedVoucher, { size: 360 }).then(setQrCodeUrl);
    } else {
      setQrCodeUrl('');
    }
  }, [searchedVoucher]);

  // Steps for the journey
  const steps: { key: VoucherStatus; label: string; desc: string }[] = [
    { key: 'EN_ATTENTE', label: 'Pris en charge', desc: 'Enregistré en agence départ' },
    { key: 'EN_TRANSIT', label: 'En transit', desc: 'En cours d\'acheminement routier' },
    { key: 'ARRIVE_AGENCE', label: 'Arrivé en agence', desc: 'Disponible pour retrait immédiat' },
    { key: 'LIVRE', label: 'Livré / Remis', desc: 'Remis en main propre au destinataire' }
  ];

  const getStepIndex = (status: VoucherStatus) => {
    switch (status) {
      case 'EN_ATTENTE': return 0;
      case 'EN_TRANSIT': return 1;
      case 'ARRIVE_AGENCE': return 2;
      case 'LIVRE': return 3;
      case 'ANNULE': return -1;
      default: return 0;
    }
  };

  const currentStepIdx = searchedVoucher ? getStepIndex(searchedVoucher.status) : 0;
  const statusInfo = searchedVoucher ? getStatusBadge(searchedVoucher.status) : null;
  const payInfo = searchedVoucher ? getPaymentStatusInfo(
    searchedVoucher.paymentStatus || searchedVoucher.paymentMethod,
    searchedVoucher.advanceAmount || 0,
    searchedVoucher.totalPrice,
    searchedVoucher.remainingAmount
  ) : null;

  // Status and payment modification history (most recent first)
  const statusHistory = (searchedVoucher?.history || []).filter(h => 
    h.actionType === 'STATUS_CHANGE' || 
    h.actionType === 'PAYMENT_CHANGE' || 
    h.actionType === 'CREATION' ||
    h.changes?.some(c => c.field.toLowerCase().includes('statut'))
  );

  // Extract bon reel photo URL
  const bonReelUrl = searchedVoucher?.bonReelPhoto 
    ? (typeof searchedVoucher.bonReelPhoto === 'string' ? searchedVoucher.bonReelPhoto : searchedVoucher.bonReelPhoto.dataUrl)
    : null;

  // Extract luggage / parcel photos
  const luggagePhotos: { url: string; caption?: string; name?: string }[] = (searchedVoucher?.casePhotos || []).map((p, idx) => {
    if (typeof p === 'string') {
      return { url: p, caption: `Photo colis #${idx + 1}` };
    }
    return { url: p.dataUrl, caption: p.caption || p.name || `Colis #${idx + 1}` };
  }).filter(p => Boolean(p.url));

  const handleShareLink = () => {
    if (!searchedVoucher) return;
    const url = getVoucherTrackingUrl(searchedVoucher);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleShareWhatsApp = () => {
    if (!searchedVoucher) return;
    const url = getVoucherTrackingUrl(searchedVoucher);
    const text = `📦 Suivi officiel Loyalis Trans\nBon N° : ${searchedVoucher.trackingNumber}\nStatut en cours : ${statusInfo?.label || searchedVoucher.status}\nConsultez le suivi en direct ici : ${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      
      {/* ========================================================================= */}
      {/* 1. PUBLIC HEADER                                                          */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        
        {/* Brand */}
        <div 
          className="cursor-pointer select-none flex items-center gap-3"
          onClick={() => {
            setSearchedVoucher(null);
            setHasSearched(false);
            setQuery('');
          }}
        >
          <div className="w-9 h-9 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md shadow-orange-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-black uppercase tracking-tight text-white flex items-center gap-1 leading-none">
              Loyalis <span className="text-orange-500">Trans</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide block mt-1">
              Portail Officiel de Suivi des Expéditions
            </span>
          </div>
        </div>

        {/* Right actions: Scanner + Agent Login */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-xs font-bold text-orange-400 transition-colors cursor-pointer"
            title="Scanner le code QR d'un bon avec votre caméra"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scanner QR</span>
          </button>

          <button
            id="btn-public-agent-login"
            type="button"
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/90 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Accès réservé aux agents Loyalis Trans"
          >
            <Lock className="w-3.5 h-3.5 text-orange-400" />
            <span>Espace Agent</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN SEARCH & RESULTS VIEW                                             */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8 overflow-x-hidden">
        
        {/* Search Hero Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-4">
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 text-xs font-black uppercase tracking-wider max-w-full truncate">
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Suivi en Direct par Code QR ou Numéro de Bon</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white break-words">
            Suivi de votre <span className="text-orange-500">Bon de Transport</span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto font-medium break-words">
            Scannez le code QR unique de votre bon ou saisissez son numéro pour consulter en direct son 
            <strong className="text-orange-400 font-bold"> statut en cours</strong> et ses <strong className="text-orange-400 font-bold">derniers statuts d'acheminement</strong>.
          </p>

          {/* Search Form with QR Scanner Trigger */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="pt-2 max-w-xl mx-auto w-full"
          >
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 shrink-0" />
                <input
                  id="public-tracking-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Numéro de bon (ex: 0000501)..."
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-950 border-2 border-slate-700 focus:border-orange-500 rounded-2xl text-white font-mono text-sm sm:text-base placeholder-slate-500 font-bold focus:outline-none transition-colors shadow-inner"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="absolute right-3.5 top-3 p-1 rounded-lg text-orange-400 hover:text-orange-300 hover:bg-slate-800 transition-colors"
                  title="Scanner le code QR avec votre appareil photo"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-public-tracking-search"
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 sm:flex-initial px-6 py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>Rechercher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-3.5 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-2xl border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Ouvrir la caméra pour scanner le QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* 3. SEARCH RESULTS                                                         */}
        {/* ========================================================================= */}
        {searchedVoucher ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-8 space-y-6 sm:space-y-7 shadow-xl animate-fadeIn max-w-full overflow-hidden">
            
            {/* Header: Voucher Info + Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Bon de Transport N°</span>
                  <span className="font-mono text-xl sm:text-3xl font-black text-orange-500 break-all">
                    #{searchedVoucher.trackingNumber}
                  </span>
                  {statusInfo && (
                    <span className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full border shrink-0 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Expédié le <strong className="text-white">{formatDate(searchedVoucher.date)}</strong> {searchedVoucher.time ? `à ${searchedVoucher.time}` : ''}</span>
                  <span className="text-slate-600">•</span>
                  <span>Trajet : <strong className="text-white">{searchedVoucher.departureCity || 'Casablanca'} ➔ {searchedVoucher.recipient.destination || searchedVoucher.destinationCity}</strong></span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="Copier le lien direct de suivi"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Lien copié !</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-orange-400" />
                      <span>Copier lien</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Partager le suivi sur WhatsApp"
                >
                  <span>WhatsApp</span>
                </button>

                {onOpenPrint && (
                  <button
                    type="button"
                    onClick={() => onOpenPrint(searchedVoucher)}
                    className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer</span>
                  </button>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* STATUT EN COURS OU FINAL (HERO HIGHLIGHT)                                 */}
            {/* ========================================================================= */}
            <div className={`p-5 sm:p-6 rounded-2xl border shadow-xl space-y-4 ${
              searchedVoucher.status === 'LIVRE'
                ? 'bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 border-purple-500/40 text-white'
                : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-800 text-white'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  {searchedVoucher.status === 'LIVRE' ? (
                    <>
                      <span className="w-3 h-3 rounded-full bg-purple-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        <span>Statut Final : Expédition Livrée</span>
                      </h3>
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                        <Truck className="w-4 h-4" />
                        <span>Statut en cours de ce bon</span>
                      </h3>
                    </>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Dernière mise à jour : {searchedVoucher.updatedAt ? formatDateTime(searchedVoucher.updatedAt) : formatDate(searchedVoucher.date)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                
                {/* Grand Badge Statut Actuel */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      searchedVoucher.status === 'LIVRE'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                    }`}>
                      {searchedVoucher.status === 'LIVRE' ? (
                        <CheckCircle2 className="w-6 h-6 text-purple-400" />
                      ) : (
                        <Truck className="w-6 h-6 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <div className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                        <span>{statusInfo?.label}</span>
                        {searchedVoucher.status === 'LIVRE' && (
                          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/40">
                            Livraison Terminée
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">
                        {searchedVoucher.status === 'EN_ATTENTE' && "Votre colis a été pris en charge à l'agence de départ. Il est en cours de tri et préparé pour le prochain départ."}
                        {searchedVoucher.status === 'EN_TRANSIT' && `Votre colis est actuellement en cours d'acheminement routier vers ${searchedVoucher.recipient.destination || searchedVoucher.destinationCity}.`}
                        {searchedVoucher.status === 'ARRIVE_AGENCE' && `Le colis est arrivé à destination (${searchedVoucher.recipient.destination || searchedVoucher.destinationCity}) et est disponible pour retrait immédiat.`}
                        {searchedVoucher.status === 'LIVRE' && "Colis remis en main propre au destinataire. Expédition et livraison finalisées avec succès."}
                        {searchedVoucher.status === 'ANNULE' && "Cette expédition a été annulée par l'agence."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Situation Paiement */}
                {payInfo && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
                      <Coins className="w-3 h-3 text-orange-400" />
                      Situation Paiement
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${payInfo.badgeBg} ${payInfo.badgeText} ${payInfo.badgeBorder}`}>
                        {payInfo.label}
                      </span>
                    </div>
                    {payInfo.type === 'NON_PAYE' && (
                      <p className="text-[11px] font-bold text-rose-400">
                        Montant à régler à la livraison : <strong className="text-white font-mono">{formatCurrency(searchedVoucher.totalPrice, currency)}</strong>
                      </p>
                    )}
                    {payInfo.type === 'AVANCE' && (
                      <p className="text-[11px] font-bold text-blue-400">
                        Reste à régler à la livraison : <strong className="text-white font-mono">{formatCurrency(payInfo.remaining, currency)}</strong>
                      </p>
                    )}
                    {payInfo.type === 'PAYE' && (
                      <p className="text-[11px] font-bold text-emerald-400">
                        Soldé • Rien à régler à l'arrivée
                      </p>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Stepper Timeline Progression */}
            {searchedVoucher.status !== 'ANNULE' ? (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-400" />
                  <span>Progression de l'Acheminement</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {steps.map((step, idx) => {
                    const isDelivered = searchedVoucher.status === 'LIVRE';
                    const isCurrent = !isDelivered && idx === currentStepIdx;
                    const isPast = isDelivered ? idx < 3 : idx < currentStepIdx;
                    const isFinalDeliveredStep = isDelivered && idx === 3;

                    return (
                      <div
                        key={step.key}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isFinalDeliveredStep
                            ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/40 text-purple-200 shadow-md shadow-purple-950/30'
                            : isCurrent
                            ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/30'
                            : isPast
                            ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/20'
                            : 'bg-slate-900/40 border-slate-800/60 opacity-40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isFinalDeliveredStep
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                              : isCurrent
                              ? 'bg-orange-500 text-white animate-pulse'
                              : isPast
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {isFinalDeliveredStep ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isPast ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              idx + 1
                            )}
                          </span>

                          {/* Badge condition: VIOLET pour Livré SANS signe en cours, ORANGE pour étape en cours */}
                          {isFinalDeliveredStep ? (
                            <span className="text-[9px] uppercase font-black text-purple-300 bg-purple-500/25 border border-purple-500/40 px-2 py-0.5 rounded">
                              Livré
                            </span>
                          ) : isCurrent ? (
                            <span className="text-[9px] uppercase font-black text-orange-400 bg-orange-500/20 border border-orange-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping"></span>
                              En cours
                            </span>
                          ) : isPast ? (
                            <span className="text-[9px] uppercase font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              Passé
                            </span>
                          ) : null}
                        </div>
                        <h4 className="text-xs font-bold text-white">{step.label}</h4>
                        <p className={`text-[10px] mt-0.5 ${
                          isFinalDeliveredStep
                            ? 'text-purple-300/80 font-medium'
                            : isPast
                            ? 'text-emerald-300/80'
                            : 'text-slate-400'
                        }`}>
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>Ce bon de transport a été annulé. Veuillez contacter l'agence Loyalis Trans.</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TRAÇABILITÉ OFFICIELLE CLIENT (Sans motifs internes d'administration)     */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-white block">Traçabilité Officielle Loyalis Trans</span>
                  <span className="text-slate-400 text-[11px]">
                    Expédition N° <strong className="text-white font-mono">#{searchedVoucher.trackingNumber}</strong> • Enregistrée le {formatDate(searchedVoucher.date)} {searchedVoucher.time ? `à ${searchedVoucher.time}` : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 italic">
                  Historique détaillé et motifs d'audit réservés à l'administration
                </span>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] border border-slate-700 transition-colors cursor-pointer"
                >
                  Accès Admin
                </button>
              </div>
            </div>

            {/* Route & Sender/Receiver Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Expéditeur & Ville départ */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                    Départ
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {searchedVoucher.departureCity || 'Casablanca'}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-bold text-white">{searchedVoucher.sender.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{searchedVoucher.sender.phone}</span>
                  </div>
                </div>
              </div>

              {/* Destinataire & Ville destination */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Arrivée / Agence Retrait
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {searchedVoucher.recipient.destination || searchedVoucher.destinationCity}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="text-sm font-bold text-white">{searchedVoucher.recipient.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{searchedVoucher.recipient.phone}</span>
                  </div>
                </div>
              </div>

              {/* QR Code Unique du bon */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                    Code QR Unique
                  </span>
                  <div className="text-xs font-bold text-white">
                    Scan direct mobile
                  </div>
                  <div className="text-[10px] text-slate-400">
                    N° {searchedVoucher.trackingNumber}
                  </div>
                </div>
                {qrCodeUrl ? (
                  <div className="bg-white p-1 rounded-xl shrink-0">
                    <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-800 animate-pulse rounded-xl" />
                )}
              </div>

            </div>

            {/* ========================================================================= */}
            {/* 4. ÉLÉMENTS DE BAGAGES (LUGGAGE ITEMS LIST)                                */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-orange-400" />
                  <span>Éléments de Bagages Transportés</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  Total : <strong className="text-white">{searchedVoucher.totalColis}</strong> colis • <strong className="text-white">{searchedVoucher.totalWeightKg}</strong> kg
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 max-w-full">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Nature du bagage</th>
                      <th className="py-2.5 px-3 text-center">Quantité</th>
                      <th className="py-2.5 px-3 text-right">Poids (kg)</th>
                      <th className="py-2.5 px-3">Observations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
                    {searchedVoucher.items && searchedVoucher.items.length > 0 ? (
                      searchedVoucher.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{item.nature}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-orange-400">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{item.weightKg ? `${item.weightKg} kg` : '-'}</td>
                          <td className="py-2.5 px-3 text-slate-400 italic">{item.notes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-3 px-3 text-center text-slate-500">
                          Colis standard enregistré ({searchedVoucher.totalColis} colis, {searchedVoucher.totalWeightKg} kg)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. IMAGE DU BON MANUSCRIT (HANDWRITTEN VOUCHER PHOTO)                      */}
            {/* ========================================================================= */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <span>Image du Bon Manuscrit Original</span>
                </h3>
                {bonReelUrl && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Document Numérisé
                  </span>
                )}
              </div>

              {bonReelUrl ? (
                <div className="p-4 rounded-2xl bg-slate-950/70 border-2 border-orange-500/30 space-y-3">
                  <div 
                    className="relative rounded-xl overflow-hidden bg-slate-900 cursor-pointer group max-h-96 flex items-center justify-center border border-slate-800"
                    onClick={() => setZoomPhoto({ url: bonReelUrl, title: `Bon Manuscrit N° ${searchedVoucher.trackingNumber}` })}
                  >
                    <img 
                      src={bonReelUrl} 
                      alt={`Bon manuscrit ${searchedVoucher.trackingNumber}`}
                      className="w-full h-auto max-h-96 object-contain group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
                        <ZoomIn className="w-4 h-4" />
                        <span>Agrandir en plein écran</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Bon réel papier rempli et signé en agence</span>
                    <button
                      type="button"
                      onClick={() => setZoomPhoto({ url: bonReelUrl, title: `Bon Manuscrit N° ${searchedVoucher.trackingNumber}` })}
                      className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Voir en grand</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-1.5">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-400">Bon manuscrit en cours de numérisation</div>
                  <div className="text-[11px] text-slate-500">
                    Le document papier original sera scanné et attaché au suivi dès traitement complet à l'agence.
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 6. IMAGES DES BAGAGES & COLIS                                             */}
            {/* ========================================================================= */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  <span>Photos des Bagages Enregistrés</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {luggagePhotos.length} photo(s)
                </span>
              </div>

              {luggagePhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {luggagePhotos.map((photo, pIdx) => (
                    <div
                      key={pIdx}
                      className="group relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square cursor-pointer"
                      onClick={() => setZoomPhoto({ url: photo.url, title: photo.caption || `Bagage #${pIdx + 1}` })}
                    >
                      <img 
                        src={photo.url} 
                        alt={photo.caption || `Colis ${pIdx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                        <span className="text-[11px] font-bold text-white truncate">
                          {photo.caption || `Colis #${pIdx + 1}`}
                        </span>
                        <span className="text-[9px] text-orange-400 flex items-center gap-1 mt-0.5">
                          <ZoomIn className="w-3 h-3" />
                          <span>Cliquer pour zoomer</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 text-center space-y-1.5">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-400">Aucune photo de bagage enregistrée</div>
                  <div className="text-[11px] text-slate-500">
                    Les photos des bagages sont prises à l'agence lors de cas spécifiques ou vérifications d'emballage.
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchedVoucher(null);
                  setHasSearched(false);
                  setQuery('');
                }}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Rechercher un autre bon
              </button>

              {settings.phone1 && (
                <a
                  href={`tel:${settings.phone1.replace(/\s+/g, '')}`}
                  className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Besoin d'aide ? Appelez l'agence : {settings.phone1}</span>
                </a>
              )}
            </div>

          </div>
        ) : hasSearched && !isLoading ? (
          /* Not found card */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Aucun bon de transport trouvé</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Vérifiez le numéro de bon saisi ou scanné (ex: <strong className="text-orange-400 font-mono">0000501</strong>). 
              Si votre bon vient d'être émis en agence, il sera consultable d'ici quelques instants.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scanner le code QR</span>
              </button>
            </div>
          </div>
        ) : null}

      </main>

      {/* ========================================================================= */}
      {/* 4. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500 space-y-1">
        <div className="font-bold text-slate-400">
          {settings.companyName || 'Loyalis Trans SARL'} — Transport & Messagerie Express
        </div>
        <div>
          {settings.address || 'Gare Routière / Agence Principale'}
          {settings.phone1 && ` • Tél : ${settings.phone1}`}
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. FULL-SCREEN PHOTO LIGHTBOX / MODAL                                     */}
      {/* ========================================================================= */}
      {zoomPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
            <span className="text-sm font-black uppercase tracking-wider text-orange-400">
              {zoomPhoto.title}
            </span>
            <button
              onClick={() => setZoomPhoto(null)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            className="relative max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={zoomPhoto.url} 
              alt={zoomPhoto.title} 
              className="w-auto h-auto max-h-[75vh] max-w-full object-contain mx-auto"
            />
          </div>

          <div className="pt-3 flex items-center gap-3">
            <a
              href={zoomPhoto.url}
              download={`${zoomPhoto.title.replace(/\s+/g, '_')}.jpg`}
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger l'image</span>
            </a>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CAMERA QR SCANNER MODAL                                                */}
      {/* ========================================================================= */}
      <VoucherQRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setQuery(scannedCode);
          handleSearch(scannedCode);
        }}
      />

    </div>
  );
};
