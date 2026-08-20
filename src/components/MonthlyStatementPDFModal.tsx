import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  Printer,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  MessageSquare,
  Sparkles,
  Share2,
  Layers,
  Scale,
  Package
} from 'lucide-react';
import { CompanySettings, Voucher } from '../types';
import { formatCurrency, formatDate, getPaymentStatusInfo } from '../utils/formatters';
import {
  computeMonthlyStats,
  buildMonthlyWhatsAppSummary,
  generateStatementVectorPDF,
  MonthlyStatsSummary
} from '../utils/monthlyStatementPDF';

interface MonthlyStatementPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  settings: CompanySettings;
  initialYear?: number;
  initialMonth?: number; // 0 for all year, 1-12 for month
}

const MONTH_OPTIONS = [
  { value: 0, label: '★ Tous les mois (Bilan Annuel)' },
  { value: 1, label: '01 - Janvier' },
  { value: 2, label: '02 - Février' },
  { value: 3, label: '03 - Mars' },
  { value: 4, label: '04 - Avril' },
  { value: 5, label: '05 - Mai' },
  { value: 6, label: '06 - Juin' },
  { value: 7, label: '07 - Juillet' },
  { value: 8, label: '08 - Août' },
  { value: 9, label: '09 - Septembre' },
  { value: 10, label: '10 - Octobre' },
  { value: 11, label: '11 - Novembre' },
  { value: 12, label: '12 - Décembre' }
];

export const MonthlyStatementPDFModal: React.FC<MonthlyStatementPDFModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  settings,
  initialYear,
  initialMonth
}) => {
  const currentDate = new Date();
  
  // Default to year of latest voucher or current year
  const defaultYear = useMemo(() => {
    if (initialYear) return initialYear;
    if (vouchers.length > 0) {
      const dates = vouchers.map(v => v.date).filter(Boolean).sort().reverse();
      if (dates.length > 0) {
        const y = parseInt(dates[0].split('-')[0], 10);
        if (!isNaN(y)) return y;
      }
    }
    return currentDate.getFullYear();
  }, [vouchers, initialYear]);

  // Default to month of latest voucher or current month
  const defaultMonth = useMemo(() => {
    if (initialMonth !== undefined) return initialMonth;
    if (vouchers.length > 0) {
      const dates = vouchers.map(v => v.date).filter(Boolean).sort().reverse();
      if (dates.length > 0) {
        const parts = dates[0].split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (!isNaN(m) && m >= 1 && m <= 12) return m;
        }
      }
    }
    return currentDate.getMonth() + 1;
  }, [vouchers, initialMonth]);

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  const currency = settings.currency || 'DH';

  // Compute stats and filtered list for selected month/year
  const { monthlyVouchers, stats } = useMemo(() => {
    return computeMonthlyStats(vouchers, selectedYear, selectedMonth);
  }, [vouchers, selectedYear, selectedMonth]);

  if (!isOpen) return null;

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth <= 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth >= 12 || selectedMonth === 0) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  // PDF Export trigger using 100% Vector PDF Generator
  const handleDownloadPDF = () => {
    setIsExportingPDF(true);
    const monthLabelClean = stats.monthLabel.replace(/\s+/g, '_');
    const fileName = `Releve_LoyalisTrans_${monthLabelClean}`;
    
    generateStatementVectorPDF({
      vouchers: monthlyVouchers,
      settings,
      title: selectedMonth === 0 
        ? `Bilan Annuel des Expéditions (${selectedYear})` 
        : `Relevé Mensuel de Compte & Bilan (${stats.monthLabel})`,
      periodLabel: stats.monthLabel,
      fileName
    });

    setTimeout(() => {
      setIsExportingPDF(false);
    }, 400);
  };

  // Browser print
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const text = buildMonthlyWhatsAppSummary(stats, settings);
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div 
      id="monthly-statement-pdf-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[96vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Sticky Toolbar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden sticky top-0 z-30">
          
          {/* Title & Month Selector Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-tight leading-none">
                  Relevé Mensuel Complet PDF
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Gains & Sous-Traitance
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Bilan mensuel certifié A4 avec total des gains, dépenses de transport externe et marge nette
              </p>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick Month Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white font-bold text-xs px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-white">
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold text-xs px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleCurrentMonth}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
              title="Revenir au mois en cours"
            >
              Mois Actuel
            </button>

            {/* Download PDF Button */}
            <button
              id="btn-download-monthly-pdf"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? 'Génération du PDF...' : 'Télécharger PDF'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Imprimer</span>
            </button>

            {/* WhatsApp Share Button */}
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body & Printable Document Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 print:bg-white print:p-0 print:overflow-visible flex justify-center">
          
          {/* Printable Document A4 Frame */}
          <div 
            id="monthly-statement-document"
            className="printable-document w-full max-w-[840px] bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-2 print:max-w-none space-y-6 font-sans"
          >
            
            {/* 1. Official Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
              
              <div className="space-y-1 max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center p-1 shadow-sm overflow-hidden shrink-0">
                    <img 
                      src="/logo.png" 
                      alt="Logo" 
                      className="w-full h-full object-contain" 
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<span class="font-black text-orange-500 text-lg">LT</span>';
                        }
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 leading-none uppercase">
                      {settings.companyName || 'LOYALIS TRANS'}
                    </h1>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-0.5">
                      {settings.tagline || 'Transport Express de Bagages, Colis & Fret'}
                    </p>
                  </div>
                </div>
                
                <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                  <p><strong>Adresse :</strong> {settings.address || 'Gare Routière / Transit National & International'}</p>
                  <p><strong>Téléphones :</strong> {settings.phone1} {settings.phone2 ? `• ${settings.phone2}` : ''} | <strong>Email :</strong> {settings.email || 'contact@loyalistrans.com'}</p>
                </div>
              </div>

              {/* Title Badge & Date Box */}
              <div className="text-right space-y-1.5">
                <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-xl text-center shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 block">
                    Document Officiel
                  </span>
                  <span className="text-sm sm:text-base font-black uppercase tracking-tight block">
                    Relevé Mensuel de Compte
                  </span>
                </div>
                
                <div className="text-xs">
                  <span className="font-bold text-slate-500 block">Mois de Référence :</span>
                  <span className="text-base font-black font-mono text-orange-600 uppercase">
                    {stats.monthLabel}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Édité le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>

            {/* 2. Key Executive Metrics Grid (Grandes Synthèses Financières) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span>1. Synthèse Financière & Performance du Mois</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  Total : <strong>{stats.totalVouchers} bons</strong> ({stats.totalColis} colis, {stats.totalWeightKg} kg)
                </span>
              </div>

              {/* 4-Box Primary Financial Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                
                {/* Box 1: Total Facturé Client */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">
                    Gains Bruts Facturés (CA)
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 block">
                    {formatCurrency(stats.totalClientRevenue, currency)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 block">
                    {stats.totalVouchers} expéditions clients
                  </span>
                </div>

                {/* Box 2: Dépenses Sous-Traitance Externes */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider block">
                    Coût Transporteurs Externes
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-amber-700 block">
                    -{formatCurrency(stats.totalExternalCost, currency)}
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 block">
                    {stats.externalVouchersCount} bons sous-traités
                  </span>
                </div>

                {/* Box 3: Bénéfice Net Dégagé */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-black text-orange-400 tracking-wider block">
                    Bénéfice Net Dégagé
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-white block">
                    +{formatCurrency(stats.netMargin, currency)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 block">
                    Taux de Marge : {stats.profitMarginPercent}%
                  </span>
                </div>

                {/* Box 4: Encaissé Réel vs Créances */}
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                    Encaissé au Départ
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 block">
                    {formatCurrency(stats.totalCollected, currency)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 block">
                    {stats.collectionRatePercent}% du CA perçu
                  </span>
                </div>
              </div>

              {/* Secondary Balance Line: Receivables and Debts */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-rose-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Créances Clients Restantes (À percevoir à la livraison) :</span>
                  </span>
                  <strong className="font-mono font-black text-rose-700 text-sm">
                    {formatCurrency(stats.totalReceivables, currency)}
                  </strong>
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Dettes Transporteurs Restantes (À régler) :</span>
                  </span>
                  <strong className="font-mono font-black text-amber-800 text-sm">
                    {formatCurrency(stats.externalCostUnpaid, currency)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 3. Subcontracting Carrier Breakdown Table */}
            {stats.carrierStats.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span>2. Ventilation des Dépenses & Marges par Transporteur Partenaire</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-700">
                      <tr>
                        <th className="py-2 px-3">Nom du Transporteur</th>
                        <th className="py-2 px-3 text-center">Nombre d'Envois</th>
                        <th className="py-2 px-3 text-right">Facturé aux Clients</th>
                        <th className="py-2 px-3 text-right">Coût Transporteur (Dépense)</th>
                        <th className="py-2 px-3 text-right">Bénéfice Net Dégagé</th>
                        <th className="py-2 px-3 text-center">Statut Règlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.carrierStats.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-black text-slate-900 uppercase">
                            {c.name}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {c.count} colis
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(c.clientRevenue, currency)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                            -{formatCurrency(c.externalCost, currency)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                            +{formatCurrency(c.netProfit, currency)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {c.debt > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                Reste dû : {formatCurrency(c.debt, currency)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                                ✓ Totalement Réglé
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-300">
                        <td className="py-2 px-3 uppercase text-[10px]">
                          Total Sous-Traitance
                        </td>
                        <td className="py-2 px-3 text-center">
                          {stats.externalVouchersCount} envois
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatCurrency(stats.carrierStats.reduce((acc, c) => acc + c.clientRevenue, 0), currency)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-700">
                          -{formatCurrency(stats.totalExternalCost, currency)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-700">
                          +{formatCurrency(stats.carrierStats.reduce((acc, c) => acc + c.netProfit, 0), currency)}
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-600 font-bold">
                          Dettes: {formatCurrency(stats.externalCostUnpaid, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Complete Monthly Journal Table */}
            <div className="space-y-2.5 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <span>3. Journal Détaillé des Expéditions du Mois ({monthlyVouchers.length} bons)</span>
                </span>
                <span className="text-[10px] font-normal text-slate-500">
                  Classement chronologique par date
                </span>
              </h3>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase">
                    <tr>
                      <th className="py-2 px-2.5">Date</th>
                      <th className="py-2 px-2.5">N° Bon</th>
                      <th className="py-2 px-2.5">Expéditeur ➔ Destinataire</th>
                      <th className="py-2 px-2.5 text-center">Colis</th>
                      <th className="py-2 px-2.5">Mode / Transporteur</th>
                      <th className="py-2 px-2.5 text-right">Facturé Client</th>
                      <th className="py-2 px-2.5 text-right">Coût Externe</th>
                      <th className="py-2 px-2.5 text-right">Marge Nette</th>
                      <th className="py-2 px-2.5 text-center">Règlement Client</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px]">
                    {monthlyVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                          Aucun bon d'expédition enregistré pour le mois de {stats.monthLabel}.
                        </td>
                      </tr>
                    ) : (
                      monthlyVouchers.map((v, idx) => {
                        const extCost = Number(v.externalCost) || 0;
                        const profit = (v.totalPrice || 0) - extCost;
                        const pInfo = getPaymentStatusInfo(
                          v.paymentStatus || v.paymentMethod,
                          v.advanceAmount || 0,
                          v.totalPrice,
                          v.remainingAmount
                        );

                        return (
                          <tr key={v.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="py-1.5 px-2.5 text-slate-600 font-medium whitespace-nowrap">
                              {formatDate(v.date)}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-orange-600 whitespace-nowrap">
                              #{v.trackingNumber}
                            </td>
                            <td className="py-1.5 px-2.5">
                              <span className="font-bold text-slate-900 block">{v.sender.name} ➔ {v.recipient.name}</span>
                              <span className="text-[10px] text-slate-500">{v.departureCity || 'Casablanca'} ➔ {v.recipient.destination}</span>
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-bold text-slate-800">
                              {v.totalColis} <span className="text-[9px] text-slate-400 font-normal">({v.totalWeightKg}kg)</span>
                            </td>
                            <td className="py-1.5 px-2.5">
                              {v.isExternalTransport ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  Ext: {v.externalCarrierName || 'Partenaire'}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                                  Flotte Interne
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(v.totalPrice, currency)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-amber-700">
                              {v.isExternalTransport ? `-${formatCurrency(extCost, currency)}` : '—'}
                            </td>
                            <td className={`py-1.5 px-2.5 text-right font-mono font-black ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {profit >= 0 ? '+' : ''}{formatCurrency(profit, currency)}
                            </td>
                            <td className="py-1.5 px-2.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${pInfo.badgeBg} ${pInfo.badgeText}`}>
                                {pInfo.type === 'PAYE' && 'Payé 100%'}
                                {pInfo.type === 'AVANCE' && `Avance ${pInfo.advance}`}
                                {pInfo.type === 'NON_PAYE' && 'Non Payé'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td colSpan={5} className="py-2.5 px-2.5 uppercase text-[10px] tracking-wider">
                        Totaux Généraux du Mois ({monthlyVouchers.length} bons, {stats.totalColis} colis, {stats.totalWeightKg} kg)
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-black">
                        {formatCurrency(stats.totalClientRevenue, currency)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-black text-amber-400">
                        -{formatCurrency(stats.totalExternalCost, currency)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-400">
                        +{formatCurrency(stats.netMargin, currency)}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[10px] text-orange-400">
                        Marge : {stats.profitMarginPercent}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 5. Official Certifications & Signatures */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-slate-900 text-xs">
              <div className="border border-slate-300 rounded-2xl p-4 h-24 flex flex-col justify-between">
                <span className="font-bold text-slate-800">Visa & Contrôle Gestion :</span>
                <span className="text-[10px] text-slate-500 italic">"Certifié conforme aux pièces justificatives et encaissements"</span>
              </div>

              <div className="border border-slate-300 rounded-2xl p-4 h-24 flex flex-col justify-between text-right">
                <span className="font-bold text-slate-800">Cachet & Direction Générale :</span>
                <span className="text-xs font-bold text-slate-900">{settings.companyName}</span>
              </div>
            </div>

            {/* Document Footer Notice */}
            <div className="text-[9px] text-slate-400 text-center border-t border-slate-200 pt-3">
              Ce document constitue le relevé de compte officiel certifié pour le mois de {stats.monthLabel}. Loyalis Trans — Système de Gestion et Suivi Logistique.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
