import React, { useState, useMemo } from 'react';
import { 
  History, 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  TrendingUp, 
  DollarSign, 
  Coins, 
  CreditCard, 
  Truck, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Package, 
  Scale, 
  User, 
  MapPin, 
  Phone, 
  Eye, 
  MessageSquare, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Camera,
  Layers,
  FileText
} from 'lucide-react';
import { CompanySettings, ExternalPaymentStatus, Voucher, VoucherStatus } from '../types';
import { formatCurrency, formatDate, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';
import { VoucherPhotoViewerModal } from './VoucherPhotoViewerModal';
import { MonthlyStatementPDFModal } from './MonthlyStatementPDFModal';
import { generateStatementVectorPDF } from '../utils/monthlyStatementPDF';

interface HistoryStatementsViewProps {
  vouchers: Voucher[];
  settings: CompanySettings;
  onOpenDetail: (voucher: Voucher) => void;
  onOpenEdit: (voucher: Voucher) => void;
  onUpdatePayment: (id: string, paymentStatus: 'PAYE' | 'NON_PAYE' | 'AVANCE', advanceAmount?: number) => void;
  onUpdateVoucher: (voucher: Voucher) => void;
  onOpenExcelExport: () => void;
}

type PeriodFilter = 'TODAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM';
type SubViewTab = 'ALL_JOURNAL' | 'EXTERNAL_SUBCONTRACTING' | 'RECEIVABLES' | 'PRINTABLE_STATEMENT';
type TransportFilter = 'ALL' | 'INTERNAL' | 'EXTERNAL';

export const HistoryStatementsView: React.FC<HistoryStatementsViewProps> = ({
  vouchers,
  settings,
  onOpenDetail,
  onOpenEdit,
  onUpdatePayment,
  onUpdateVoucher,
  onOpenExcelExport
}) => {
  const currency = settings.currency || 'DH';

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<SubViewTab>('ALL_JOURNAL');

  // Filters State
  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [transportFilter, setTransportFilter] = useState<TransportFilter>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [destinationFilter, setDestinationFilter] = useState<string>('ALL');
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('ALL');

  // Photo viewer state
  const [photoViewerVoucher, setPhotoViewerVoucher] = useState<Voucher | null>(null);

  // Monthly Statement PDF modal state
  const [isMonthlyPDFModalOpen, setIsMonthlyPDFModalOpen] = useState<boolean>(false);
  const [isExportingPeriodPDF, setIsExportingPeriodPDF] = useState<boolean>(false);

  // Date range calculation helpers
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'TODAY') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (period === '7DAYS') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return { startDate: past.toISOString().split('T')[0], endDate: todayStr };
    }
    if (period === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { startDate: firstDay, endDate: todayStr };
    }
    if (period === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { startDate: firstDay, endDate: lastDay };
    }
    if (period === 'THIS_YEAR') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { startDate: firstDay, endDate: todayStr };
    }
    if (period === 'CUSTOM') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return { startDate: '', endDate: '' };
  }, [period, customStartDate, customEndDate]);

  // Filtered Vouchers list
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      // 1. Date Range
      if (startDate && v.date < startDate) return false;
      if (endDate && v.date > endDate) return false;

      // 2. Transport Mode
      if (transportFilter === 'INTERNAL' && v.isExternalTransport) return false;
      if (transportFilter === 'EXTERNAL' && !v.isExternalTransport) return false;

      // 3. Carrier Specific
      if (selectedCarrierFilter !== 'ALL') {
        if (!v.isExternalTransport || (v.externalCarrierName || '').toLowerCase() !== selectedCarrierFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Payment Status
      if (paymentFilter !== 'ALL') {
        const pStatus = v.paymentStatus || v.paymentMethod;
        if (paymentFilter === 'PAYE' && pStatus !== 'PAYE') return false;
        if (paymentFilter === 'NON_PAYE' && pStatus !== 'NON_PAYE') return false;
        if (paymentFilter === 'AVANCE' && pStatus !== 'AVANCE') return false;
        if (paymentFilter === 'UNPAID_CARRIER' && (!v.isExternalTransport || v.externalPaymentStatus !== 'UNPAID')) return false;
      }

      // 5. Parcel Status
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;

      // 6. Destination
      if (destinationFilter !== 'ALL') {
        const dest = v.recipient?.destination || v.destinationCity || '';
        if (dest.toLowerCase() !== destinationFilter.toLowerCase()) return false;
      }

      // 7. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = (v.trackingNumber || '').toLowerCase();
        const sender = (v.sender?.name || '').toLowerCase();
        const senderPhone = (v.sender?.phone || '').toLowerCase();
        const recipient = (v.recipient?.name || '').toLowerCase();
        const recipientPhone = (v.recipient?.phone || '').toLowerCase();
        const dest = (v.recipient?.destination || v.destinationCity || '').toLowerCase();
        const carrier = (v.externalCarrierName || '').toLowerCase();
        const extRef = (v.externalCarrierVoucherRef || '').toLowerCase();

        return (
          tracking.includes(q) ||
          sender.includes(q) ||
          senderPhone.includes(q) ||
          recipient.includes(q) ||
          recipientPhone.includes(q) ||
          dest.includes(q) ||
          carrier.includes(q) ||
          extRef.includes(q)
        );
      }

      return true;
    });
  }, [
    vouchers,
    startDate,
    endDate,
    transportFilter,
    selectedCarrierFilter,
    paymentFilter,
    statusFilter,
    destinationFilter,
    searchQuery
  ]);

  // Financial Metrics & KPI Calculations
  const stats = useMemo(() => {
    let totalTurnover = 0; // Chiffre d'affaires brut client
    let totalCollected = 0; // Encaissé réel
    let totalReceivables = 0; // Reste à percevoir client
    let totalExternalCost = 0; // Coût transporteurs tiers
    let externalCostPaid = 0; // Sous-traitances réglées
    let externalCostUnpaid = 0; // Sous-traitances dues (Dettes)
    let totalColis = 0;
    let totalWeightKg = 0;
    let externalVouchersCount = 0;
    let internalVouchersCount = 0;

    const carrierStatsMap: Record<string, { count: number; clientRevenue: number; cost: number; profit: number; debt: number }> = {};

    filteredVouchers.forEach(v => {
      const price = Number(v.totalPrice) || 0;
      const advance = Number(v.advanceAmount) || 0;
      const remaining = v.remainingAmount !== undefined ? Number(v.remainingAmount) : (price - advance);
      const isPaid = (v.paymentStatus || v.paymentMethod) === 'PAYE';
      const isAvance = (v.paymentStatus || v.paymentMethod) === 'AVANCE';

      totalTurnover += price;
      totalColis += Number(v.totalColis) || 0;
      totalWeightKg += Number(v.totalWeightKg) || 0;

      if (isPaid) {
        totalCollected += price;
      } else if (isAvance) {
        totalCollected += advance;
        totalReceivables += remaining;
      } else {
        totalReceivables += price;
      }

      if (v.isExternalTransport) {
        externalVouchersCount++;
        const cost = Number(v.externalCost) || 0;
        totalExternalCost += cost;

        if (v.externalPaymentStatus === 'UNPAID') {
          externalCostUnpaid += cost;
        } else {
          externalCostPaid += cost;
        }

        const cName = v.externalCarrierName?.trim() || 'Transporteur Partenaire';
        if (!carrierStatsMap[cName]) {
          carrierStatsMap[cName] = { count: 0, clientRevenue: 0, cost: 0, profit: 0, debt: 0 };
        }
        carrierStatsMap[cName].count += 1;
        carrierStatsMap[cName].clientRevenue += price;
        carrierStatsMap[cName].cost += cost;
        carrierStatsMap[cName].profit += (price - cost);
        if (v.externalPaymentStatus === 'UNPAID') {
          carrierStatsMap[cName].debt += cost;
        }
      } else {
        internalVouchersCount++;
      }
    });

    const netMargin = totalTurnover - totalExternalCost;
    const profitRate = totalTurnover > 0 ? Math.round((netMargin / totalTurnover) * 100) : 0;
    const collectionRate = totalTurnover > 0 ? Math.round((totalCollected / totalTurnover) * 100) : 0;

    return {
      totalVouchers: filteredVouchers.length,
      totalTurnover: Math.round(totalTurnover * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalExternalCost: Math.round(totalExternalCost * 100) / 100,
      externalCostPaid: Math.round(externalCostPaid * 100) / 100,
      externalCostUnpaid: Math.round(externalCostUnpaid * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      profitRate,
      collectionRate,
      totalColis,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      externalVouchersCount,
      internalVouchersCount,
      carrierBreakdown: Object.entries(carrierStatsMap).map(([name, data]) => ({
        name,
        ...data
      })).sort((a, b) => b.cost - a.cost)
    };
  }, [filteredVouchers]);

  // List of unique carrier names for quick selection
  const uniqueCarriers = useMemo(() => {
    const set = new Set<string>();
    vouchers.forEach(v => {
      if (v.isExternalTransport && v.externalCarrierName?.trim()) {
        set.add(v.externalCarrierName.trim());
      }
    });
    return Array.from(set);
  }, [vouchers]);

  // Handle Quick Payment to Carrier toggle
  const handleToggleCarrierPayment = (voucher: Voucher) => {
    const newStatus: ExternalPaymentStatus = voucher.externalPaymentStatus === 'UNPAID' ? 'PAID' : 'UNPAID';
    onUpdateVoucher({
      ...voucher,
      externalPaymentStatus: newStatus
    });
  };

  // WhatsApp reminder for receivable
  const handleSendWhatsAppReminder = (voucher: Voucher) => {
    const phone = (voucher.recipient?.phone || voucher.sender?.phone || '').replace(/\D/g, '');
    if (!phone) return;
    const remaining = voucher.remainingAmount || voucher.totalPrice;
    const msg = encodeURIComponent(
      `Bonjour ${voucher.recipient?.name || voucher.sender?.name}, rappel amical de Loyalis Trans concernant l'envoi N° ${voucher.trackingNumber} (${voucher.totalColis} colis). Le reliquat à régler est de ${formatCurrency(remaining, currency)}. Merci de votre confiance.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  // Direct print trigger for printable statement
  const handlePrintStatement = () => {
    if (activeSubTab !== 'PRINTABLE_STATEMENT') {
      setActiveSubTab('PRINTABLE_STATEMENT');
      setTimeout(() => {
        window.print();
      }, 200);
    } else {
      window.print();
    }
  };

  const handleDownloadPeriodPDF = () => {
    setIsExportingPeriodPDF(true);
    const periodLabelText = period === 'ALL' 
      ? "Tout l'historique" 
      : `${startDate || 'Début'} au ${endDate || 'Fin'}`;
    const fileLabel = period === 'ALL' 
      ? 'Historique_Complet' 
      : `${startDate || 'Debut'}_au_${endDate || 'Fin'}`;

    generateStatementVectorPDF({
      vouchers: filteredVouchers,
      settings,
      title: 'Relevé de Compte & Grand Livre des Expéditions',
      periodLabel: periodLabelText,
      fileName: `Releve_LoyalisTrans_${fileLabel}`
    });

    setTimeout(() => {
      setIsExportingPeriodPDF(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Title Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black shadow-lg shadow-orange-500/25">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 dark:text-white tracking-tight leading-none">
                  Historique & Relevés Généraux
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                  Bilan & Sous-Traitance
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                Grand livre des encaissements, suivi des dépenses transporteurs externes et calcul de marge nette • {settings.companyName}
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-open-monthly-statement-pdf"
              onClick={() => setIsMonthlyPDFModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-600/25 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Relevé Mensuel PDF</span>
            </button>

            <button
              onClick={handlePrintStatement}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Imprimer le Relevé</span>
            </button>

            <button
              onClick={onOpenExcelExport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exporter Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Période :</span>
            </span>

            {[
              { id: 'TODAY', label: "Aujourd'hui" },
              { id: '7DAYS', label: '7 derniers jours' },
              { id: 'THIS_MONTH', label: 'Ce mois-ci' },
              { id: 'LAST_MONTH', label: 'Mois dernier' },
              { id: 'THIS_YEAR', label: 'Cette année' },
              { id: 'ALL', label: 'Tout l\'historique' },
              { id: 'CUSTOM', label: 'Personnalisé' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as PeriodFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  period === tab.id
                    ? 'bg-orange-500 text-white shadow-sm font-black'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range inputs */}
          {period === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 animate-fadeIn">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-xs font-bold rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs font-bold text-slate-400">➔</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-xs font-bold rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Primary Financial Metric Cards (Executive Dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Chiffre d'affaires Brut */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">CA Brut Client</span>
            <DollarSign className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(stats.totalTurnover, currency)}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-1">
            {stats.totalVouchers} bons • {stats.totalColis} colis
          </p>
        </div>

        {/* Card 2: Encaissé Réel */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Encaissé Réel</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-200 tracking-tight">
            {formatCurrency(stats.totalCollected, currency)}
          </div>
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.collectionRate}% perçu au départ
          </p>
        </div>

        {/* Card 3: Créances Clients / Reste à Encaisser */}
        <div className={`p-4 rounded-2xl border shadow-sm ${
          stats.totalReceivables > 0 
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Créances à l'arrivée</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300 tracking-tight">
            {formatCurrency(stats.totalReceivables, currency)}
          </div>
          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1">
            À percevoir des destinataires
          </p>
        </div>

        {/* Card 4: Dépenses Sous-Traitance (Transporteurs Externes) */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Coût Sous-Traitance</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-200 tracking-tight">
            {formatCurrency(stats.totalExternalCost, currency)}
          </div>
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.externalVouchersCount} bons sous-traités
          </p>
        </div>

        {/* Card 5: Dettes Transporteurs Externes */}
        <div className={`p-4 rounded-2xl border shadow-sm ${
          stats.externalCostUnpaid > 0 
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 animate-pulse' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Dettes Transporteurs</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300 tracking-tight">
            {formatCurrency(stats.externalCostUnpaid, currency)}
          </div>
          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1">
            À régler aux transporteurs
          </p>
        </div>

        {/* Card 6: Bénéfice Net Dégagé */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Marge / Bénéfice Net</span>
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formatCurrency(stats.netMargin, currency)}
          </div>
          <p className="text-[10px] font-bold text-orange-400 mt-1">
            Taux de marge : {stats.profitRate}%
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('ALL_JOURNAL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'ALL_JOURNAL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-orange-500" />
            <span>Grand Livre & Journal Général ({filteredVouchers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('EXTERNAL_SUBCONTRACTING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'EXTERNAL_SUBCONTRACTING'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Sous-Traitance Transporteurs Externes ({stats.externalVouchersCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('RECEIVABLES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'RECEIVABLES'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Créances & Reliquats Clients ({filteredVouchers.filter(v => ((v.paymentStatus || v.paymentMethod) !== 'PAYE')).length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('PRINTABLE_STATEMENT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'PRINTABLE_STATEMENT'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Bilan Imprimable A4</span>
          </button>
        </div>
      </div>

      {/* Sub-View 1: ALL_JOURNAL (Grand Livre Chronologique) */}
      {activeSubTab === 'ALL_JOURNAL' && (
        <div className="space-y-4">
          
          {/* Quick Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par N° bon, client, transporteur..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Transport Mode Filter */}
            <select
              value={transportFilter}
              onChange={e => setTransportFilter(e.target.value as TransportFilter)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Tous les modes (Flotte + Externe)</option>
              <option value="INTERNAL">Flotte Loyalis Trans (Interne)</option>
              <option value="EXTERNAL">Sous-traitance (Externe uniquement)</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Tous les paiements</option>
              <option value="PAYE">100% Payé au départ</option>
              <option value="AVANCE">Avance reçue (Reliquat)</option>
              <option value="NON_PAYE">Non payé au départ</option>
              <option value="UNPAID_CARRIER">Dette Transporteur Externe</option>
            </select>

            {/* Destination Filter */}
            <select
              value={destinationFilter}
              onChange={e => setDestinationFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">Toutes destinations</option>
              {settings.defaultAgencies?.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>

          {/* Detailed Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">N° Bon</th>
                    <th className="py-3 px-3">Expéditeur</th>
                    <th className="py-3 px-3">Destinataire & Trajet</th>
                    <th className="py-3 px-3 text-center">Colis / Kg</th>
                    <th className="py-3 px-3">Acheminement</th>
                    <th className="py-3 px-3 text-right">Facturé Client</th>
                    <th className="py-3 px-3 text-right">Coût Externe</th>
                    <th className="py-3 px-3 text-right">Marge Nette</th>
                    <th className="py-3 px-3 text-center">Paiement Client</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 font-bold">
                        Aucun bon trouvé pour cette sélection ou période.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map(v => {
                      const paymentInfo = getPaymentStatusInfo(
                        v.paymentStatus || v.paymentMethod,
                        v.advanceAmount || 0,
                        v.totalPrice,
                        v.remainingAmount
                      );
                      const extCost = Number(v.externalCost) || 0;
                      const profit = (v.totalPrice || 0) - extCost;

                      return (
                        <tr 
                          key={v.id} 
                          onClick={() => onOpenDetail(v)}
                          className="hover:bg-orange-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-3 text-slate-500 font-semibold whitespace-nowrap">
                            {formatDate(v.date)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-black text-orange-600 dark:text-orange-400">
                              #{v.trackingNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-900 dark:text-white font-bold block">{v.sender.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{v.sender.phone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-900 dark:text-white font-bold block">{v.recipient.name}</strong>
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                              {v.departureCity || 'Casablanca'} ➔ {v.recipient.destination || v.destinationCity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <strong className="font-black text-slate-900 dark:text-white">{v.totalColis}</strong> <span className="text-[10px] text-slate-400">({v.totalWeightKg}kg)</span>
                          </td>
                          <td className="py-3 px-3">
                            {v.isExternalTransport ? (
                              <div className="inline-flex flex-col">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  <span>{v.externalCarrierName || 'Externe'}</span>
                                </span>
                                {v.externalCarrierVoucherRef && (
                                  <span className="text-[9px] font-mono text-slate-400 mt-0.5">Réf: {v.externalCarrierVoucherRef}</span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                Flotte Loyalis
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(v.totalPrice, currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {v.isExternalTransport ? `-${formatCurrency(extCost, currency)}` : '—'}
                          </td>
                          <td className={`py-3 px-3 text-right font-mono font-black ${
                            profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                          }`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit, currency)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${paymentInfo.badgeBg} ${paymentInfo.badgeText}`}>
                              {paymentInfo.type === 'PAYE' && 'Payé 100%'}
                              {paymentInfo.type === 'NON_PAYE' && 'Non payé'}
                              {paymentInfo.type === 'AVANCE' && `Avance ${paymentInfo.advance} DH`}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onOpenDetail(v)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                title="Voir détails"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {v.bonReelPhoto && (
                                <button
                                  onClick={() => setPhotoViewerVoucher(v)}
                                  className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 cursor-pointer"
                                  title="Voir photo bon réel"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs">
                    <td colSpan={6} className="py-3 px-3 uppercase tracking-wider">
                      Totaux Période ({filteredVouchers.length} bons)
                    </td>
                    <td className="py-3 px-3 text-right font-black font-mono">
                      {formatCurrency(stats.totalTurnover, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-black font-mono text-amber-400">
                      -{formatCurrency(stats.totalExternalCost, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-black font-mono text-emerald-400">
                      +{formatCurrency(stats.netMargin, currency)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-right text-[10px] text-slate-400">
                      Marge Nette : {stats.profitRate}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 2: EXTERNAL_SUBCONTRACTING (Transporteurs Externes & Dépenses) */}
      {activeSubTab === 'EXTERNAL_SUBCONTRACTING' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Partner Carrier Cards Breakdown */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>Synthèse par Transporteur Partenaire</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {stats.carrierBreakdown.length === 0 ? (
                <div className="col-span-full p-6 rounded-xl bg-slate-50 dark:bg-slate-800 text-center text-slate-400 font-bold">
                  Aucun bon sous-traité pour cette période.
                </div>
              ) : (
                stats.carrierBreakdown.map(carrier => (
                  <div 
                    key={carrier.name}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <strong className="text-sm font-black text-slate-900 dark:text-white uppercase">
                        {carrier.name}
                      </strong>
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-[10px]">
                        {carrier.count} expédition(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Facturé Client</span>
                        <strong className="text-slate-900 dark:text-white font-mono font-black">{formatCurrency(carrier.clientRevenue, currency)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-500 uppercase block font-bold">Payé Transporteur</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-mono font-black">-{formatCurrency(carrier.cost, currency)}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Bénéfice Net :</span>
                        <strong className={`font-mono font-black ${carrier.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          +{formatCurrency(carrier.profit, currency)}
                        </strong>
                      </div>
                      {carrier.debt > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-rose-500 uppercase block font-bold">Dette en cours :</span>
                          <strong className="text-rose-600 font-mono font-black">{formatCurrency(carrier.debt, currency)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Table of all Subcontracted Vouchers with Settlement Toggle */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 bg-amber-500/10 border-b border-amber-300/40 dark:border-amber-700/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                  Détail de tous les colis sous-traités & Règlement des Dépenses
                </h4>
              </div>

              {/* Carrier Filter */}
              {uniqueCarriers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Filtrer par transporteur :</span>
                  <select
                    value={selectedCarrierFilter}
                    onChange={e => setSelectedCarrierFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-xs font-bold border border-slate-300 dark:border-slate-700"
                  >
                    <option value="ALL">Tous les transporteurs</option>
                    {uniqueCarriers.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">N° Bon</th>
                    <th className="py-3 px-3">Transporteur Externe</th>
                    <th className="py-3 px-3">Client & Trajet</th>
                    <th className="py-3 px-3 text-right">Facturé Client</th>
                    <th className="py-3 px-3 text-right">Coût Transporteur</th>
                    <th className="py-3 px-3 text-right">Marge Nette</th>
                    <th className="py-3 px-3 text-center">Règlement Transporteur</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredVouchers.filter(v => v.isExternalTransport).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                        Aucun envoi sous-traité trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.filter(v => v.isExternalTransport).map(v => {
                      const extCost = Number(v.externalCost) || 0;
                      const profit = (v.totalPrice || 0) - extCost;
                      const isSettled = v.externalPaymentStatus === 'PAID';

                      return (
                        <tr key={v.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">
                            {formatDate(v.date)}
                          </td>
                          <td className="py-3 px-3">
                            <span 
                              onClick={() => onOpenDetail(v)}
                              className="font-mono font-black text-orange-600 hover:underline cursor-pointer"
                            >
                              #{v.trackingNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-900 dark:text-white font-black block">
                              {v.externalCarrierName || 'Non spécifié'}
                            </strong>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {v.externalCarrierPhone && <span>Tél: {v.externalCarrierPhone}</span>}
                              {v.externalCarrierVoucherRef && <span className="font-mono font-bold text-amber-600">Reçu: {v.externalCarrierVoucherRef}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">{v.sender.name} ➔ {v.recipient.name}</span>
                            <span className="text-[10px] font-bold text-orange-600">{v.departureCity || 'Casablanca'} ➔ {v.recipient.destination}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(v.totalPrice, currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                            {formatCurrency(extCost, currency)}
                          </td>
                          <td className={`py-3 px-3 text-right font-mono font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit, currency)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCarrierPayment(v)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
                                isSettled
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                              }`}
                              title="Cliquer pour basculer le statut de règlement"
                            >
                              {isSettled ? '✓ Réglé / Payé' : '⏳ À Régler (Dette)'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onOpenDetail(v)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] cursor-pointer"
                            >
                              Détails
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 3: RECEIVABLES (Créances & Reliquats Clients) */}
      {activeSubTab === 'RECEIVABLES' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>Journal des Créances & Impayés Clients à la Livraison</span>
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Total restant à percevoir à l'arrivée : <strong className="font-mono font-black text-sm">{formatCurrency(stats.totalReceivables, currency)}</strong>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">N° Bon</th>
                    <th className="py-3 px-3">Expéditeur</th>
                    <th className="py-3 px-3">Destinataire (À Encaisser)</th>
                    <th className="py-3 px-3 text-right">Prix Total</th>
                    <th className="py-3 px-3 text-right">Avance Versée</th>
                    <th className="py-3 px-3 text-right text-rose-600 font-black">Reste Dû</th>
                    <th className="py-3 px-3 text-center">Relance & Recouvrement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredVouchers.filter(v => (v.paymentStatus || v.paymentMethod) !== 'PAYE').length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        Félicitations ! Aucune créance en attente sur cette période.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.filter(v => (v.paymentStatus || v.paymentMethod) !== 'PAYE').map(v => {
                      const advance = Number(v.advanceAmount) || 0;
                      const remaining = v.remainingAmount !== undefined ? Number(v.remainingAmount) : (v.totalPrice - advance);

                      return (
                        <tr key={v.id} className="hover:bg-rose-50/40 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">
                            {formatDate(v.date)}
                          </td>
                          <td className="py-3 px-3">
                            <span 
                              onClick={() => onOpenDetail(v)}
                              className="font-mono font-black text-orange-600 hover:underline cursor-pointer"
                            >
                              #{v.trackingNumber}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-900 dark:text-white font-bold block">{v.sender.name}</strong>
                            <a href={`tel:${v.sender.phone}`} className="text-[10px] text-slate-500 hover:underline font-mono">
                              {v.sender.phone}
                            </a>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-900 dark:text-white font-bold block">{v.recipient.name}</strong>
                            <a href={`tel:${v.recipient.phone}`} className="text-[10px] text-emerald-600 hover:underline font-mono font-bold">
                              {v.recipient.phone}
                            </a>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(v.totalPrice, currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(advance, currency)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                            {formatCurrency(remaining, currency)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSendWhatsAppReminder(v)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                title="Envoyer rappel WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                onClick={() => onUpdatePayment(v.id, 'PAYE', v.totalPrice)}
                                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] cursor-pointer"
                                title="Marquer comme encaissé 100%"
                              >
                                Solder (100%)
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 4: PRINTABLE_STATEMENT (Bilan Imprimable A4 Officiel) */}
      {activeSubTab === 'PRINTABLE_STATEMENT' && (
        <div 
          id="printable-statement-document" 
          className="printable-document bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-lg space-y-6 max-w-4xl mx-auto"
        >
          {/* Print Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                {settings.companyName}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {settings.tagline} • Tél: {settings.phone1} {settings.phone2 ? `/ ${settings.phone2}` : ''}
              </p>
              <p className="text-xs text-slate-600">
                {settings.address}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded">
                Relevé de Compte & Bilan
              </span>
              <p className="text-xs font-mono font-bold mt-1 text-slate-500">
                Édité le : {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Statement Period Info */}
          <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between text-xs font-bold">
            <span>Période analysée : <strong>{period === 'ALL' ? 'Tout l\'historique' : `${startDate || 'Début'} au ${endDate || 'Fin'}`}</strong></span>
            <span>Total Expéditions : <strong>{stats.totalVouchers} bons ({stats.totalColis} colis, {stats.totalWeightKg} kg)</strong></span>
          </div>

          {/* Financial Summary Box */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 border rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Facturé Client</span>
              <span className="text-base font-black font-mono">{formatCurrency(stats.totalTurnover, currency)}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Encaissé</span>
              <span className="text-base font-black font-mono text-emerald-800">{formatCurrency(stats.totalCollected, currency)}</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Coût Sous-Traitance</span>
              <span className="text-base font-black font-mono text-amber-800">-{formatCurrency(stats.totalExternalCost, currency)}</span>
            </div>
            <div className="p-3 bg-slate-900 text-white rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Bénéfice Net Dégagé</span>
              <span className="text-base font-black font-mono text-white">+{formatCurrency(stats.netMargin, currency)}</span>
            </div>
          </div>

          {/* Printable Mini Table */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b font-black uppercase text-[10px] text-slate-600">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">N° Bon</th>
                  <th className="p-2">Expéditeur ➔ Destinataire</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2 text-right">Facturé</th>
                  <th className="p-2 text-right">Coût Externe</th>
                  <th className="p-2 text-right">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[11px]">
                {filteredVouchers.slice(0, 50).map(v => {
                  const extCost = Number(v.externalCost) || 0;
                  const profit = (v.totalPrice || 0) - extCost;
                  return (
                    <tr key={v.id}>
                      <td className="p-2">{formatDate(v.date)}</td>
                      <td className="p-2 font-mono font-bold">#{v.trackingNumber}</td>
                      <td className="p-2">{v.sender.name} ➔ {v.recipient.name} ({v.recipient.destination || v.destinationCity})</td>
                      <td className="p-2">{v.isExternalTransport ? `Ext: ${v.externalCarrierName || 'Partenaire'}` : 'Flotte Interne'}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(v.totalPrice, currency)}</td>
                      <td className="p-2 text-right font-mono text-amber-700">{v.isExternalTransport ? `-${formatCurrency(extCost, currency)}` : '—'}</td>
                      <td className="p-2 text-right font-mono font-black">{profit >= 0 ? '+' : ''}{formatCurrency(profit, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Print & PDF Trigger Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 print:hidden">
            <button
              onClick={() => setIsMonthlyPDFModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Bilan Mensuel Complet (PDF)</span>
            </button>

            <button
              onClick={handleDownloadPeriodPDF}
              disabled={isExportingPeriodPDF}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span>{isExportingPeriodPDF ? 'Téléchargement...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={handlePrintStatement}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer A4</span>
            </button>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal if opened */}
      {photoViewerVoucher && (
        <VoucherPhotoViewerModal
          isOpen={true}
          onClose={() => setPhotoViewerVoucher(null)}
          voucher={photoViewerVoucher}
          initialTab="BON_REEL"
        />
      )}

      {/* Monthly Statement PDF Generator Modal */}
      {isMonthlyPDFModalOpen && (
        <MonthlyStatementPDFModal
          isOpen={isMonthlyPDFModalOpen}
          onClose={() => setIsMonthlyPDFModalOpen(false)}
          vouchers={vouchers}
          settings={settings}
        />
      )}

    </div>
  );
};
