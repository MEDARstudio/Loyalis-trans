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
  DollarSign
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStatus } from '../types';
import { formatCurrency, formatDate, getPaymentMethodLabel, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';
import { generateVoucherQRDataUrl } from '../utils/qrGenerator';

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
  const currency = settings.currency || 'DH';

  const handleSearch = (searchVal?: string) => {
    const term = (searchVal !== undefined ? searchVal : query).trim().toLowerCase();
    setSearched(true);

    if (!term) {
      setMatchedVoucher(null);
      return;
    }

    const found = vouchers.find(v =>
      v.trackingNumber.toLowerCase() === term ||
      v.sender.phone.includes(term) ||
      v.recipient.phone.includes(term) ||
      v.sender.cin?.toLowerCase() === term ||
      v.id === term
    );

    setMatchedVoucher(found || null);
  };

  useEffect(() => {
    if (initialTrackingCode) {
      setQuery(initialTrackingCode);
      handleSearch(initialTrackingCode);
    }
  }, [initialTrackingCode, vouchers]);

  useEffect(() => {
    if (matchedVoucher) {
      generateVoucherQRDataUrl(matchedVoucher).then(setQrCodeUrl);
    }
  }, [matchedVoucher]);

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
            Saisissez le code de suivi à 7 chiffres (ex: <strong className="text-orange-400 font-mono font-bold">#0000001</strong>) ou le numéro de téléphone
          </p>

          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="pt-2">
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Numéro de suivi (ex: 0000001)..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border-2 border-slate-700 rounded-2xl text-white font-mono text-base placeholder-slate-500 focus:outline-none focus:border-orange-500 font-bold tracking-wider"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Rechercher</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results Container */}
      {matchedVoucher ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-8 animate-fadeIn">
          
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bon de Transport N°</span>
                <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                  {matchedVoucher.trackingNumber}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(matchedVoucher.status).bg} ${getStatusBadge(matchedVoucher.status).text} ${getStatusBadge(matchedVoucher.status).border}`}>
                  {getStatusBadge(matchedVoucher.status).label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Expédié le {formatDate(matchedVoucher.date)} {matchedVoucher.time ? `à ${matchedVoucher.time}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenPrint(matchedVoucher)}
                className="px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center gap-2 border border-orange-200 dark:border-orange-900/60"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / PDF</span>
              </button>

              <button
                onClick={() => onOpenShare(matchedVoucher)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </button>
            </div>
          </div>

          {/* Stepper Timeline Progress */}
          {matchedVoucher.status !== 'ANNULE' ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Progression de l'Acheminement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                {steps.map((step, idx) => {
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div
                      key={step.key}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500 ring-2 ring-orange-500/20'
                          : isDone
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                          : 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCurrent
                            ? 'bg-orange-600 text-white animate-pulse'
                            : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {isDone && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 dark:bg-orange-950 px-2 py-0.5 rounded">
                            En cours
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{step.label}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
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
                Destination : {matchedVoucher.recipient.destination}
              </p>
              {matchedVoucher.recipient.address && (
                <p className="text-xs text-slate-500">{matchedVoucher.recipient.address}</p>
              )}
            </div>

            {/* Colis Summary & QR */}
            {(() => {
              const payInfo = getPaymentStatusInfo(
                matchedVoucher.paymentStatus || matchedVoucher.paymentMethod,
                matchedVoucher.advanceAmount || 0,
                matchedVoucher.totalPrice,
                matchedVoucher.remainingAmount
              );
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
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${payInfo.badgeBg} ${payInfo.badgeText} ${payInfo.badgeBorder}`}>
                        {payInfo.label}
                      </span>
                      {payInfo.remaining > 0 && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          (Reste : {formatCurrency(payInfo.remaining, currency)})
                        </span>
                      )}
                    </div>
                  </div>

                  {qrCodeUrl && (
                    <div className="bg-white p-1.5 rounded-xl border border-orange-200 shadow-sm shrink-0">
                      <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16" />
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
            Vérifiez l'orthographe du numéro de suivi (ex: 0000001) ou recherchez avec le numéro de téléphone.
          </p>
        </div>
      ) : null}

    </div>
  );
};
