import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Package, 
  Scale, 
  Coins, 
  Truck, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Building2,
  DollarSign,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
  Wallet,
  Receipt,
  Phone,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Share2,
  ExternalLink
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStats, VoucherStatus } from '../types';
import { formatCurrency, formatDate, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';
import * as XLSX from 'xlsx';

export type TimePeriodPreset = 
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

interface StatsDashboardProps {
  stats: VoucherStats | null;
  vouchers: Voucher[];
  settings: CompanySettings;
  onOpenExcelExport: () => void;
  onFilterByStatus: (status: string) => void;
}

// Helpers for date calculations
function parseVoucherDate(v: Voucher): Date {
  if (v.date) {
    const parts = v.date.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
  }
  if (v.createdAt) {
    const d = new Date(v.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatDateToInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  stats: globalStats,
  vouchers,
  settings,
  onOpenExcelExport,
  onFilterByStatus
}) => {
  const currency = settings.currency || 'DH';

  // Period Preset State
  const [selectedPreset, setSelectedPreset] = useState<TimePeriodPreset>('THIS_MONTH');
  
  // Custom Date Range State
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return formatDateToInput(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return formatDateToInput(new Date());
  });

  // Reference Date for week/month/day offset navigation
  const [navOffset, setNavOffset] = useState<number>(0);

  // Metric View Toggle for Charts
  const [chartMetric, setChartMetric] = useState<'REVENUE' | 'COUNT' | 'WEIGHT'>('REVENUE');

  // Subcontracting / External Carrier Filter States
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('ALL');
  const [selectedCarrierPaymentFilter, setSelectedCarrierPaymentFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [showSubcontractedTable, setShowSubcontractedTable] = useState<boolean>(true);

  // Compute active date range based on selectedPreset and navOffset
  const { startDate, endDate, periodLabel, previousStartDate, previousEndDate } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let prevStart = new Date(now);
    let prevEnd = new Date(now);
    let label = '';

    if (selectedPreset === 'ALL') {
      // Find oldest voucher date or 1 year ago
      let oldestDate = new Date(now);
      if (vouchers.length > 0) {
        vouchers.forEach(v => {
          const vd = parseVoucherDate(v);
          if (vd < oldestDate) oldestDate = vd;
        });
      } else {
        oldestDate.setFullYear(oldestDate.getFullYear() - 1);
      }
      start = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), oldestDate.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      label = "Tout l'historique";
      prevStart = new Date(start);
      prevEnd = new Date(end);
    } else if (selectedPreset === 'TODAY') {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + navOffset);
      start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
      end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
      
      const prevTarget = new Date(targetDate);
      prevTarget.setDate(prevTarget.getDate() - 1);
      prevStart = new Date(prevTarget.getFullYear(), prevTarget.getMonth(), prevTarget.getDate(), 0, 0, 0);
      prevEnd = new Date(prevTarget.getFullYear(), prevTarget.getMonth(), prevTarget.getDate(), 23, 59, 59);

      if (navOffset === 0) {
        label = "Aujourd'hui (" + targetDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ")";
      } else {
        label = targetDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    } else if (selectedPreset === 'YESTERDAY') {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - 1 + navOffset);
      start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
      end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
      
      const prevTarget = new Date(targetDate);
      prevTarget.setDate(prevTarget.getDate() - 1);
      prevStart = new Date(prevTarget.getFullYear(), prevTarget.getMonth(), prevTarget.getDate(), 0, 0, 0);
      prevEnd = new Date(prevTarget.getFullYear(), prevTarget.getMonth(), prevTarget.getDate(), 23, 59, 59);

      label = "Hier (" + targetDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ")";
    } else if (selectedPreset === 'THIS_WEEK' || selectedPreset === 'LAST_WEEK') {
      const baseDate = new Date(now);
      const weekShift = (selectedPreset === 'LAST_WEEK' ? -1 : 0) + navOffset;
      baseDate.setDate(baseDate.getDate() + weekShift * 7);

      // Get Monday of that week (0 = Sunday, 1 = Monday, ...)
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(baseDate.setDate(diff));
      start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      end = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59);

      // Previous week for comparison
      const prevMonday = new Date(monday);
      prevMonday.setDate(prevMonday.getDate() - 7);
      prevStart = new Date(prevMonday.getFullYear(), prevMonday.getMonth(), prevMonday.getDate(), 0, 0, 0);
      const prevSunday = new Date(prevMonday);
      prevSunday.setDate(prevSunday.getDate() + 6);
      prevEnd = new Date(prevSunday.getFullYear(), prevSunday.getMonth(), prevSunday.getDate(), 23, 59, 59);

      label = `Semaine du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (selectedPreset === 'THIS_MONTH' || selectedPreset === 'LAST_MONTH') {
      const monthShift = (selectedPreset === 'LAST_MONTH' ? -1 : 0) + navOffset;
      const targetYear = now.getFullYear();
      const targetMonth = now.getMonth() + monthShift;
      
      start = new Date(targetYear, targetMonth, 1, 0, 0, 0);
      end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

      // Previous month for comparison
      prevStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
      prevEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      label = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    } else if (selectedPreset === 'THIS_QUARTER') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const targetQuarter = currentQuarter + navOffset;
      const startMonth = targetQuarter * 3;
      
      start = new Date(now.getFullYear(), startMonth, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59);

      // Previous quarter for comparison
      prevStart = new Date(now.getFullYear(), startMonth - 3, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), startMonth, 0, 23, 59, 59);

      const qNumber = (Math.floor(start.getMonth() / 3) + 1);
      label = `Trimestre T${qNumber} ${start.getFullYear()} (${start.toLocaleDateString('fr-FR', { month: 'short' })} - ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })})`;
    } else if (selectedPreset === 'THIS_YEAR') {
      const targetYear = now.getFullYear() + navOffset;
      start = new Date(targetYear, 0, 1, 0, 0, 0);
      end = new Date(targetYear, 11, 31, 23, 59, 59);

      // Previous year
      prevStart = new Date(targetYear - 1, 0, 1, 0, 0, 0);
      prevEnd = new Date(targetYear - 1, 11, 31, 23, 59, 59);

      label = `Année ${targetYear}`;
    } else if (selectedPreset === 'CUSTOM') {
      const sParts = customStartDate.split('-');
      const eParts = customEndDate.split('-');
      if (sParts.length === 3 && eParts.length === 3) {
        start = new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]), 0, 0, 0);
        end = new Date(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]), 23, 59, 59);
      }
      
      const durationMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - durationMs);

      label = `Du ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }

    return { startDate: start, endDate: end, periodLabel: label, previousStartDate: prevStart, previousEndDate: prevEnd };
  }, [selectedPreset, navOffset, customStartDate, customEndDate, vouchers]);

  // Filter vouchers within the active period
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const vDate = parseVoucherDate(v);
      return vDate >= startDate && vDate <= endDate;
    });
  }, [vouchers, startDate, endDate]);

  // Filter vouchers in previous equivalent period for trend calculations
  const previousPeriodVouchers = useMemo(() => {
    if (selectedPreset === 'ALL') return [];
    return vouchers.filter(v => {
      const vDate = parseVoucherDate(v);
      return vDate >= previousStartDate && vDate <= previousEndDate;
    });
  }, [vouchers, previousStartDate, previousEndDate, selectedPreset]);

  // Calculate dynamic metrics for current period
  const periodMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalAdvance = 0;
    let totalRemaining = 0;
    let totalWeight = 0;
    let totalColis = 0;
    let pendingCount = 0;
    let inTransitCount = 0;
    let arrivedCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    // External Carrier / Subcontracting metrics
    let totalExternalVouchersCount = 0;
    let totalExternalCost = 0;
    let totalExternalPaid = 0;
    let totalExternalUnpaid = 0;
    let totalExternalRevenue = 0;
    const carriersMap: Record<string, {
      name: string;
      count: number;
      totalCost: number;
      paidCost: number;
      unpaidCost: number;
      clientRevenue: number;
      margin: number;
      phones: string[];
    }> = {};
    const externalVouchersList: Voucher[] = [];

    const destinations: Record<string, { count: number; weight: number; revenue: number }> = {};
    const departureAgencies: Record<string, { count: number; weight: number; revenue: number }> = {};
    const agentsMap: Record<string, { count: number; revenue: number }> = {};
    const hourlyDistribution: number[] = new Array(24).fill(0);
    const dayOfWeekDistribution: number[] = new Array(7).fill(0); // 0 = Dim, 1 = Lun, ...

    filteredVouchers.forEach(v => {
      const price = v.totalPrice || 0;
      totalRevenue += price;
      totalWeight += v.totalWeightKg || 0;
      const itemsColisCount = v.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;
      totalColis += v.totalColis || itemsColisCount;

      // Subcontracting / External Carrier check
      const isExternal = v.isExternalTransport === true || (v.externalCost && v.externalCost > 0) || Boolean(v.externalCarrierName && v.externalCarrierName.trim());
      if (isExternal) {
        totalExternalVouchersCount++;
        const extCost = v.externalCost || 0;
        totalExternalCost += extCost;
        totalExternalRevenue += price;
        externalVouchersList.push(v);

        const isPaid = v.externalPaymentStatus === 'PAID';
        if (isPaid) {
          totalExternalPaid += extCost;
        } else {
          totalExternalUnpaid += extCost;
        }

        const carrierKey = (v.externalCarrierName && v.externalCarrierName.trim()) || 'Autre Transporteur / Non spécifié';
        if (!carriersMap[carrierKey]) {
          carriersMap[carrierKey] = {
            name: carrierKey,
            count: 0,
            totalCost: 0,
            paidCost: 0,
            unpaidCost: 0,
            clientRevenue: 0,
            margin: 0,
            phones: []
          };
        }
        carriersMap[carrierKey].count++;
        carriersMap[carrierKey].totalCost += extCost;
        if (isPaid) {
          carriersMap[carrierKey].paidCost += extCost;
        } else {
          carriersMap[carrierKey].unpaidCost += extCost;
        }
        carriersMap[carrierKey].clientRevenue += price;
        carriersMap[carrierKey].margin += (price - extCost);
        if (v.externalCarrierPhone?.trim() && !carriersMap[carrierKey].phones.includes(v.externalCarrierPhone.trim())) {
          carriersMap[carrierKey].phones.push(v.externalCarrierPhone.trim());
        }
      }

      // Status
      if (v.status === 'EN_ATTENTE') pendingCount++;
      else if (v.status === 'EN_TRANSIT') inTransitCount++;
      else if (v.status === 'ARRIVE_AGENCE') arrivedCount++;
      else if (v.status === 'LIVRE') deliveredCount++;
      else if (v.status === 'ANNULE') cancelledCount++;

      // Payments
      const paymentInfo = getPaymentStatusInfo(
        v.paymentStatus || v.paymentMethod,
        v.advanceAmount || 0,
        price,
        v.remainingAmount
      );
      totalPaid += paymentInfo.advance;
      totalRemaining += paymentInfo.remaining;
      if (paymentInfo.type === 'AVANCE') totalAdvance += paymentInfo.advance;

      // Destination
      const dest = v.destinationCity || v.recipient.destination || 'Autre';
      if (!destinations[dest]) destinations[dest] = { count: 0, weight: 0, revenue: 0 };
      destinations[dest].count++;
      destinations[dest].weight += v.totalWeightKg || 0;
      destinations[dest].revenue += price;

      // Departure
      const dep = v.departureCity || settings.defaultDepartureCity || 'Casablanca';
      if (!departureAgencies[dep]) departureAgencies[dep] = { count: 0, weight: 0, revenue: 0 };
      departureAgencies[dep].count++;
      departureAgencies[dep].weight += v.totalWeightKg || 0;
      departureAgencies[dep].revenue += price;

      // Agent
      const agentName = v.createdByAgent || v.agentName || v.validatedBy || 'Standard';
      if (!agentsMap[agentName]) agentsMap[agentName] = { count: 0, revenue: 0 };
      agentsMap[agentName].count++;
      agentsMap[agentName].revenue += price;

      // Time & Day distributions
      const vDate = parseVoucherDate(v);
      const dayIdx = vDate.getDay();
      dayOfWeekDistribution[dayIdx]++;

      if (v.time) {
        const h = parseInt(v.time.split(':')[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) {
          hourlyDistribution[h]++;
        }
      } else if (v.createdAt) {
        const d = new Date(v.createdAt);
        if (!isNaN(d.getTime())) {
          hourlyDistribution[d.getHours()]++;
        }
      }
    });

    const totalVouchers = filteredVouchers.length;
    const avgWeight = totalVouchers > 0 ? Math.round((totalWeight / totalVouchers) * 10) / 10 : 0;
    const avgRevenue = totalVouchers > 0 ? Math.round(totalRevenue / totalVouchers) : 0;
    const avgColis = totalVouchers > 0 ? Math.round((totalColis / totalVouchers) * 10) / 10 : 0;
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 100;
    const deliveryRate = totalVouchers > 0 ? Math.round((deliveredCount / totalVouchers) * 100) : 0;

    // Subcontracting net margin & profit calculations
    const netSubcontractedMargin = totalExternalRevenue - totalExternalCost;
    const subcontractedMarginRate = totalExternalRevenue > 0 ? Math.round((netSubcontractedMargin / totalExternalRevenue) * 100) : 0;
    const globalNetProfit = totalRevenue - totalExternalCost;
    const globalNetProfitRate = totalRevenue > 0 ? Math.round((globalNetProfit / totalRevenue) * 100) : 100;
    const internalVouchersCount = totalVouchers - totalExternalVouchersCount;
    const internalRevenue = totalRevenue - totalExternalRevenue;

    return {
      totalVouchers,
      totalRevenue,
      totalPaid,
      totalAdvance,
      totalRemaining,
      totalWeight,
      totalColis,
      avgWeight,
      avgRevenue,
      avgColis,
      collectionRate,
      deliveryRate,
      pendingCount,
      inTransitCount,
      arrivedCount,
      deliveredCount,
      cancelledCount,
      destinations: Object.entries(destinations).sort((a, b) => b[1].count - a[1].count),
      departureAgencies: Object.entries(departureAgencies).sort((a, b) => b[1].count - a[1].count),
      agents: Object.entries(agentsMap).sort((a, b) => b[1].count - a[1].count),
      hourlyDistribution,
      dayOfWeekDistribution,
      // External / Subcontracting exports
      totalExternalVouchersCount,
      totalExternalCost,
      totalExternalPaid,
      totalExternalUnpaid,
      totalExternalRevenue,
      netSubcontractedMargin,
      subcontractedMarginRate,
      globalNetProfit,
      globalNetProfitRate,
      internalVouchersCount,
      internalRevenue,
      carriersList: Object.values(carriersMap).sort((a, b) => b.totalCost - a.totalCost),
      externalVouchersList: externalVouchersList.sort((a, b) => (b.externalCost || 0) - (a.externalCost || 0))
    };
  }, [filteredVouchers, settings.defaultDepartureCity]);

  // Calculate previous period metrics for trends
  const prevPeriodMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalWeight = 0;
    let totalColis = 0;
    const totalVouchers = previousPeriodVouchers.length;

    previousPeriodVouchers.forEach(v => {
      totalRevenue += v.totalPrice || 0;
      totalWeight += v.totalWeightKg || 0;
      const itemsColisCount = v.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;
      totalColis += v.totalColis || itemsColisCount;
    });

    return {
      totalVouchers,
      totalRevenue,
      totalWeight,
      totalColis
    };
  }, [previousPeriodVouchers]);

  // Compute trend percentages
  const trends = useMemo(() => {
    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    return {
      vouchers: calcTrend(periodMetrics.totalVouchers, prevPeriodMetrics.totalVouchers),
      revenue: calcTrend(periodMetrics.totalRevenue, prevPeriodMetrics.totalRevenue),
      weight: calcTrend(periodMetrics.totalWeight, prevPeriodMetrics.totalWeight),
      colis: calcTrend(periodMetrics.totalColis, prevPeriodMetrics.totalColis)
    };
  }, [periodMetrics, prevPeriodMetrics]);

  // Chronological aggregation for chart visualization
  const chartData = useMemo(() => {
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Grouping strategy: If <= 35 days, group by Day. If > 35 days and <= 180 days, group by Week. If > 180 days, group by Month.
    if (diffDays <= 35) {
      // By Day
      const daysMap: Record<string, { label: string; count: number; revenue: number; weight: number }> = {};
      
      // Initialize all days in the range
      const curr = new Date(startDate);
      while (curr <= endDate) {
        const key = formatDateToInput(curr);
        const label = curr.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        daysMap[key] = { label, count: 0, revenue: 0, weight: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      filteredVouchers.forEach(v => {
        const key = formatDateToInput(parseVoucherDate(v));
        if (daysMap[key]) {
          daysMap[key].count++;
          daysMap[key].revenue += v.totalPrice || 0;
          daysMap[key].weight += v.totalWeightKg || 0;
        }
      });

      return Object.values(daysMap);
    } else {
      // By Month
      const monthsMap: Record<string, { label: string; count: number; revenue: number; weight: number }> = {};
      
      const curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (curr <= endDate) {
        const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
        const label = curr.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        monthsMap[key] = { label, count: 0, revenue: 0, weight: 0 };
        curr.setMonth(curr.getMonth() + 1);
      }

      filteredVouchers.forEach(v => {
        const vd = parseVoucherDate(v);
        const key = `${vd.getFullYear()}-${String(vd.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap[key]) {
          monthsMap[key].count++;
          monthsMap[key].revenue += v.totalPrice || 0;
          monthsMap[key].weight += v.totalWeightKg || 0;
        }
      });

      return Object.values(monthsMap);
    }
  }, [filteredVouchers, startDate, endDate]);

  // Max value for chart scaling
  const chartMax = useMemo(() => {
    if (chartData.length === 0) return 1;
    let max = 0;
    chartData.forEach(item => {
      const val = chartMetric === 'REVENUE' ? item.revenue : chartMetric === 'COUNT' ? item.count : item.weight;
      if (val > max) max = val;
    });
    return max > 0 ? max : 1;
  }, [chartData, chartMetric]);

  // Export filtered vouchers to Excel
  const handleExportFilteredExcel = () => {
    if (filteredVouchers.length === 0) {
      alert("Aucune donnée disponible pour la période sélectionnée.");
      return;
    }

    const rows = filteredVouchers.map(v => {
      const paymentInfo = getPaymentStatusInfo(
        v.paymentStatus || v.paymentMethod,
        v.advanceAmount || 0,
        v.totalPrice,
        v.remainingAmount
      );
      const statusBadge = getStatusBadge(v.status);

      return {
        "N° Suivi": v.trackingNumber,
        "Date": v.date,
        "Heure": v.time || '',
        "Statut": statusBadge.label,
        "Expéditeur": v.sender.name,
        "Tél Expéditeur": v.sender.phone,
        "Ville Départ": v.departureCity || settings.defaultDepartureCity || 'Casablanca',
        "Destinataire": v.recipient.name,
        "Tél Destinataire": v.recipient.phone,
        "Ville Destination": v.destinationCity || v.recipient.destination || '',
        "Nombre de Colis": v.totalColis || v.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1,
        "Poids Total (kg)": v.totalWeightKg || 0,
        "Prix Total (DH)": v.totalPrice || 0,
        "Statut Paiement": paymentInfo.label,
        "Montant Encaissé (DH)": paymentInfo.advance,
        "Reste à Payer (DH)": paymentInfo.remaining,
        "Sous-traitance Tiers": v.isExternalTransport ? 'OUI' : 'NON',
        "Transporteur Partenaire": v.externalCarrierName || '',
        "Réf Bon Tiers": v.externalCarrierVoucherRef || '',
        "Tél Transporteur": v.externalCarrierPhone || '',
        "Coût Dépense Tiers (DH)": v.externalCost || 0,
        "Statut Règlement Tiers": v.externalPaymentStatus === 'PAID' ? 'RÉGLÉ' : (v.isExternalTransport ? 'À RÉGLER' : ''),
        "Marge Dégagée (DH)": v.isExternalTransport ? ((v.totalPrice || 0) - (v.externalCost || 0)) : (v.totalPrice || 0),
        "Enregistré par": v.createdByAgent || v.agentName || v.validatedBy || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bons Filtrés");

    const cleanLabel = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Loyalis_Trans_Rapport_${cleanLabel}_${formatDateToInput(new Date())}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Day names for day-of-week breakdown
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const maxDayCount = Math.max(...periodMetrics.dayOfWeekDistribution, 1);

  // Hourly slots grouped into periods (Matin, Midi, Après-midi, Soirée)
  const hourlySlots = [
    { label: '08h - 10h', count: (periodMetrics.hourlyDistribution[8] || 0) + (periodMetrics.hourlyDistribution[9] || 0) },
    { label: '10h - 12h', count: (periodMetrics.hourlyDistribution[10] || 0) + (periodMetrics.hourlyDistribution[11] || 0) },
    { label: '12h - 14h', count: (periodMetrics.hourlyDistribution[12] || 0) + (periodMetrics.hourlyDistribution[13] || 0) },
    { label: '14h - 16h', count: (periodMetrics.hourlyDistribution[14] || 0) + (periodMetrics.hourlyDistribution[15] || 0) },
    { label: '16h - 18h', count: (periodMetrics.hourlyDistribution[16] || 0) + (periodMetrics.hourlyDistribution[17] || 0) },
    { label: '18h - 20h', count: (periodMetrics.hourlyDistribution[18] || 0) + (periodMetrics.hourlyDistribution[19] || 0) },
    { label: '20h - 23h', count: (periodMetrics.hourlyDistribution[20] || 0) + (periodMetrics.hourlyDistribution[21] || 0) + (periodMetrics.hourlyDistribution[22] || 0) + (periodMetrics.hourlyDistribution[23] || 0) }
  ];
  const maxHourlyCount = Math.max(...hourlySlots.map(s => s.count), 1);

  // Subcontracted / External vouchers filtered by carrier and payment status
  const displayedExternalVouchers = useMemo(() => {
    return periodMetrics.externalVouchersList.filter(v => {
      if (selectedCarrierFilter !== 'ALL') {
        const cName = (v.externalCarrierName && v.externalCarrierName.trim()) || 'Autre Transporteur / Non spécifié';
        if (cName !== selectedCarrierFilter) return false;
      }
      if (selectedCarrierPaymentFilter !== 'ALL') {
        const isPaid = v.externalPaymentStatus === 'PAID';
        if (selectedCarrierPaymentFilter === 'PAID' && !isPaid) return false;
        if (selectedCarrierPaymentFilter === 'UNPAID' && isPaid) return false;
      }
      return true;
    });
  }, [periodMetrics.externalVouchersList, selectedCarrierFilter, selectedCarrierPaymentFilter]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Bold Typography & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-slate-900 dark:text-white leading-none tracking-tight">
              Tableau de Bord & Analytique
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-mono text-xs font-black uppercase tracking-wider border border-orange-200 dark:border-orange-800">
              {periodMetrics.totalVouchers} bons
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1.5 flex items-center gap-1.5">
            <span>Analyse des flux, chiffre d'affaires et acheminements pour :</span>
            <strong className="text-slate-800 dark:text-slate-200 font-semibold underline decoration-orange-500 underline-offset-2">
              {periodLabel}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportFilteredExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            title="Exporter les données de la période sélectionnée en Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Période ({periodMetrics.totalVouchers})</span>
          </button>

          <button
            onClick={onOpenExcelExport}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
            title="Export complet multi-onglets"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export Global</span>
          </button>
        </div>
      </div>

      {/* Advanced Time & Date Filter Selector Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Preset Selection Buttons (Scrollable on Mobile) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 mr-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span>Période :</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar flex-1">
            {[
              { id: 'ALL', label: 'Tout' },
              { id: 'TODAY', label: "Aujourd'hui" },
              { id: 'YESTERDAY', label: 'Hier' },
              { id: 'THIS_WEEK', label: 'Cette Semaine' },
              { id: 'LAST_WEEK', label: 'Semaine Passée' },
              { id: 'THIS_MONTH', label: 'Ce Mois' },
              { id: 'LAST_MONTH', label: 'Mois Dernier' },
              { id: 'THIS_QUARTER', label: 'Ce Trimestre' },
              { id: 'THIS_YEAR', label: 'Cette Année' },
              { id: 'CUSTOM', label: 'Personnalisé...' }
            ].map(preset => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id as TimePeriodPreset);
                    setNavOffset(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Navigation & Custom Date Controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Quick Date Step Navigator (< / >) */}
          {selectedPreset !== 'ALL' && selectedPreset !== 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNavOffset(prev => prev - 1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors"
                title="Période précédente"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Précédent</span>
              </button>

              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 text-center min-w-[140px]">
                {periodLabel}
              </div>

              <button
                onClick={() => setNavOffset(prev => prev + 1)}
                disabled={navOffset >= 0}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors ${
                  navOffset >= 0
                    ? 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
                title="Période suivante"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {navOffset !== 0 && (
                <button
                  onClick={() => setNavOffset(0)}
                  className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 hover:bg-orange-200 text-xs font-bold flex items-center gap-1"
                  title="Revenir à la période actuelle"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">Actuel</span>
                </button>
              )}
            </div>
          )}

          {/* Custom Date Pickers when CUSTOM is active */}
          {selectedPreset === 'CUSTOM' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Du :</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Au :</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* Period Summary Tag */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Plage : <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(formatDateToInput(startDate))}</span> au <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(formatDateToInput(endDate))}</span>
          </div>

        </div>

      </div>

      {/* Primary KPI Grid (4 Dynamic Cards with Bold Numbers and Period Comparisons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Vouchers (Hero Slate Card with Orange Accent) */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-slate-800 shadow-lg space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Expéditions</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-3xl sm:text-4xl font-black text-orange-500 font-mono tracking-tight">
            {periodMetrics.totalVouchers}
          </div>
          
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
            <span className="text-slate-400 font-medium">Sur cette période</span>
            {selectedPreset !== 'ALL' && (
              <span className={`inline-flex items-center gap-0.5 font-bold font-mono text-[11px] ${
                trends.vouchers >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {trends.vouchers >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {trends.vouchers >= 0 ? `+${trends.vouchers}%` : `${trends.vouchers}%`}
              </span>
            )}
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chiffre d'Affaires</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {formatCurrency(periodMetrics.totalRevenue, currency)}
          </div>
          
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 font-semibold">Moy. : ~{formatCurrency(periodMetrics.avgRevenue, currency)}/bon</span>
            {selectedPreset !== 'ALL' && (
              <span className={`inline-flex items-center gap-0.5 font-bold font-mono text-[11px] ${
                trends.revenue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {trends.revenue >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {trends.revenue >= 0 ? `+${trends.revenue}%` : `${trends.revenue}%`}
              </span>
            )}
          </div>
        </div>

        {/* Total Weight */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poids Total</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {Math.round(periodMetrics.totalWeight * 10) / 10} <span className="text-sm font-bold text-slate-400">kg</span>
          </div>
          
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 font-semibold">Moy. : ~{periodMetrics.avgWeight} kg/bon</span>
            {selectedPreset !== 'ALL' && (
              <span className={`inline-flex items-center gap-0.5 font-bold font-mono text-[11px] ${
                trends.weight >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {trends.weight >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {trends.weight >= 0 ? `+${trends.weight}%` : `${trends.weight}%`}
              </span>
            )}
          </div>
        </div>

        {/* Total Colis Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre de Colis</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {periodMetrics.totalColis} <span className="text-sm font-bold text-slate-400">colis</span>
          </div>
          
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 font-semibold">Moy. : ~{periodMetrics.avgColis} colis/bon</span>
            <span className="text-xs font-bold text-purple-600 font-mono">
              Livrés : {periodMetrics.deliveryRate}%
            </span>
          </div>
        </div>

      </div>

      {/* Financial Status Summary: Encaissements vs Reste à Recouvrer */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Synthèse Financière & Recouvrement ({periodLabel})</span>
          </h3>
          <div className="text-xs font-bold text-slate-500">
            Taux d'encaissement : <strong className="text-emerald-600 font-mono text-sm">{periodMetrics.collectionRate}%</strong>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          <div 
            className="bg-emerald-500 h-full transition-all duration-500" 
            style={{ width: `${periodMetrics.totalRevenue > 0 ? (periodMetrics.totalPaid / periodMetrics.totalRevenue) * 100 : 100}%` }}
            title={`Encaissé: ${formatCurrency(periodMetrics.totalPaid, currency)}`}
          />
          <div 
            className="bg-rose-500 h-full transition-all duration-500" 
            style={{ width: `${periodMetrics.totalRevenue > 0 ? (periodMetrics.totalRemaining / periodMetrics.totalRevenue) * 100 : 0}%` }}
            title={`Reste à recouvrer: ${formatCurrency(periodMetrics.totalRemaining, currency)}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Montant Total Facturé */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Facturé</span>
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">
              {formatCurrency(periodMetrics.totalRevenue, currency)}
            </span>
          </div>

          {/* Montant Réellement Encaissé */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">Encaissé Réel</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 font-mono mt-1 block">
              {formatCurrency(periodMetrics.totalPaid, currency)}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Comptant & Acomptes reçus</span>
          </div>

          {/* Reste à Recouvrer (À la livraison) */}
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 block">Reste à Recouvrer</span>
              <Clock className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-xl font-black text-rose-900 dark:text-rose-200 font-mono mt-1 block">
              {formatCurrency(periodMetrics.totalRemaining, currency)}
            </span>
            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">À encaisser à la livraison</span>
          </div>

        </div>
      </div>

      {/* SECTION: DÉPENSES CHEZ AUTRES TRANSPORTEURS & SOUS-TRAITANCE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        
        {/* Header with Title and Global Ratio */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Dépenses Autres Transporteurs & Sous-Traitance
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {periodMetrics.totalExternalVouchersCount} bon{periodMetrics.totalExternalVouchersCount > 1 ? 's' : ''} sous-traité{periodMetrics.totalExternalVouchersCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Suivi financier des expéditions confiées à des transporteurs tiers, dettes fournisseurs, règlements et marges nettes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubcontractedTable(!showSubcontractedTable)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {showSubcontractedTable ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Masquer le registre
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Afficher le registre ({periodMetrics.totalExternalVouchersCount})
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5 Financial Metric Cards for External Transport */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* 1. Dépenses Totales Transporteurs Tiers */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Dépenses Sous-Traitance</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">
                {formatCurrency(periodMetrics.totalExternalCost, currency)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-2 block">
              Coût total facturé par les confrères
            </span>
          </div>

          {/* 2. Dépenses Déjà Réglées */}
          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">Déjà Réglé</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 font-mono mt-1 block">
                {formatCurrency(periodMetrics.totalExternalPaid, currency)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-2 block">
              Payé / Quittancé aux transporteurs
            </span>
          </div>

          {/* 3. Dettes Fournisseurs (Reste à Payer) */}
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">Reste à Régler</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-xl font-black text-amber-900 dark:text-amber-200 font-mono mt-1 block">
                {formatCurrency(periodMetrics.totalExternalUnpaid, currency)}
              </span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-2 block">
              Dettes en cours chez les sous-traitants
            </span>
          </div>

          {/* 4. Marge Nette Dégagée sur Sous-Traitance */}
          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300 block">Marge Sous-Traitance</span>
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 font-mono">
                  {periodMetrics.subcontractedMarginRate}%
                </span>
              </div>
              <span className="text-xl font-black text-indigo-900 dark:text-indigo-200 font-mono mt-1 block">
                {formatCurrency(periodMetrics.netSubcontractedMargin, currency)}
              </span>
            </div>
            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium mt-2 block">
              CA Client ({formatCurrency(periodMetrics.totalExternalRevenue, currency)}) - Coût Tiers
            </span>
          </div>

          {/* 5. Bénéfice Net Global Entreprise */}
          <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300 block">Bénéfice Net Global</span>
                <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 font-mono">
                  {periodMetrics.globalNetProfitRate}%
                </span>
              </div>
              <span className="text-xl font-black text-purple-900 dark:text-purple-200 font-mono mt-1 block">
                {formatCurrency(periodMetrics.globalNetProfit, currency)}
              </span>
            </div>
            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium mt-2 block">
              CA Total - Dépenses Transporteurs
            </span>
          </div>

        </div>

        {/* Visual Comparison: Flotte Interne vs Sous-Traitance */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              Répartition Flotte Loyalis Trans vs Transporteurs Partenaires
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Total : {periodMetrics.totalVouchers} expédition{periodMetrics.totalVouchers > 1 ? 's' : ''} ({formatCurrency(periodMetrics.totalRevenue, currency)})
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
            <div 
              className="bg-orange-500 h-full transition-all duration-500" 
              style={{ width: `${periodMetrics.totalVouchers > 0 ? (periodMetrics.internalVouchersCount / periodMetrics.totalVouchers) * 100 : 100}%` }}
              title={`Flotte Propre: ${periodMetrics.internalVouchersCount} bons (${formatCurrency(periodMetrics.internalRevenue, currency)})`}
            />
            <div 
              className="bg-indigo-500 h-full transition-all duration-500" 
              style={{ width: `${periodMetrics.totalVouchers > 0 ? (periodMetrics.totalExternalVouchersCount / periodMetrics.totalVouchers) * 100 : 0}%` }}
              title={`Sous-traitance: ${periodMetrics.totalExternalVouchersCount} bons (${formatCurrency(periodMetrics.totalExternalRevenue, currency)})`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span><strong>Flotte Loyalis Trans :</strong> {periodMetrics.internalVouchersCount} bons ({formatCurrency(periodMetrics.internalRevenue, currency)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span><strong>Sous-traitance Tiers :</strong> {periodMetrics.totalExternalVouchersCount} bons ({formatCurrency(periodMetrics.totalExternalRevenue, currency)}) - Coût: {formatCurrency(periodMetrics.totalExternalCost, currency)}</span>
            </div>
          </div>
        </div>

        {/* Breakdown by Carrier Partner */}
        {periodMetrics.carriersList.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Répartition par Transporteur Partenaire
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {periodMetrics.carriersList.map((carrier) => {
                const isSelected = selectedCarrierFilter === carrier.name;
                const carrierMarginRate = carrier.clientRevenue > 0 ? Math.round((carrier.margin / carrier.clientRevenue) * 100) : 0;
                
                return (
                  <div 
                    key={carrier.name}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {carrier.name}
                        </h5>
                        {carrier.phones.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{carrier.phones.join(', ')}</span>
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {carrier.count} bon{carrier.count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Dépense Totale</span>
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          {formatCurrency(carrier.totalCost, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Marge Dégagée</span>
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(carrier.margin, currency)} ({carrierMarginRate}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 uppercase font-bold block">Réglé</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(carrier.paidCost, currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 uppercase font-bold block">En Attente</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(carrier.unpaidCost, currency)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 flex items-center justify-end">
                      <button
                        onClick={() => setSelectedCarrierFilter(isSelected ? 'ALL' : carrier.name)}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? 'Filtre actif (Cliquez pour désactiver)' : 'Filtrer ce transporteur'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Subcontracted Vouchers Table */}
        {showSubcontractedTable && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            
            {/* Filter Bar for Table */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  Filtrer :
                </span>
                
                {/* Transporteur Filter */}
                <select
                  value={selectedCarrierFilter}
                  onChange={(e) => setSelectedCarrierFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Tous les transporteurs</option>
                  {periodMetrics.carriersList.map(c => (
                    <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                  ))}
                </select>

                {/* Statut Paiement Transporteur Filter */}
                <select
                  value={selectedCarrierPaymentFilter}
                  onChange={(e) => setSelectedCarrierPaymentFilter(e.target.value as any)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Tous les statuts de règlement</option>
                  <option value="PAID">Réglés uniquement</option>
                  <option value="UNPAID">À régler uniquement (Dettes)</option>
                </select>

                {(selectedCarrierFilter !== 'ALL' || selectedCarrierPaymentFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSelectedCarrierFilter('ALL');
                      setSelectedCarrierPaymentFilter('ALL');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              <span className="text-xs font-mono font-bold text-slate-500">
                {displayedExternalVouchers.length} résultat{displayedExternalVouchers.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            {displayedExternalVouchers.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">N° Suivi & Date</th>
                      <th className="py-2.5 px-3">Trajet & Destinataire</th>
                      <th className="py-2.5 px-3">Transporteur Tiers</th>
                      <th className="py-2.5 px-3 text-right">Facturé Client</th>
                      <th className="py-2.5 px-3 text-right">Dépense Tiers</th>
                      <th className="py-2.5 px-3 text-right">Marge Nette</th>
                      <th className="py-2.5 px-3 text-center">Règlement Fournisseur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {displayedExternalVouchers.map((v) => {
                      const clientPrice = v.totalPrice || 0;
                      const carrierCost = v.externalCost || 0;
                      const margin = clientPrice - carrierCost;
                      const isPaid = v.externalPaymentStatus === 'PAID';

                      return (
                        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-black text-slate-900 dark:text-white block">
                              {v.trackingNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">{v.date}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {v.recipient.name}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              {v.departureCity || settings.defaultDepartureCity || 'Casablanca'} ➔ {v.destinationCity || v.recipient.destination}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-black text-indigo-700 dark:text-indigo-400 block">
                              {v.externalCarrierName || 'Non spécifié'}
                            </span>
                            {v.externalCarrierVoucherRef && (
                              <span className="text-[10px] font-mono text-slate-500 block">
                                Réf: {v.externalCarrierVoucherRef}
                              </span>
                            )}
                            {v.externalCarrierPhone && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                {v.externalCarrierPhone}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(clientPrice, currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(carrierCost, currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(margin, currency)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                <Check className="w-2.5 h-2.5" />
                                Réglé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                <Clock className="w-2.5 h-2.5" />
                                À régler
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <ArrowRightLeft className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Aucun bon sous-traité ne correspond aux critères sur cette période.
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Chronological Evolution Chart (Interactive Bar Visualization) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-600" />
              <span>Évolution Temporelle sur la Période ({periodLabel})</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Distribution chronologique {chartData.length > 0 ? (chartData.length > 20 ? 'journalière' : 'hebdomadaire/mensuelle') : ''}
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setChartMetric('REVENUE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMetric === 'REVENUE'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Chiffre d'Affaires
            </button>
            <button
              onClick={() => setChartMetric('COUNT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMetric === 'COUNT'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Nombre de Bons
            </button>
            <button
              onClick={() => setChartMetric('WEIGHT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                chartMetric === 'WEIGHT'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Poids (kg)
            </button>
          </div>
        </div>

        {/* Dynamic Chart Container */}
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            Aucun bon enregistré pour la période sélectionnée.
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex items-end gap-1.5 sm:gap-2 h-48 sm:h-56 overflow-x-auto pb-6 pt-4 px-2 no-scrollbar">
              {chartData.map((item, idx) => {
                const value = chartMetric === 'REVENUE' ? item.revenue : chartMetric === 'COUNT' ? item.count : item.weight;
                const heightPercent = Math.max(6, Math.round((value / chartMax) * 100));

                const barColor = 
                  chartMetric === 'REVENUE' 
                    ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500' 
                    : chartMetric === 'COUNT'
                    ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500'
                    : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500';

                return (
                  <div 
                    key={idx} 
                    className="flex-1 min-w-[28px] sm:min-w-[36px] max-w-[50px] flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[11px] font-mono py-1 px-2 rounded shadow-lg whitespace-nowrap z-20">
                      <div className="font-bold">{item.label}</div>
                      <div>
                        {chartMetric === 'REVENUE' && formatCurrency(item.revenue, currency)}
                        {chartMetric === 'COUNT' && `${item.count} bon(s)`}
                        {chartMetric === 'WEIGHT' && `${item.weight} kg`}
                      </div>
                    </div>

                    {/* Value on top of bar if high enough */}
                    {value > 0 && (
                      <span className="text-[9px] font-mono text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {chartMetric === 'REVENUE' ? `${Math.round(value / 1000)}k` : value}
                      </span>
                    )}

                    {/* Bar Pill */}
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-300 ${barColor}`}
                      style={{ height: `${heightPercent}%` }}
                    />

                    {/* X-axis Label */}
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-2 truncate w-full text-center group-hover:text-slate-800 dark:group-hover:text-slate-200">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Status Breakdown Pipeline for this period */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Répartition par État d'Acheminement ({periodLabel} • Cliquez pour filtrer la liste)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          
          {/* En attente */}
          <button
            onClick={() => onFilterByStatus('EN_ATTENTE')}
            className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-left hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">En attente</span>
            <span className="text-2xl font-black text-amber-900 dark:text-amber-200 font-mono mt-1 block">
              {periodMetrics.pendingCount}
            </span>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-1 block">À expédier</span>
          </button>

          {/* En transit */}
          <button
            onClick={() => onFilterByStatus('EN_TRANSIT')}
            className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-left hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 block">En transit</span>
            <span className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono mt-1 block">
              {periodMetrics.inTransitCount}
            </span>
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-1 block">Sur la route</span>
          </button>

          {/* Arrivé agence */}
          <button
            onClick={() => onFilterByStatus('ARRIVE_AGENCE')}
            className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 text-left hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300 block">Arrivé Agence</span>
            <span className="text-2xl font-black text-purple-900 dark:text-purple-200 font-mono mt-1 block">
              {periodMetrics.arrivedCount}
            </span>
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 mt-1 block">Prêt au retrait</span>
          </button>

          {/* Livré */}
          <button
            onClick={() => onFilterByStatus('LIVRE')}
            className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-left hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">Livré</span>
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 font-mono mt-1 block">
              {periodMetrics.deliveredCount}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">Terminé</span>
          </button>

          {/* Annulé */}
          <button
            onClick={() => onFilterByStatus('ANNULE')}
            className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-left hover:ring-2 hover:ring-rose-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 block">Annulé</span>
            <span className="text-2xl font-black text-rose-900 dark:text-rose-200 font-mono mt-1 block">
              {periodMetrics.cancelledCount}
            </span>
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 mt-1 block">Non abouti</span>
          </button>

        </div>
      </div>

      {/* Hourly & Day-of-Week Peak Time Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hourly Rush Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span>Créneaux Horaires de Pointe (Enregistrements)</span>
          </h3>

          <div className="space-y-2.5">
            {hourlySlots.map((slot, idx) => {
              const pct = maxHourlyCount > 0 ? Math.round((slot.count / maxHourlyCount) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300 font-mono">{slot.label}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-mono">{slot.count} bon(s)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day of Week Peak Activity */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Jours de Forte Affluence (Semaine)</span>
          </h3>

          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
              const count = periodMetrics.dayOfWeekDistribution[dayIdx] || 0;
              const pct = maxDayCount > 0 ? Math.round((count / maxDayCount) * 100) : 0;
              return (
                <div key={dayIdx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300">{dayNames[dayIdx]}</span>
                    <span className="text-purple-600 dark:text-purple-400 font-mono">{count} bon(s)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Operational Breakdown: Top Destinations & Top Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Destinations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span>Top Destinations ({periodLabel})</span>
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Classé par volume</span>
          </div>

          {periodMetrics.destinations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              Aucune donnée sur cette période.
            </div>
          ) : (
            <div className="space-y-2.5">
              {periodMetrics.destinations.slice(0, 6).map(([destName, data]) => {
                const maxDestCount = periodMetrics.destinations[0][1].count || 1;
                const pct = Math.round((data.count / maxDestCount) * 100);
                return (
                  <div
                    key={destName}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                        {destName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-orange-600 dark:text-orange-400 font-mono">
                          {data.count} bon(s)
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-bold">
                          {formatCurrency(data.revenue, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Departure Agencies & Agents */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Agences de Départ & Opérateurs</span>
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Période active</span>
          </div>

          {periodMetrics.departureAgencies.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              Aucune donnée sur cette période.
            </div>
          ) : (
            <div className="space-y-2.5">
              {periodMetrics.departureAgencies.slice(0, 6).map(([depName, data]) => {
                const maxDepCount = periodMetrics.departureAgencies[0][1].count || 1;
                const pct = Math.round((data.count / maxDepCount) * 100);
                return (
                  <div
                    key={depName}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                        {depName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                          {data.count} bon(s)
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-bold">
                          {Math.round(data.weight)} kg
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
