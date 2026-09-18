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
  Check
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStatus, VoucherPhoto } from '../types';
import { formatCurrency, formatDate, getStatusBadge } from '../utils/formatters';

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
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const currency = settings.currency || 'DH';

  // Perform search by tracking number only (or numeric sequence)
  const handleSearch = (searchVal?: string) => {
    const term = (searchVal !== undefined ? searchVal : query).trim().toLowerCase();
    setHasSearched(true);

    if (!term) {
      setSearchedVoucher(null);
      return;
    }

    const cleanTermDigits = term.replace(/\D/g, '');

    const found = vouchers.find(v => {
      // 1. Exact match on trackingNumber (e.g. "0000501" or "lt-0000501")
      if (v.trackingNumber.toLowerCase() === term) return true;

      // 2. Numeric sequence match (e.g. typing "501" matches "0000501")
      const vDigits = String(v.trackingNumber || '').replace(/\D/g, '');
      if (cleanTermDigits && vDigits) {
        if (cleanTermDigits === vDigits) return true;
        if (parseInt(cleanTermDigits, 10) === parseInt(vDigits, 10)) return true;
      }

      if (v.sequenceNumber && String(v.sequenceNumber) === cleanTermDigits) return true;

      return false;
    });

    setSearchedVoucher(found || null);
  };

  useEffect(() => {
    if (initialTrackingCode) {
      setQuery(initialTrackingCode);
      handleSearch(initialTrackingCode);
    }
  }, [initialTrackingCode, vouchers]);

  // Steps for the journey
  const steps: { key: VoucherStatus; label: string; desc: string }[] = [
    { key: 'EN_ATTENTE', label: 'Pris en charge', desc: 'Enregistré en agence départ' },
    { key: 'EN_TRANSIT', label: 'En transit', desc: 'En cours d\'acheminement routier' },
    { key: 'ARRIVE_AGENCE', label: 'Arrivé en agence', desc: 'Disponible pour retrait' },
    { key: 'LIVRE', label: 'Livré / Remis', desc: 'Remis au destinataire' }
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
    const url = `${window.location.origin}${window.location.pathname}?track=${searchedVoucher.trackingNumber}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      
      {/* ========================================================================= */}
      {/* 1. PUBLIC HEADER (Simple, Elegant & Clean with discrete Agent Login)      */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        
        {/* Brand */}
        <div 
          className="cursor-pointer select-none"
          onClick={() => {
            setSearchedVoucher(null);
            setHasSearched(false);
            setQuery('');
          }}
        >
          <span className="text-base font-black uppercase tracking-tight text-white flex items-center gap-1 leading-none">
            Loyalis <span className="text-orange-500">Trans</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide block mt-1">
            Portail Public de Suivi des Bagages
          </span>
        </div>

        {/* Right action: Discrete Agent / Admin Login */}
        <button
          id="btn-public-agent-login"
          type="button"
          onClick={onOpenLogin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/90 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer shadow-xs"
          title="Accès réservé aux agents et gestionnaires Loyalis Trans"
        >
          <Lock className="w-3.5 h-3.5 text-orange-400" />
          <span>Espace Agent</span>
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN SINGLE-PAGE PUBLIC SEARCH & RESULTS                               */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-5 sm:py-10 space-y-6 sm:space-y-8 overflow-x-hidden">
        
        {/* Search Hero Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-4">
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 text-xs font-black uppercase tracking-wider max-w-full truncate">
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Suivi des Bagages en Temps Réel</span>
          </div>

          <h1 className="text-xl sm:text-4xl font-black uppercase tracking-tight text-white break-words">
            Suivez votre <span className="text-orange-500">Bon de Transport</span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto font-medium break-words">
            Entrez uniquement le numéro de votre bon d'expédition pour consulter l'acheminement, 
            les bagages enregistrés et les photos.
          </p>

          {/* Search Form */}
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
                  placeholder="Numéro de votre bon (ex: 00000)..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border-2 border-slate-700 focus:border-orange-500 rounded-2xl text-white font-mono text-sm sm:text-base placeholder-slate-500 font-bold focus:outline-none transition-colors shadow-inner"
                  autoFocus
                />
              </div>

              <button
                id="btn-public-tracking-search"
                type="submit"
                className="w-full sm:w-auto px-6 py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
                <span>Rechercher</span>
              </button>
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
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Bon N°</span>
                  <span className="font-mono text-xl sm:text-3xl font-black text-white break-all">
                    {searchedVoucher.trackingNumber}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border shrink-0 ${getStatusBadge(searchedVoucher.status).bg} ${getStatusBadge(searchedVoucher.status).text} ${getStatusBadge(searchedVoucher.status).border}`}>
                    {getStatusBadge(searchedVoucher.status).label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Expédié le {formatDate(searchedVoucher.date)} {searchedVoucher.time ? `à ${searchedVoucher.time}` : ''}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenPrint && (
                  <button
                    onClick={() => onOpenPrint(searchedVoucher)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-orange-400" />
                    <span>Imprimer</span>
                  </button>
                )}

                <button
                  onClick={handleShareLink}
                  className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Lien Copié !</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Partager</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Journey Timeline Progression */}
            {searchedVoucher.status !== 'ANNULE' ? (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-400" />
                  <span>Statut & Progression de l'Acheminement</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {steps.map((step, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <div
                        key={step.key}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/30'
                            : isDone
                            ? 'bg-slate-800/80 border-slate-700'
                            : 'bg-slate-900/40 border-slate-800/60 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isCurrent
                              ? 'bg-orange-500 text-white animate-pulse'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {isDone && !isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] uppercase font-black text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
                              Actuel
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white">{step.label}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{step.desc}</p>
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

            {/* Route & Sender/Receiver Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
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
            {/* 6. IMAGES DES BAGAGES & COLIS (LUGGAGE PHOTOS)                            */}
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
        ) : hasSearched ? (
          /* Not found card */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Aucun bon de transport trouvé</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Vérifiez le numéro de bon saisi sur votre ticket ou reçu (ex: <strong className="text-orange-400 font-mono">00000</strong>). 
              Si votre bon vient d'être émis, il sera consultable d'ici quelques instants.
            </p>
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

    </div>
  );
};
