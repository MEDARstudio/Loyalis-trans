import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calculator, 
  FileSpreadsheet, 
  TrendingUp, 
  Package, 
  Scale, 
  Coins, 
  Truck, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ArrowRightLeft, 
  Building2, 
  MapPin, 
  User, 
  ExternalLink, 
  Search, 
  Percent, 
  Info, 
  Calendar,
  AlertCircle,
  Check,
  ChevronRight,
  Printer
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStatus } from '../types';
import { formatCurrency, formatDate, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';
import * as XLSX from 'xlsx';

export type CalculationMetricType =
  | 'TOTAL_VOUCHERS'
  | 'TOTAL_REVENUE'
  | 'TOTAL_WEIGHT'
  | 'TOTAL_COLIS'
  | 'AVG_WEIGHT'
  | 'AVG_REVENUE'
  | 'AVG_COLIS'
  | 'TOTAL_BILLED'
  | 'TOTAL_PAID'
  | 'TOTAL_REMAINING'
  | 'COLLECTION_RATE'
  | 'DELIVERY_RATE'
  | 'EXTERNAL_COST'
  | 'EXTERNAL_PAID'
  | 'EXTERNAL_UNPAID'
  | 'EXTERNAL_MARGIN'
  | 'GLOBAL_NET_PROFIT'
  | 'INTERNAL_FLEET'
  | 'EXTERNAL_FLEET'
  | 'STATUS_PENDING'
  | 'STATUS_IN_TRANSIT'
  | 'STATUS_ARRIVED'
  | 'STATUS_DELIVERED'
  | 'STATUS_CANCELLED'
  | 'CARRIER'
  | 'DESTINATION'
  | 'DEPARTURE'
  | 'CHART_BAR'
  | 'TIME_SLOT'
  | 'DAY_OF_WEEK';

export interface CalculationTarget {
  type: CalculationMetricType;
  title: string;
  subtitle?: string;
  extraData?: {
    carrierName?: string;
    destinationCity?: string;
    departureCity?: string;
    status?: VoucherStatus;
    dateLabel?: string;
    dateKey?: string;
    slotLabel?: string;
    dayName?: string;
    dayIdx?: number;
    [key: string]: any;
  };
}

interface CalculationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: CalculationTarget | null;
  periodVouchers: Voucher[];
  allVouchers: Voucher[];
  settings: CompanySettings;
  periodLabel: string;
  onOpenVoucherDetail?: (voucher: Voucher) => void;
  onFilterByStatus?: (status: string) => void;
}

export const CalculationDetailModal: React.FC<CalculationDetailModalProps> = ({
  isOpen,
  onClose,
  target,
  periodVouchers,
  allVouchers,
  settings,
  periodLabel,
  onOpenVoucherDetail,
  onFilterByStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const currency = settings.currency || 'DH';

  // If closed or no target, do not render
  if (!isOpen || !target) return null;

  // Compute calculation details based on target
  const details = useMemo(() => {
    let title = target.title;
    let icon = <Calculator className="w-5 h-5 text-orange-500" />;
    let formula = '';
    let appliedMath = '';
    let explanation = '';
    let metricCards: { label: string; value: string; hint?: string; color?: string }[] = [];
    let relevantVouchers: {
      voucher: Voucher;
      clientPrice: number;
      weight: number;
      colis: number;
      paidAmount: number;
      remainingAmount: number;
      externalCost: number;
      margin: number;
      customNote?: string;
    }[] = [];

    // Helper to extract clean numbers
    const getVoucherNumbers = (v: Voucher) => {
      const itemsPrice = v.items?.reduce((acc, it) => acc + (Number(it.price) || 0), 0) || 0;
      const clientPrice = (v.totalPrice !== undefined && v.totalPrice !== null && !isNaN(Number(v.totalPrice)))
        ? Number(v.totalPrice)
        : itemsPrice;

      const itemsWeight = v.items?.reduce((acc, it) => acc + (Number(it.weightKg) || 0), 0) || 0;
      const weight = (v.totalWeightKg !== undefined && v.totalWeightKg !== null && Number(v.totalWeightKg) > 0)
        ? Number(v.totalWeightKg)
        : itemsWeight;

      const itemsColis = v.items?.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || 0;
      const colis = (v.totalColis !== undefined && v.totalColis !== null && Number(v.totalColis) > 0)
        ? Number(v.totalColis)
        : (itemsColis > 0 ? itemsColis : 1);

      const pInfo = getPaymentStatusInfo(v.paymentStatus || v.paymentMethod, v.advanceAmount || 0, clientPrice, v.remainingAmount);
      const paidAmount = pInfo.advance;
      const remainingAmount = pInfo.remaining;

      const isExternal = v.isExternalTransport === true || (Number(v.externalCost) > 0) || Boolean(v.externalCarrierName && v.externalCarrierName.trim());
      const externalCost = isExternal ? (Number(v.externalCost) || 0) : 0;
      const margin = clientPrice - externalCost;

      return { clientPrice, weight, colis, paidAmount, remainingAmount, externalCost, margin, isExternal, pInfo };
    };

    // 1. TOTAL_VOUCHERS
    if (target.type === 'TOTAL_VOUCHERS') {
      icon = <Package className="w-5 h-5 text-orange-500" />;
      const totalCount = periodVouchers.length;
      let internalCount = 0;
      let externalCount = 0;
      let delivered = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        if (nums.isExternal) externalCount++;
        else internalCount++;
        if (v.status === 'LIVRE') delivered++;

        relevantVouchers.push({
          voucher: v,
          ...nums,
          customNote: nums.isExternal ? `Sous-traité (${v.externalCarrierName || 'Tiers'})` : 'Flotte Interne'
        });
      });

      formula = "Total Expéditions = Nombre de bons de transport émis dans la période";
      appliedMath = `Total = ${totalCount} bon(s) (${internalCount} flotte propre + ${externalCount} sous-traités)`;
      explanation = `Le volume total comptabilise tous les bons enregistrés entre les dates de début et de fin de la période sélectionnée (${periodLabel}).`;

      metricCards = [
        { label: "Total Bons", value: `${totalCount}`, hint: "100% du volume", color: "text-orange-500" },
        { label: "Flotte Loyalis", value: `${internalCount}`, hint: `${totalCount > 0 ? Math.round((internalCount / totalCount) * 100) : 0}% des envois`, color: "text-slate-800 dark:text-slate-200" },
        { label: "Sous-Traitance", value: `${externalCount}`, hint: `${totalCount > 0 ? Math.round((externalCount / totalCount) * 100) : 0}% des envois`, color: "text-indigo-600 dark:text-indigo-400" },
        { label: "Déjà Livrés", value: `${delivered}`, hint: `${totalCount > 0 ? Math.round((delivered / totalCount) * 100) : 0}% de taux de succès`, color: "text-emerald-600" }
      ];
    }

    // 2. TOTAL_REVENUE or TOTAL_BILLED
    else if (target.type === 'TOTAL_REVENUE' || target.type === 'TOTAL_BILLED') {
      icon = <Coins className="w-5 h-5 text-emerald-600" />;
      let totalRev = 0;
      let totalPaid = 0;
      let totalRemaining = 0;
      let internalRev = 0;
      let externalRev = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        totalRev += nums.clientPrice;
        totalPaid += nums.paidAmount;
        totalRemaining += nums.remainingAmount;
        if (nums.isExternal) externalRev += nums.clientPrice;
        else internalRev += nums.clientPrice;

        relevantVouchers.push({
          voucher: v,
          ...nums,
          customNote: `Encaissé: ${formatCurrency(nums.paidAmount, currency)} | Reste: ${formatCurrency(nums.remainingAmount, currency)}`
        });
      });

      const avgTicket = periodVouchers.length > 0 ? Math.round(totalRev / periodVouchers.length) : 0;
      const collRate = totalRev > 0 ? Math.round((totalPaid / totalRev) * 100) : 100;

      formula = "Chiffre d'Affaires = Σ (Prix Facturé Client) = Total Encaissé Réel + Reste à Recouvrer";
      appliedMath = `${formatCurrency(totalRev, currency)} = ${formatCurrency(totalPaid, currency)} (Encaissé ${collRate}%) + ${formatCurrency(totalRemaining, currency)} (Reste ${100 - collRate}%)`;
      explanation = `Le Chiffre d'Affaires représente la somme de tous les montants facturés aux clients pour les ${periodVouchers.length} expéditions de la période. Il est décomposé entre ce qui est déjà perçu (comptant et acomptes) et ce qui reste à percevoir à la livraison.`;

      metricCards = [
        { label: "Chiffre d'Affaires", value: formatCurrency(totalRev, currency), hint: `${periodVouchers.length} bons`, color: "text-emerald-600" },
        { label: "Encaissé Réel", value: formatCurrency(totalPaid, currency), hint: `${collRate}% encaissé`, color: "text-emerald-600" },
        { label: "Reste à Recouvrer", value: formatCurrency(totalRemaining, currency), hint: `${100 - collRate}% en attente`, color: "text-rose-600" },
        { label: "Ticket Moyen", value: `${formatCurrency(avgTicket, currency)} / bon`, hint: "Moyenne par envoi", color: "text-slate-800 dark:text-slate-200" }
      ];
    }

    // 3. TOTAL_WEIGHT & AVG_WEIGHT
    else if (target.type === 'TOTAL_WEIGHT' || target.type === 'AVG_WEIGHT') {
      icon = <Scale className="w-5 h-5 text-blue-600" />;
      let totalKg = 0;
      let maxKg = 0;
      let minKg = 999999;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        totalKg += nums.weight;
        if (nums.weight > maxKg) maxKg = nums.weight;
        if (nums.weight > 0 && nums.weight < minKg) minKg = nums.weight;

        relevantVouchers.push({
          voucher: v,
          ...nums,
          customNote: `${nums.weight} kg (${nums.colis} colis)`
        });
      });

      if (minKg === 999999) minKg = 0;
      const count = periodVouchers.length;
      const avgKg = count > 0 ? Number((totalKg / count).toFixed(2)) : 0;

      formula = "Poids Total = Σ (Poids kg de chaque bon) | Poids Moyen = Poids Total ÷ Nombre de Bons";
      appliedMath = `${Math.round(totalKg * 10) / 10} kg ÷ ${count} bon(s) = ~${avgKg} kg / bon en moyenne`;
      explanation = `Le tonnage total cumulé est calculé à partir de la somme exacte du poids de tous les articles ou colis déclarés dans chaque bon de transport de la période.`;

      metricCards = [
        { label: "Poids Total", value: `${Math.round(totalKg * 10) / 10} kg`, hint: `${count} expéditions`, color: "text-blue-600" },
        { label: "Poids Moyen", value: `${avgKg} kg / bon`, hint: "Moyenne arithmétique", color: "text-blue-600" },
        { label: "Plus lourd envoi", value: `${maxKg} kg`, hint: "Poids maximum", color: "text-slate-800 dark:text-slate-200" },
        { label: "Plus léger envoi", value: `${minKg} kg`, hint: "Poids minimum", color: "text-slate-800 dark:text-slate-200" }
      ];
    }

    // 4. TOTAL_COLIS & AVG_COLIS
    else if (target.type === 'TOTAL_COLIS' || target.type === 'AVG_COLIS') {
      icon = <Truck className="w-5 h-5 text-purple-600" />;
      let totalPieces = 0;
      let singleParcelCount = 0;
      let multiParcelCount = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        totalPieces += nums.colis;
        if (nums.colis === 1) singleParcelCount++;
        else multiParcelCount++;

        relevantVouchers.push({
          voucher: v,
          ...nums,
          customNote: `${nums.colis} colis`
        });
      });

      const count = periodVouchers.length;
      const avgPieces = count > 0 ? Number((totalPieces / count).toFixed(1)) : 0;

      formula = "Total Colis = Σ (Quantité de colis de chaque bon) | Colis Moyen = Total Colis ÷ Nombre de Bons";
      appliedMath = `${totalPieces} colis ÷ ${count} bon(s) = ~${avgPieces} colis / bon en moyenne`;
      explanation = `Comptabilise l'intégralité des unités de colis, caisses, valises ou cartons pris en charge dans la flotte ou confiés aux partenaires sur la période.`;

      metricCards = [
        { label: "Total Colis", value: `${totalPieces} colis`, hint: `${count} bons émis`, color: "text-purple-600" },
        { label: "Colis Moyen", value: `${avgPieces} colis / bon`, hint: "Ratio unitaire", color: "text-purple-600" },
        { label: "Mono-colis", value: `${singleParcelCount} bons`, hint: "Envois 1 seul colis", color: "text-slate-800 dark:text-slate-200" },
        { label: "Multi-colis", value: `${multiParcelCount} bons`, hint: "Envois 2+ colis", color: "text-slate-800 dark:text-slate-200" }
      ];
    }

    // 5. TOTAL_PAID (Encaissé Réel) & COLLECTION_RATE
    else if (target.type === 'TOTAL_PAID' || target.type === 'COLLECTION_RATE') {
      icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      let totalRev = 0;
      let totalPaid = 0;
      let totalFullPaid = 0;
      let totalAdvances = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        totalRev += nums.clientPrice;
        totalPaid += nums.paidAmount;
        if (nums.pInfo.type === 'PAYE') totalFullPaid += nums.paidAmount;
        if (nums.pInfo.type === 'AVANCE') totalAdvances += nums.paidAmount;

        if (nums.paidAmount > 0) {
          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `Encaissé : ${formatCurrency(nums.paidAmount, currency)} (${nums.pInfo.label})`
          });
        }
      });

      const rate = totalRev > 0 ? Math.round((totalPaid / totalRev) * 100) : 100;
      formula = "Encaissé Réel = Σ (Paiements Intégraux + Acomptes reçus) | Taux = (Encaissé ÷ Total Facturé) × 100";
      appliedMath = `${formatCurrency(totalPaid, currency)} encaissé sur ${formatCurrency(totalRev, currency)} facturé = ${rate}%`;
      explanation = `Montants réels entrés en caisse ou en compte bancaire. Inclut tous les bons réglés au comptant au moment du départ ainsi que les acomptes perçus à l'enregistrement.`;

      metricCards = [
        { label: "Total Encaissé", value: formatCurrency(totalPaid, currency), hint: `${rate}% du CA total`, color: "text-emerald-600" },
        { label: "Taux d'Encaissement", value: `${rate}%`, hint: "Objectif > 90%", color: "text-emerald-600" },
        { label: "Paiements 100% reçus", value: formatCurrency(totalFullPaid, currency), hint: "Règlement complet", color: "text-slate-800 dark:text-slate-200" },
        { label: "Acomptes perçus", value: formatCurrency(totalAdvances, currency), hint: "Avances versées", color: "text-amber-600" }
      ];
    }

    // 6. TOTAL_REMAINING (Reste à Recouvrer)
    else if (target.type === 'TOTAL_REMAINING') {
      icon = <Clock className="w-5 h-5 text-rose-600" />;
      let totalRev = 0;
      let totalRemaining = 0;
      let vouchersWithDueCount = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        totalRev += nums.clientPrice;
        totalRemaining += nums.remainingAmount;

        if (nums.remainingAmount > 0) {
          vouchersWithDueCount++;
          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `Solde restant dû : ${formatCurrency(nums.remainingAmount, currency)} (Sur ${formatCurrency(nums.clientPrice, currency)})`
          });
        }
      });

      const dueRate = totalRev > 0 ? Math.round((totalRemaining / totalRev) * 100) : 0;
      formula = "Reste à Recouvrer = Σ (Prix Facturé - Acompte Reçu) pour chaque bon non soldé";
      appliedMath = `${formatCurrency(totalRemaining, currency)} restant dû sur ${vouchersWithDueCount} bon(s) (${dueRate}% du CA)`;
      explanation = `Ce montant correspond aux créances clients en cours. Il sera exigé et encaissé auprès des destinataires lors du retrait ou de la livraison des colis en agence.`;

      metricCards = [
        { label: "Reste à Recouvrer", value: formatCurrency(totalRemaining, currency), hint: `${dueRate}% du CA période`, color: "text-rose-600" },
        { label: "Bons avec solde dû", value: `${vouchersWithDueCount} bon(s)`, hint: "À encaisser à l'arrivée", color: "text-rose-600" },
        { label: "CA Total Période", value: formatCurrency(totalRev, currency), hint: "Base de calcul", color: "text-slate-800 dark:text-slate-200" },
        { label: "Solde moyen par bon", value: formatCurrency(vouchersWithDueCount > 0 ? Math.round(totalRemaining / vouchersWithDueCount) : 0, currency), hint: "Par envoi en cours", color: "text-amber-600" }
      ];
    }

    // 7. EXTERNAL_COST, EXTERNAL_PAID, EXTERNAL_UNPAID (Sous-traitance)
    else if (target.type === 'EXTERNAL_COST' || target.type === 'EXTERNAL_PAID' || target.type === 'EXTERNAL_UNPAID') {
      icon = <ArrowRightLeft className="w-5 h-5 text-indigo-600" />;
      let totalCost = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;
      let totalClientRev = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        if (nums.isExternal) {
          totalCost += nums.externalCost;
          totalClientRev += nums.clientPrice;
          const isPaid = v.externalPaymentStatus === 'PAID';
          if (isPaid) totalPaid += nums.externalCost;
          else totalUnpaid += nums.externalCost;

          let shouldInclude = true;
          if (target.type === 'EXTERNAL_PAID' && !isPaid) shouldInclude = false;
          if (target.type === 'EXTERNAL_UNPAID' && isPaid) shouldInclude = false;

          if (shouldInclude) {
            relevantVouchers.push({
              voucher: v,
              ...nums,
              customNote: `Transporteur : ${v.externalCarrierName || 'Tiers'} | Coût tiers : ${formatCurrency(nums.externalCost, currency)} | ${isPaid ? 'RÉGLÉ' : 'À RÉGLER'}`
            });
          }
        }
      });

      formula = "Dépenses Sous-Traitance = Σ (Coût facturé par les transporteurs tiers) = Déjà Réglé + Reste à Régler";
      appliedMath = `${formatCurrency(totalCost, currency)} = ${formatCurrency(totalPaid, currency)} (Réglé) + ${formatCurrency(totalUnpaid, currency)} (Dettes fournisseurs)`;
      explanation = `Montants facturés par les transporteurs partenaires quand une expédition leur est sous-traitée. Permet de piloter exactement les dettes fournisseurs à régler et la trésorerie.`;

      metricCards = [
        { label: "Dépenses Totales", value: formatCurrency(totalCost, currency), hint: `${relevantVouchers.length} bons sous-traités`, color: "text-slate-800 dark:text-slate-200" },
        { label: "Déjà Réglé", value: formatCurrency(totalPaid, currency), hint: "Payé aux confrères", color: "text-emerald-600" },
        { label: "Dettes à Régler", value: formatCurrency(totalUnpaid, currency), hint: "Solde dû aux confrères", color: "text-amber-600" },
        { label: "CA Client Associé", value: formatCurrency(totalClientRev, currency), hint: `Marge : +${formatCurrency(totalClientRev - totalCost, currency)}`, color: "text-indigo-600" }
      ];
    }

    // 8. EXTERNAL_MARGIN (Marge Sous-Traitance)
    else if (target.type === 'EXTERNAL_MARGIN') {
      icon = <TrendingUp className="w-5 h-5 text-indigo-600" />;
      let totalClientRev = 0;
      let totalCost = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        if (nums.isExternal) {
          totalClientRev += nums.clientPrice;
          totalCost += nums.externalCost;

          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `Client: ${formatCurrency(nums.clientPrice, currency)} - Coût: ${formatCurrency(nums.externalCost, currency)} = Marge: +${formatCurrency(nums.margin, currency)}`
          });
        }
      });

      const margin = totalClientRev - totalCost;
      const marginRate = totalClientRev > 0 ? Math.round((margin / totalClientRev) * 100) : 0;

      formula = "Marge Sous-Traitance = CA Client sur bons sous-traités - Coûts des Transporteurs Partenaires";
      appliedMath = `${formatCurrency(totalClientRev, currency)} (Facturé Client) - ${formatCurrency(totalCost, currency)} (Coût Tiers) = +${formatCurrency(margin, currency)} (${marginRate}% de marge brute)`;
      explanation = `Bénéfice direct réalisé sur les expéditions confiées à des transporteurs tiers sans mobiliser notre propre flotte de véhicules.`;

      metricCards = [
        { label: "Marge Sous-Traitance", value: `+${formatCurrency(margin, currency)}`, hint: `${marginRate}% de rentabilité`, color: "text-indigo-600" },
        { label: "CA Facturé aux Clients", value: formatCurrency(totalClientRev, currency), hint: `${relevantVouchers.length} expéditions`, color: "text-slate-800 dark:text-slate-200" },
        { label: "Coûts Tiers Fournisseurs", value: formatCurrency(totalCost, currency), hint: "Dépenses reversées", color: "text-rose-600" },
        { label: "Taux de Marge", value: `${marginRate}%`, hint: "Marge brute sur sous-traitance", color: "text-emerald-600" }
      ];
    }

    // 9. GLOBAL_NET_PROFIT (Bénéfice Net Global Entreprise)
    else if (target.type === 'GLOBAL_NET_PROFIT') {
      icon = <DollarSign className="w-5 h-5 text-purple-600" />;
      let totalRev = 0;
      let totalExtCost = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        totalRev += nums.clientPrice;
        totalExtCost += nums.externalCost;

        relevantVouchers.push({
          voucher: v,
          ...nums,
          customNote: nums.isExternal 
            ? `Sous-traité : CA ${formatCurrency(nums.clientPrice, currency)} - Coût ${formatCurrency(nums.externalCost, currency)} = Profit +${formatCurrency(nums.margin, currency)}`
            : `Flotte propre : 100% conservé (+${formatCurrency(nums.clientPrice, currency)})`
        });
      });

      const netProfit = totalRev - totalExtCost;
      const profitRate = totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 100;

      formula = "Bénéfice Net Global = Chiffre d'Affaires Total de l'Entreprise - Dépenses Totales de Sous-Traitance";
      appliedMath = `${formatCurrency(totalRev, currency)} (CA Total) - ${formatCurrency(totalExtCost, currency)} (Dépenses Tiers) = +${formatCurrency(netProfit, currency)} (${profitRate}%)`;
      explanation = `Revenu net opérationnel restant pour Loyalis Trans après déduction intégrale des charges d'acheminement sous-traitées à des tiers.`;

      metricCards = [
        { label: "Bénéfice Net Global", value: `+${formatCurrency(netProfit, currency)}`, hint: `${profitRate}% de marge globale`, color: "text-purple-600" },
        { label: "Chiffre d'Affaires Total", value: formatCurrency(totalRev, currency), hint: `${periodVouchers.length} expéditions`, color: "text-slate-800 dark:text-slate-200" },
        { label: "Dépenses Confrères", value: formatCurrency(totalExtCost, currency), hint: "Dépenses sous-traitants", color: "text-rose-600" },
        { label: "Rentabilité Nette", value: `${profitRate}%`, hint: "Du CA conservé", color: "text-emerald-600" }
      ];
    }

    // 10. FLOTTE PROPRE vs SOUS-TRAITANCE
    else if (target.type === 'INTERNAL_FLEET' || target.type === 'EXTERNAL_FLEET') {
      const isInternal = target.type === 'INTERNAL_FLEET';
      icon = <Truck className="w-5 h-5 text-orange-500" />;
      let subCount = 0;
      let subRev = 0;
      let subWeight = 0;

      periodVouchers.forEach(v => {
        const nums = getVoucherNumbers(v);
        const match = isInternal ? !nums.isExternal : nums.isExternal;
        if (match) {
          subCount++;
          subRev += nums.clientPrice;
          subWeight += nums.weight;

          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: isInternal ? 'Acheminé par la flotte interne Loyalis' : `Confié à ${v.externalCarrierName || 'Transporteur Partenaire'}`
          });
        }
      });

      const totalCount = periodVouchers.length;
      const sharePct = totalCount > 0 ? Math.round((subCount / totalCount) * 100) : 0;

      formula = isInternal
        ? "Flotte Propre = Expéditions acheminées directement par nos véhicules (sans tiers)"
        : "Sous-Traitance = Expéditions confiées à un transporteur partenaire";
      appliedMath = `${subCount} bon(s) (${sharePct}% des volumes) pour ${formatCurrency(subRev, currency)} de CA`;
      explanation = isInternal
        ? `Expéditions réalisées avec nos camions propres. 100% du chiffre d'affaires est conservé sans frais de sous-traitance.`
        : `Expéditions confiées à un confrère partenaire. Une partie du tarif est reversée au transporteur tiers.`;

      metricCards = [
        { label: isInternal ? "Flotte Propre" : "Sous-traitance", value: `${subCount} bons`, hint: `${sharePct}% du total`, color: isInternal ? "text-orange-500" : "text-indigo-600" },
        { label: "Chiffre d'Affaires", value: formatCurrency(subRev, currency), hint: "CA généré", color: "text-emerald-600" },
        { label: "Poids Total", value: `${Math.round(subWeight)} kg`, hint: "Tonnage transporté", color: "text-blue-600" },
        { label: "Moyenne / Bon", value: formatCurrency(subCount > 0 ? Math.round(subRev / subCount) : 0, currency), hint: "Revenu unitaire", color: "text-slate-800 dark:text-slate-200" }
      ];
    }

    // 11. STATUS_FILTER (EN_ATTENTE, EN_TRANSIT, ARRIVE_AGENCE, LIVRE, ANNULE)
    else if (target.type.startsWith('STATUS_')) {
      const statusMap: Record<string, { label: string; key: VoucherStatus }> = {
        'STATUS_PENDING': { label: 'En attente', key: 'EN_ATTENTE' },
        'STATUS_IN_TRANSIT': { label: 'En transit', key: 'EN_TRANSIT' },
        'STATUS_ARRIVED': { label: 'Arrivé en agence', key: 'ARRIVE_AGENCE' },
        'STATUS_DELIVERED': { label: 'Livré / Retiré', key: 'LIVRE' },
        'STATUS_CANCELLED': { label: 'Annulé', key: 'ANNULE' }
      };

      const info = statusMap[target.type] || { label: target.title, key: 'EN_ATTENTE' as VoucherStatus };
      icon = <CheckCircle2 className="w-5 h-5 text-orange-500" />;
      let statusCount = 0;
      let statusRev = 0;
      let statusWeight = 0;
      let statusPaid = 0;
      let statusRemaining = 0;

      periodVouchers.forEach(v => {
        if (v.status === info.key) {
          statusCount++;
          const nums = getVoucherNumbers(v);
          statusRev += nums.clientPrice;
          statusWeight += nums.weight;
          statusPaid += nums.paidAmount;
          statusRemaining += nums.remainingAmount;

          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `Statut : ${info.label} | Encaissé : ${formatCurrency(nums.paidAmount, currency)} | Reste : ${formatCurrency(nums.remainingAmount, currency)}`
          });
        }
      });

      const totalCount = periodVouchers.length;
      const pct = totalCount > 0 ? Math.round((statusCount / totalCount) * 100) : 0;

      formula = `Statut ${info.label} = Nombre de bons portant le statut d'acheminement "${info.key}"`;
      appliedMath = `${statusCount} bon(s) sur ${totalCount} = ${pct}% de l'ensemble des flux`;
      explanation = `Ce filtre regroupe exactement tous les bons dont l'état actuel correspond à "${info.label}" sur la période active.`;

      metricCards = [
        { label: `Bons ${info.label}`, value: `${statusCount} bons`, hint: `${pct}% des flux période`, color: "text-orange-500" },
        { label: "Valeur Financière", value: formatCurrency(statusRev, currency), hint: "CA représenté", color: "text-emerald-600" },
        { label: "Poids Concerné", value: `${Math.round(statusWeight)} kg`, hint: "Masse en circulation", color: "text-blue-600" },
        { label: "Reste à Encaisser", value: formatCurrency(statusRemaining, currency), hint: "Sur ce statut", color: "text-rose-600" }
      ];
    }

    // 12. CARRIER (Transporteur Partenaire Spécifique)
    else if (target.type === 'CARRIER') {
      const carrierName = target.extraData?.carrierName || '';
      icon = <Building2 className="w-5 h-5 text-indigo-600" />;
      let carrierCount = 0;
      let clientRev = 0;
      let carrierCost = 0;
      let carrierPaid = 0;
      let carrierUnpaid = 0;

      periodVouchers.forEach(v => {
        const cName = (v.externalCarrierName && v.externalCarrierName.trim()) || 'Autre Transporteur / Non spécifié';
        if (cName === carrierName) {
          carrierCount++;
          const nums = getVoucherNumbers(v);
          clientRev += nums.clientPrice;
          carrierCost += nums.externalCost;
          if (v.externalPaymentStatus === 'PAID') carrierPaid += nums.externalCost;
          else carrierUnpaid += nums.externalCost;

          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `Réf Bon: ${v.externalCarrierVoucherRef || 'N/A'} | Coût: ${formatCurrency(nums.externalCost, currency)} | ${v.externalPaymentStatus === 'PAID' ? 'RÉGLÉ' : 'À RÉGLER'}`
          });
        }
      });

      const carrierMargin = clientRev - carrierCost;
      const marginRate = clientRev > 0 ? Math.round((carrierMargin / clientRev) * 100) : 0;

      formula = `Détail Partenaire "${carrierName}" = Dépenses Tiers + Marge Dégagée + Dettes en cours`;
      appliedMath = `CA Client (${formatCurrency(clientRev, currency)}) - Coût Tiers (${formatCurrency(carrierCost, currency)}) = Marge +${formatCurrency(carrierMargin, currency)} (${marginRate}%)`;
      explanation = `Historique et situation financière complète des expéditions confiées au transporteur partenaire "${carrierName}".`;

      metricCards = [
        { label: "Dépenses Totales", value: formatCurrency(carrierCost, currency), hint: `${carrierCount} expéditions`, color: "text-rose-600" },
        { label: "Marge Nette Dégagée", value: `+${formatCurrency(carrierMargin, currency)}`, hint: `${marginRate}% de marge`, color: "text-indigo-600" },
        { label: "Déjà Réglé", value: formatCurrency(carrierPaid, currency), hint: "Payé à ce transporteur", color: "text-emerald-600" },
        { label: "Reste à Régler", value: formatCurrency(carrierUnpaid, currency), hint: "Dette envers ce tiers", color: "text-amber-600" }
      ];
    }

    // 13. DESTINATION (Ville de Destination)
    else if (target.type === 'DESTINATION') {
      const destCity = target.extraData?.destinationCity || '';
      icon = <MapPin className="w-5 h-5 text-orange-500" />;
      let count = 0;
      let totalRev = 0;
      let totalWeight = 0;
      let totalColis = 0;

      periodVouchers.forEach(v => {
        const dest = v.destinationCity || v.recipient.destination || 'Autre';
        if (dest.toLowerCase().trim() === destCity.toLowerCase().trim()) {
          count++;
          const nums = getVoucherNumbers(v);
          totalRev += nums.clientPrice;
          totalWeight += nums.weight;
          totalColis += nums.colis;

          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `${nums.colis} colis | ${nums.weight} kg | ${formatCurrency(nums.clientPrice, currency)}`
          });
        }
      });

      const totalPeriodCount = periodVouchers.length;
      const pct = totalPeriodCount > 0 ? Math.round((count / totalPeriodCount) * 100) : 0;

      formula = `Destination ${destCity} = Σ (Bons à destination de ${destCity})`;
      appliedMath = `${count} expéditions (${pct}% du total) | CA = ${formatCurrency(totalRev, currency)} | Poids = ${Math.round(totalWeight)} kg`;
      explanation = `Statistiques opérationnelles et financières complètes pour toutes les expéditions acheminées vers ${destCity}.`;

      metricCards = [
        { label: `Envois vers ${destCity}`, value: `${count} bons`, hint: `${pct}% du total`, color: "text-orange-500" },
        { label: "Chiffre d'Affaires", value: formatCurrency(totalRev, currency), hint: "CA réalisé", color: "text-emerald-600" },
        { label: "Poids Total", value: `${Math.round(totalWeight)} kg`, hint: "Tonnage livré", color: "text-blue-600" },
        { label: "Prix Moyen Envoi", value: formatCurrency(count > 0 ? Math.round(totalRev / count) : 0, currency), hint: "Ticket moyen", color: "text-slate-800 dark:text-slate-200" }
      ];
    }

    // 14. DEPARTURE (Agence de Départ)
    else if (target.type === 'DEPARTURE') {
      const depCity = target.extraData?.departureCity || '';
      icon = <Building2 className="w-5 h-5 text-blue-600" />;
      let count = 0;
      let totalRev = 0;
      let totalWeight = 0;

      periodVouchers.forEach(v => {
        const dep = v.departureCity || settings.defaultDepartureCity || 'Casablanca';
        if (dep.toLowerCase().trim() === depCity.toLowerCase().trim()) {
          count++;
          const nums = getVoucherNumbers(v);
          totalRev += nums.clientPrice;
          totalWeight += nums.weight;

          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `Départ : ${depCity} ➔ Arrivée : ${v.destinationCity || v.recipient.destination}`
          });
        }
      });

      const totalPeriodCount = periodVouchers.length;
      const pct = totalPeriodCount > 0 ? Math.round((count / totalPeriodCount) * 100) : 0;

      formula = `Agence de Départ ${depCity} = Σ (Bons enregistrés depuis l'agence de ${depCity})`;
      appliedMath = `${count} expéditions émises (${pct}% du volume total) pour ${formatCurrency(totalRev, currency)} de CA`;
      explanation = `Activité et volume d'affaires générés au départ de l'agence de ${depCity}.`;

      metricCards = [
        { label: `Départs de ${depCity}`, value: `${count} bons`, hint: `${pct}% des émissions`, color: "text-blue-600" },
        { label: "Chiffre d'Affaires", value: formatCurrency(totalRev, currency), hint: "Émis à cette agence", color: "text-emerald-600" },
        { label: "Poids Pris en Charge", value: `${Math.round(totalWeight)} kg`, hint: "Tonnage collecté", color: "text-blue-600" },
        { label: "Moyenne / Envoi", value: formatCurrency(count > 0 ? Math.round(totalRev / count) : 0, currency), hint: "Panier moyen", color: "text-slate-800 dark:text-slate-200" }
      ];
    }

    // 15. CHART_BAR, TIME_SLOT, or DAY_OF_WEEK
    else {
      icon = <Calendar className="w-5 h-5 text-orange-500" />;
      let count = 0;
      let totalRev = 0;
      let totalWeight = 0;

      periodVouchers.forEach(v => {
        let match = false;
        if (target.extraData?.dateKey && v.date === target.extraData.dateKey) {
          match = true;
        } else if (target.extraData?.dayIdx !== undefined) {
          const vd = new Date(v.date ? `${v.date}T12:00:00` : v.createdAt);
          if (vd.getDay() === target.extraData.dayIdx) match = true;
        } else {
          match = true;
        }

        if (match) {
          count++;
          const nums = getVoucherNumbers(v);
          totalRev += nums.clientPrice;
          totalWeight += nums.weight;

          relevantVouchers.push({
            voucher: v,
            ...nums,
            customNote: `${v.date} ${v.time || ''} - ${formatCurrency(nums.clientPrice, currency)}`
          });
        }
      });

      formula = `Détail : ${target.title}`;
      appliedMath = `${count} expédition(s) pour un CA de ${formatCurrency(totalRev, currency)} et ${Math.round(totalWeight)} kg`;
      explanation = `Détail des expéditions correspondant à ce créneau ou point temporel.`;

      metricCards = [
        { label: "Bons Concernés", value: `${count} bons`, hint: "Volume", color: "text-orange-500" },
        { label: "Chiffre d'Affaires", value: formatCurrency(totalRev, currency), hint: "CA réalisé", color: "text-emerald-600" },
        { label: "Poids Total", value: `${Math.round(totalWeight)} kg`, hint: "Poids cumulé", color: "text-blue-600" }
      ];
    }

    return {
      title,
      icon,
      formula,
      appliedMath,
      explanation,
      metricCards,
      relevantVouchers
    };
  }, [target, periodVouchers, currency, settings, periodLabel]);

  // Filter vouchers in table by search term
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return details.relevantVouchers;
    const term = searchTerm.toLowerCase().trim();
    return details.relevantVouchers.filter(item => {
      const v = item.voucher;
      return (
        v.trackingNumber.toLowerCase().includes(term) ||
        v.sender.name.toLowerCase().includes(term) ||
        v.recipient.name.toLowerCase().includes(term) ||
        (v.destinationCity || v.recipient.destination || '').toLowerCase().includes(term) ||
        (v.departureCity || '').toLowerCase().includes(term) ||
        (v.externalCarrierName || '').toLowerCase().includes(term) ||
        (v.date || '').includes(term)
      );
    });
  }, [details.relevantVouchers, searchTerm]);

  // Export specific detail to Excel
  const handleExportDetailExcel = () => {
    if (details.relevantVouchers.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const rows = details.relevantVouchers.map(item => {
      const v = item.voucher;
      const statusBadge = getStatusBadge(v.status);
      const pInfo = getPaymentStatusInfo(v.paymentStatus || v.paymentMethod, v.advanceAmount || 0, item.clientPrice, v.remainingAmount);

      return {
        "N° Suivi": v.trackingNumber,
        "Date": v.date,
        "Heure": v.time || '',
        "Statut Acheminement": statusBadge.label,
        "Expéditeur": v.sender.name,
        "Tél Expéditeur": v.sender.phone,
        "Ville Départ": v.departureCity || settings.defaultDepartureCity || 'Casablanca',
        "Destinataire": v.recipient.name,
        "Tél Destinataire": v.recipient.phone,
        "Ville Destination": v.destinationCity || v.recipient.destination || '',
        "Nombre Colis": item.colis,
        "Poids (kg)": item.weight,
        "Prix Client (DH)": item.clientPrice,
        "Statut Paiement": pInfo.label,
        "Encaissé Réel (DH)": item.paidAmount,
        "Reste Dû (DH)": item.remainingAmount,
        "Sous-traité": v.isExternalTransport ? 'OUI' : 'NON',
        "Transporteur Partenaire": v.externalCarrierName || '',
        "Réf Bon Tiers": v.externalCarrierVoucherRef || '',
        "Coût Tiers (DH)": item.externalCost,
        "Marge Nette (DH)": item.margin,
        "Note Calcul": item.customNote || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Détail Calcul");

    const cleanTitle = (target?.title || 'Detail_Calcul').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `Loyalis_Calcul_${cleanTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
              {details.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                  Transparence & Audit de Calcul
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {periodLabel}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-0.5">
                {details.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDetailExcel}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              title="Exporter ces bons et calculs en Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel ({details.relevantVouchers.length})</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Fermer (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Mathematical Formula Box (Highlight Box) */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                Formule Mathématique & Décomposition
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {details.relevantVouchers.length} bon(s) pris en compte
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-slate-300 font-mono">
                <strong className="text-slate-400 uppercase text-[10px] block mb-0.5">Règle de calcul :</strong>
                {details.formula}
              </div>
              <div className="text-sm sm:text-base font-black text-orange-400 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {details.appliedMath}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              {details.explanation}
            </p>
          </div>

          {/* Key Metric Breakdowns (4 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {details.metricCards.map((card, idx) => (
              <div 
                key={idx} 
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  {card.label}
                </span>
                <span className={`text-lg sm:text-xl font-black font-mono block ${card.color || 'text-slate-900 dark:text-white'}`}>
                  {card.value}
                </span>
                {card.hint && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {card.hint}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Table of Vouchers Making Up This Calculation */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-orange-500" />
                  <span>Bons d'expédition composant ce calcul ({filteredList.length})</span>
                </h4>
              </div>

              {/* Search within calculation */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher bon, client, ville..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Table */}
            {filteredList.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr>
                      <th className="py-2.5 px-3">N° Suivi & Date</th>
                      <th className="py-2.5 px-3">Expéditeur & Départ</th>
                      <th className="py-2.5 px-3">Destinataire & Ville</th>
                      <th className="py-2.5 px-3 text-center">Colis / Poids</th>
                      <th className="py-2.5 px-3 text-right">Facturé Client</th>
                      <th className="py-2.5 px-3">Détail Contribution</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredList.map((item) => {
                      const v = item.voucher;
                      const statusBadge = getStatusBadge(v.status);

                      return (
                        <tr 
                          key={v.id} 
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-mono font-black text-slate-900 dark:text-white block">
                              {v.trackingNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {v.date} {v.time ? `• ${v.time}` : ''}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[140px]">
                              {v.sender.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {v.departureCity || settings.defaultDepartureCity || 'Casablanca'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[140px]">
                              {v.recipient.name}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              {v.destinationCity || v.recipient.destination}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 block">
                              {item.colis} colis
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.weight} kg
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-black text-slate-900 dark:text-white">
                            {formatCurrency(item.clientPrice, currency)}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 block">
                              {item.customNote || '-'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${statusBadge.bg} ${statusBadge.text} mt-0.5`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                              {statusBadge.label}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {onOpenVoucherDetail ? (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenVoucherDetail(v);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Ouvrir le bon d'expédition complet"
                              >
                                <span>Voir</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer with exact sums */}
                  <tfoot className="bg-slate-50 dark:bg-slate-800 text-xs font-black border-t-2 border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-slate-800 dark:text-slate-200 uppercase">
                        Sous-Total ({filteredList.length} bons)
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-800 dark:text-slate-200">
                        {filteredList.reduce((acc, it) => acc + it.colis, 0)} colis • {Math.round(filteredList.reduce((acc, it) => acc + it.weight, 0) * 10) / 10} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                        {formatCurrency(filteredList.reduce((acc, it) => acc + it.clientPrice, 0), currency)}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-slate-500 font-normal text-[10px]">
                        Somme exacte vérifiée
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Aucun bon ne correspond à ce filtre pour ce calcul.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-orange-500" />
            <span>Tous les calculs sont mis à jour en temps réel à chaque enregistrement ou modification.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDetailExcel}
              className="sm:hidden px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Export Excel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
