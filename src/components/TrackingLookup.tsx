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
  Printer, 
  Share2, 
  AlertCircle,
  QrCode,
  DollarSign,
  History,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Coins,
  Camera
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStatus } from '../types';
import { formatCurrency, formatDate, formatDateTime, getPaymentMethodLabel, getPaymentStatusInfo, getStatusBadge, formatValueLabel } from '../utils/formatters';
import { generateVoucherQRDataUrl, getVoucherTrackingUrl, extractTrackingCode } from '../utils/qrGenerator';
import { api } from '../services/api';
import { VoucherQRScannerModal } from './VoucherQRScannerModal';

interface TrackingLookupProps {
  vouchers: Voucher[];
  settings: CompanySettings;
  onOpenPrint: (voucher: Voucher) => void;
  onOpenShare: (voucher: Voucher) => void;
  initialTrackingCode?: string;
}

export const TrackingLookup: React.FC<TrackingLookupProps> = ({
  vouchers,
  settings,
  onOpenPrint,
  onOpenShare,
  initialTrackingCode
}) => {
  const [query, setQuery] = useState<string>(initialTrackingCode || '');
  const [matchedVoucher, setMatchedVoucher] = useState<Voucher | null>(null);
  const [searched, setSearched] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const currency = settings.currency || 'DH';

  const handleSearch = (searchVal?: string) => {
    const rawTerm = (searchVal !== undefined ? searchVal : query).trim();
    if (!rawTerm) {
      setSearched(true);
      setMatchedVoucher(null);
      return;
    }

    const term = extractTrackingCode(rawTerm).toLowerCase();
    setSearched(true);

    const cleanTermDigits = term.replace(/\D/g, '');

    const found = vouchers.find(v => {
      if ((v.trackingNumber || '').toLowerCase() === term) return true;
      if (v.id.toLowerCase() === term || v.id === rawTerm) return true;
      const vDigits = String(v.trackingNumber || '').replace(/\D/g, '');
      if (cleanTermDigits && vDigits) {
        if (cleanTermDigits === vDigits) return true;
        if (parseInt(cleanTermDigits, 10) === parseInt(vDigits, 10)) return true;
      }
      if (v.sequenceNumber && String(v.sequenceNumber) === cleanTermDigits) return true;
      if ((v.sender?.phone || '').includes(term)) return true;
      if ((v.recipient?.phone || '').includes(term)) return true;
      if ((v.sender?.cin || '').toLowerCase() === term) return true;
      return false;
    });

    if (found) {
      setMatchedVoucher(found);
      // Background fresh fetch to guarantee latest status
      api.getVoucherById(found.trackingNumber || found.id).then(fresh => {
        if (fresh) setMatchedVoucher(fresh);
      }).catch(() => {});
    } else {
      // Async API lookup if not in memory
      api.getVoucherById(term).then(res => {
        if (res) setMatchedVoucher(res);
        else setMatchedVoucher(null);
      }).catch(() => {
        setMatchedVoucher(null);
      });
    }
  };

  useEffect(() => {
    if (initialTrackingCode) {
      setQuery(initialTrackingCode);
      handleSearch(initialTrackingCode);
    }
  }, [initialTrackingCode, vouchers]);

  useEffect(() => {
    if (matchedVoucher) {
      generateVoucherQRDataUrl(matchedVoucher, { size: 400 }).then(setQrCodeUrl);
    }
  }, [matchedVoucher]);

  const handleCopyLink = () => {
    if (!matchedVoucher || typeof window === 'undefined') return;
    const trackingUrl = `${window.location.origin}/?track=${encodeURIComponent(matchedVoucher.trackingNumber)}`;
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {});
  };

  // Timeline steps
  const steps: { key: VoucherStatus; label: string; desc: string }[] = [
    { key: 'EN_ATTENTE', label: 'Pris en charge', desc: 'Enregistré en agence départ' },
    { key: 'EN_TRANSIT', label: 'En transit', desc: 'En cours d\'acheminement routier' },
    { key: 'ARRIVE_AGENCE', label: 'Arrivé en agence', desc: 'Disponible pour retrait' },
    { key: 'LIVRE', label: 'Livré / Remis', desc: 'Colis remis au destinataire' }
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

  const currentStepIdx = matchedVoucher ? getStepIndex(matchedVoucher.status) : 0;
  const statusInfo = matchedVoucher ? getStatusBadge(matchedVoucher.status) : null;
  const payInfo = matchedVoucher ? getPaymentStatusInfo(
    matchedVoucher.paymentStatus || matchedVoucher.paymentMethod,
    matchedVoucher.advanceAmount || 0,
    matchedVoucher.totalPrice,
    matchedVoucher.remainingAmount
  ) : null;

  // Filter history events that are relevant to status changes
  const statusHistory = (matchedVoucher?.history || []).filter(h => 
    h.actionType === 'STATUS_CHANGE' || 
    h.actionType === 'PAYMENT_CHANGE' || 
    h.actionType === 'CREATION' ||
    h.changes?.some(c => c.field.toLowerCase().includes('statut'))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Search Header Banner */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border-b-4 border-orange-500 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest">
            <Truck className="w-3.5 h-3.5" />
            Suivi des Expéditions en Direct
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic">
            Suivi Rapide Loyalis <span className="text-orange-500">Trans</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Scannez le code QR d'un bon ou saisissez son numéro pour consulter en temps réel son <strong className="text-orange-400 font-bold">statut en cours</strong> et ses <strong className="text-orange-400 font-bold">derniers statuts d'acheminement</strong>.
          </p>

          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="pt-2">
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Numéro de votre bon (ex: 0000501)..."
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-950 border-2 border-slate-700 rounded-2xl text-white font-mono text-base placeholder-slate-500 focus:outline-none focus:border-orange-500 font-bold tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="absolute right-3.5 top-3 p-1 rounded-lg text-orange-400 hover:text-orange-300 hover:bg-slate-800 transition-colors"
                  title="Scanner le code QR avec votre caméra"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
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
      </div>

      {/* Results Container */}
      {matchedVoucher ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-7 animate-fadeIn">
          
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bon de Transport N°</span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">
                  #{matchedVoucher.trackingNumber}
                </span>
                {statusInfo && (
                  <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                    {statusInfo.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>Expédié le <strong className="text-slate-800 dark:text-slate-200">{formatDate(matchedVoucher.date)}</strong></span>
                {matchedVoucher.time && <span>à {matchedVoucher.time}</span>}
                <span>• Trajet : <strong className="text-slate-800 dark:text-slate-200">{matchedVoucher.departureCity || 'Casablanca'} ➔ {matchedVoucher.recipient.destination || matchedVoucher.destinationCity}</strong></span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Copier le lien direct de suivi"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Lien copié !' : 'Copier lien'}</span>
              </button>

              <button
                onClick={() => onOpenPrint(matchedVoucher)}
                className="px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center gap-1.5 border border-orange-200 dark:border-orange-900/60 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>

              <button
                onClick={() => onOpenShare(matchedVoucher)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STATUT EN COURS : HERO HIGHLIGHT                                          */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-orange-400">
                  Statut en cours de ce bon
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Dernière mise à jour : {matchedVoucher.updatedAt ? formatDateTime(matchedVoucher.updatedAt) : formatDate(matchedVoucher.date)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              
              {/* Grand Badge Statut Actuel */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                      {statusInfo?.label}
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {matchedVoucher.status === 'EN_ATTENTE' && "Votre colis a été pris en charge à l'agence de départ. Il est en cours de tri et préparé pour le prochain départ."}
                      {matchedVoucher.status === 'EN_TRANSIT' && `Votre colis est actuellement en cours d'acheminement routier vers ${matchedVoucher.recipient.destination || matchedVoucher.destinationCity}.`}
                      {matchedVoucher.status === 'ARRIVE_AGENCE' && `Le colis est arrivé à destination (${matchedVoucher.recipient.destination || matchedVoucher.destinationCity}) et est prêt pour retrait immédiat.`}
                      {matchedVoucher.status === 'LIVRE' && "Colis remis au destinataire. Expédition finalisée avec succès."}
                      {matchedVoucher.status === 'ANNULE' && "Cette expédition a été annulée par l'agence."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Situation Paiement & Reste à percevoir */}
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
                      Montant à percevoir à la livraison : <strong className="text-white font-mono">{formatCurrency(matchedVoucher.totalPrice, currency)}</strong>
                    </p>
                  )}
                  {payInfo.type === 'AVANCE' && (
                    <p className="text-[11px] font-bold text-blue-400">
                      Reste à régler à la livraison : <strong className="text-white font-mono">{formatCurrency(payInfo.remaining, currency)}</strong>
                    </p>
                  )}
                  {payInfo.type === 'PAYE' && (
                    <p className="text-[11px] font-bold text-emerald-400">
                      Soldé • Rien à payer à l'arrivée
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Stepper Timeline Progress */}
          {matchedVoucher.status !== 'ANNULE' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-orange-500" />
                <span>Progression de l'Acheminement</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative">
                {steps.map((step, idx) => {
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div
                      key={step.key}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500 ring-2 ring-orange-500/20'
                          : isDone
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                          : 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCurrent
                            ? 'bg-orange-600 text-white animate-pulse'
                            : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {isDone && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] uppercase font-black text-orange-600 bg-orange-100 dark:bg-orange-950 px-2 py-0.5 rounded">
                            En cours
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{step.label}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Ce bon de bagages a été annulé.</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DERNIERS STATUTS & HISTORIQUE COMPLET D'ACHEMINEMENT                      */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Derniers statuts & Historique d'acheminement ({statusHistory.length || 1})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Horodatage officiel et traçabilité
              </span>
            </div>

            <div className="space-y-2.5">
              {/* If history entries exist */}
              {statusHistory.length > 0 ? (
                statusHistory.map((hist, hIdx) => (
                  <div 
                    key={hist.id || hIdx}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {hist.title || 'Mise à jour du bon'}
                        </span>
                        {hist.actionType && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {hist.actionType === 'STATUS_CHANGE' ? 'Statut' : hist.actionType === 'PAYMENT_CHANGE' ? 'Paiement' : 'Événement'}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {hist.dateFormatted || formatDateTime(hist.timestamp)}
                      </span>
                    </div>

                    {hist.changes && hist.changes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                        {hist.changes.map((c, cIdx) => (
                          <span key={cIdx} className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px]">
                            <strong className="text-slate-700 dark:text-slate-300">{c.field} :</strong>
                            <span className="text-rose-600 line-through">{formatValueLabel(c.field, c.oldValue)}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-emerald-600 font-bold">{formatValueLabel(c.field, c.newValue)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {hist.motif && (
                      <p className="text-[11px] text-slate-500 italic">
                        Note : {hist.motif}
                      </p>
                    )}
                  </div>
                ))
              ) : null}

              {/* Initial Creation Milestone Always Displayed */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Prise en charge & Création initiale du bon
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Enregistré
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(matchedVoucher.date)} {matchedVoucher.time ? `à ${matchedVoucher.time}` : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Enregistré à l'agence de départ ({matchedVoucher.departureCity || 'Casablanca'}) pour destination {matchedVoucher.recipient.destination || matchedVoucher.destinationCity} {matchedVoucher.createdByAgent ? `par l'agent ${matchedVoucher.createdByAgent}` : ''}.
                </p>
              </div>

            </div>
          </div>

          {/* Sender / Receiver / Luggage Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Expéditeur */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block">Expéditeur</span>
              <p className="font-bold text-slate-900 dark:text-white">{matchedVoucher.sender.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Tél : {matchedVoucher.sender.phone}</p>
              {matchedVoucher.sender.cin && (
                <p className="text-xs text-slate-500 font-mono">CIN : {matchedVoucher.sender.cin}</p>
              )}
              <p className="text-xs text-slate-500">Départ : {matchedVoucher.departureCity || 'Casablanca'}</p>
            </div>

            {/* Destinataire */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block">Destinataire</span>
              <p className="font-bold text-slate-900 dark:text-white">{matchedVoucher.recipient.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Tél : {matchedVoucher.recipient.phone}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                Destination : {matchedVoucher.recipient.destination || matchedVoucher.destinationCity}
              </p>
              {matchedVoucher.recipient.address && (
                <p className="text-xs text-slate-500">{matchedVoucher.recipient.address}</p>
              )}
            </div>

            {/* Colis Summary & QR */}
            {(() => {
              return (
                <div className="bg-orange-50/70 dark:bg-orange-950/30 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300 block">
                      Règlement & Colis
                    </span>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {matchedVoucher.totalColis} <span className="text-xs font-normal text-slate-500">colis</span> • {matchedVoucher.totalWeightKg} kg
                    </p>
                    <p className="text-sm font-black text-orange-600 dark:text-orange-400 mt-0.5">
                      Total : {formatCurrency(matchedVoucher.totalPrice, currency)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {payInfo && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${payInfo.badgeBg} ${payInfo.badgeText} ${payInfo.badgeBorder}`}>
                          {payInfo.label}
                        </span>
                      )}
                      {payInfo && payInfo.remaining > 0 && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          (Reste : {formatCurrency(payInfo.remaining, currency)})
                        </span>
                      )}
                    </div>
                  </div>

                  {qrCodeUrl && (
                    <div className="bg-white p-1.5 rounded-xl border border-orange-200 shadow-sm shrink-0 text-center">
                      <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                      <span className="text-[8px] font-mono text-slate-600 font-bold block mt-0.5">Code QR</span>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Items breakdown list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Détail des Bagages Transportés
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-2">
              {matchedVoucher.items.map((item, idx) => (
                <div key={item.id || idx} className="py-2.5 px-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{item.nature}</span>
                      {item.notes && <span className="text-slate-500 ml-2">({item.notes})</span>}
                    </div>
                  </div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">
                    {item.quantity} pièce(s) • {item.weightKg ? `${item.weightKg} kg` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : searched ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aucun bon trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Vérifiez le numéro de suivi scanné sur le code QR (ex: 0000501) ou recherchez avec votre numéro de téléphone.
          </p>
        </div>
      ) : null}

      {/* Camera QR Scanner Modal */}
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
