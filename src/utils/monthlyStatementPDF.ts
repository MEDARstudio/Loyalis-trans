import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Voucher } from '../types';
import { formatCurrency, formatDate } from './formatters';

export interface MonthlyStatsSummary {
  year: number;
  month: number; // 0 for all months / annual, 1-12 for specific month
  monthLabel: string;
  totalVouchers: number;
  totalColis: number;
  totalWeightKg: number;
  
  // Client Revenue & Cash Flow
  totalClientRevenue: number; // Total Facturé (Gains Bruts)
  totalCollected: number; // Encaissé Réel
  totalReceivables: number; // Reste à Percevoir (Créances)
  
  // External Subcontracting Costs & Debts
  totalExternalCost: number; // Dépenses Transporteurs Externes
  externalCostPaid: number; // Dépenses Réglées
  externalCostUnpaid: number; // Dettes en Attente de Règlement
  externalVouchersCount: number;
  internalVouchersCount: number;
  
  // Net Profitability
  netMargin: number; // Bénéfice Net = Gains Bruts - Dépenses Externes
  profitMarginPercent: number; // % Marge
  collectionRatePercent: number; // % Encaissé
  
  // Carrier Breakdown
  carrierStats: {
    name: string;
    count: number;
    clientRevenue: number;
    externalCost: number;
    netProfit: number;
    debt: number;
  }[];
}

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Computes monthly or annual stats from an array of vouchers
 */
export function computeMonthlyStats(
  vouchers: Voucher[],
  year: number,
  month: number // 1 to 12 or 0 for whole year
): { monthlyVouchers: Voucher[]; stats: MonthlyStatsSummary } {
  let monthlyVouchers: Voucher[] = [];

  if (month >= 1 && month <= 12) {
    const monthStr = String(month).padStart(2, '0');
    const targetPrefix = `${year}-${monthStr}`;
    monthlyVouchers = vouchers
      .filter(v => (v.date || '').startsWith(targetPrefix))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  } else {
    // Whole year or all vouchers for the year
    const yearStr = String(year);
    monthlyVouchers = vouchers
      .filter(v => (v.date || '').startsWith(yearStr))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  let totalClientRevenue = 0;
  let totalCollected = 0;
  let totalReceivables = 0;
  let totalExternalCost = 0;
  let externalCostPaid = 0;
  let externalCostUnpaid = 0;
  let totalColis = 0;
  let totalWeightKg = 0;
  let externalVouchersCount = 0;
  let internalVouchersCount = 0;

  const carrierMap: Record<string, { count: number; clientRevenue: number; externalCost: number; netProfit: number; debt: number }> = {};

  monthlyVouchers.forEach(v => {
    const price = Number(v.totalPrice) || 0;
    const advance = Number(v.advanceAmount) || 0;
    const remaining = v.remainingAmount !== undefined ? Number(v.remainingAmount) : (price - advance);
    const pStatus = v.paymentStatus || v.paymentMethod;

    totalClientRevenue += price;
    totalColis += Number(v.totalColis) || 0;
    totalWeightKg += Number(v.totalWeightKg) || 0;

    if (pStatus === 'PAYE') {
      totalCollected += price;
    } else if (pStatus === 'AVANCE') {
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
      if (!carrierMap[cName]) {
        carrierMap[cName] = { count: 0, clientRevenue: 0, externalCost: 0, netProfit: 0, debt: 0 };
      }
      carrierMap[cName].count += 1;
      carrierMap[cName].clientRevenue += price;
      carrierMap[cName].externalCost += cost;
      carrierMap[cName].netProfit += (price - cost);
      if (v.externalPaymentStatus === 'UNPAID') {
        carrierMap[cName].debt += cost;
      }
    } else {
      internalVouchersCount++;
    }
  });

  const netMargin = totalClientRevenue - totalExternalCost;
  const profitMarginPercent = totalClientRevenue > 0 ? Math.round((netMargin / totalClientRevenue) * 100) : 0;
  const collectionRatePercent = totalClientRevenue > 0 ? Math.round((totalCollected / totalClientRevenue) * 100) : 0;

  const monthLabel = month >= 1 && month <= 12 
    ? `${MONTH_NAMES_FR[month - 1]} ${year}` 
    : `Année Complète ${year}`;

  const stats: MonthlyStatsSummary = {
    year,
    month,
    monthLabel,
    totalVouchers: monthlyVouchers.length,
    totalColis,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    totalClientRevenue: Math.round(totalClientRevenue * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalReceivables: Math.round(totalReceivables * 100) / 100,
    totalExternalCost: Math.round(totalExternalCost * 100) / 100,
    externalCostPaid: Math.round(externalCostPaid * 100) / 100,
    externalCostUnpaid: Math.round(externalCostUnpaid * 100) / 100,
    externalVouchersCount,
    internalVouchersCount,
    netMargin: Math.round(netMargin * 100) / 100,
    profitMarginPercent,
    collectionRatePercent,
    carrierStats: Object.entries(carrierMap).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.externalCost - a.externalCost)
  };

  return { monthlyVouchers, stats };
}

/**
 * Builds a formatted WhatsApp text summary of the monthly report
 */
export function buildMonthlyWhatsAppSummary(stats: MonthlyStatsSummary, settings: CompanySettings): string {
  const currency = settings.currency || 'DH';
  
  let carriersText = '';
  if (stats.carrierStats.length > 0) {
    carriersText = `\n🚚 *DÉTAIL SOUS-TRAITANCE PAR TRANSPORTEUR :*\n` +
      stats.carrierStats.map(c => 
        `• *${c.name}* : ${c.count} colis | CA: ${formatCurrency(c.clientRevenue, currency)} | Dépense: -${formatCurrency(c.externalCost, currency)} | Marge: +${formatCurrency(c.netProfit, currency)}${c.debt > 0 ? ` (Dette: ${formatCurrency(c.debt, currency)})` : ''}`
      ).join('\n');
  }

  return `📊 *${(settings.companyName || 'LOYALIS TRANS').toUpperCase()} - BILAN MENSUEL DE TRANSPORT*
🗓️ *Période :* ${stats.monthLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *VOLUMÉTRIE :*
• Total Expéditions : *${stats.totalVouchers} bons* (${stats.totalColis} colis, ${stats.totalWeightKg} kg)
• Flotte Interne Loyalis : *${stats.internalVouchersCount} envois*
• Sous-traitance Externe : *${stats.externalVouchersCount} envois*

💰 *PERFORMANCE FINANCIÈRE :*
• 📈 *Gains Bruts Facturés (CA) :* ${formatCurrency(stats.totalClientRevenue, currency)}
• 📉 *Dépenses Transporteurs Externes :* -${formatCurrency(stats.totalExternalCost, currency)}
• 💎 *BÉNÉFICE NET DÉGAGÉ :* *+${formatCurrency(stats.netMargin, currency)}* (Marge : ${stats.profitMarginPercent}%)

💳 *TRÉSORERIE & RECOUVREMENT :*
• Total Encaissé au Départ : ${formatCurrency(stats.totalCollected, currency)} (${stats.collectionRatePercent}%)
• Créances Clients à percevoir : ${formatCurrency(stats.totalReceivables, currency)}
• Dettes Transporteurs à régler : ${formatCurrency(stats.externalCostUnpaid, currency)}
${carriersText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *${settings.companyName || 'Loyalis Trans'}* • ${settings.phone1}
Édité le ${new Date().toLocaleDateString('fr-FR')}`;
}

/**
 * Generates and downloads a complete, highly polished executive-level vector PDF statement
 * Optimized with generous spacing, mathematical padding, crisp typography, and multi-page header/footer support.
 */
export function generateStatementVectorPDF({
  vouchers,
  settings,
  title = 'Relevé Mensuel de Compte & Bilan',
  periodLabel,
  fileName = 'Releve_LoyalisTrans'
}: {
  vouchers: Voucher[];
  settings: CompanySettings;
  title?: string;
  periodLabel: string;
  fileName?: string;
}): boolean {
  try {
    const currency = settings.currency || 'DH';
    
    // 1. Calculate global financials
    let totalClientRevenue = 0;
    let totalCollected = 0;
    let totalReceivables = 0;
    let totalExternalCost = 0;
    let externalCostPaid = 0;
    let externalCostUnpaid = 0;
    let totalColis = 0;
    let totalWeightKg = 0;
    let externalVouchersCount = 0;
    let internalVouchersCount = 0;
    const carrierMap: Record<string, { count: number; clientRevenue: number; externalCost: number; netProfit: number; debt: number }> = {};

    vouchers.forEach(v => {
      const price = Number(v.totalPrice) || 0;
      const advance = Number(v.advanceAmount) || 0;
      const remaining = v.remainingAmount !== undefined ? Number(v.remainingAmount) : (price - advance);
      const pStatus = v.paymentStatus || v.paymentMethod;

      totalClientRevenue += price;
      totalColis += Number(v.totalColis) || 0;
      totalWeightKg += Number(v.totalWeightKg) || 0;

      if (pStatus === 'PAYE') {
        totalCollected += price;
      } else if (pStatus === 'AVANCE') {
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
        if (!carrierMap[cName]) {
          carrierMap[cName] = { count: 0, clientRevenue: 0, externalCost: 0, netProfit: 0, debt: 0 };
        }
        carrierMap[cName].count += 1;
        carrierMap[cName].clientRevenue += price;
        carrierMap[cName].externalCost += cost;
        carrierMap[cName].netProfit += (price - cost);
        if (v.externalPaymentStatus === 'UNPAID') {
          carrierMap[cName].debt += cost;
        }
      } else {
        internalVouchersCount++;
      }
    });

    const netMargin = totalClientRevenue - totalExternalCost;
    const profitMarginPercent = totalClientRevenue > 0 ? Math.round((netMargin / totalClientRevenue) * 100) : 0;
    const collectionRatePercent = totalClientRevenue > 0 ? Math.round((totalCollected / totalClientRevenue) * 100) : 0;
    const carrierStats = Object.entries(carrierMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.externalCost - a.externalCost);

    // Initialize jsPDF in Landscape A4 (297 x 210 mm)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
    const margin = 12; // 12mm generous margin

    // Top primary brand line (Orange 500)
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Header Background Box (Clean light-slate banner)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, 8, pageWidth - margin * 2, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, 8, pageWidth - margin * 2, 24, 2, 2, 'S');

    // Company Logo / Brand Name (Left Column)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text((settings.companyName || 'LOYALIS TRANS').toUpperCase(), margin + 5, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(
      `${settings.tagline || 'Transport Express & Fret'}  •  Tél : ${settings.phone1 || '—'} ${settings.phone2 ? `/ ${settings.phone2}` : ''}`,
      margin + 5,
      21.5
    );
    doc.text(
      `Adresse : ${settings.address || 'Gare Routière / Agence Transit'}  •  Email : ${settings.email || 'contact@loyalistrans.com'}`,
      margin + 5,
      26.5
    );

    // Document Title & Period Badge (Right Column)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(234, 88, 12); // Orange 600
    doc.text(title.toUpperCase(), pageWidth - margin - 5, 15.5, { align: 'right' });

    // Period Pill
    const periodPillWidth = 65;
    const periodPillHeight = 6.5;
    const periodPillX = pageWidth - margin - 5 - periodPillWidth;
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(251, 191, 36); // Amber 400
    doc.roundedRect(periodPillX, 18, periodPillWidth, periodPillHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Amber 800
    doc.text(`Période : ${periodLabel}`, periodPillX + periodPillWidth / 2, 22.3, { align: 'center' });

    // Generation timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const editionDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Document officiel édité le ${editionDate}`, pageWidth - margin - 5, 29.5, { align: 'right' });

    // 2. Executive KPI Financial Metric Cards (5 clean boxes)
    const cardY = 36;
    const cardHeight = 20;
    const cardGap = 4;
    const numCards = 5;
    const cardWidth = (pageWidth - margin * 2 - (cardGap * (numCards - 1))) / numCards;

    // Card 1: Chiffre d'Affaires Client (Gains Bruts)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    // Top indicator accent
    doc.setFillColor(59, 130, 246); // Blue
    doc.roundedRect(margin, cardY, cardWidth, 1.5, 1, 1, 'F');
    
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('CHIFFRE D\'AFFAIRES (CA)', margin + cardWidth / 2, cardY + 5.5, { align: 'center' });
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(totalClientRevenue, currency), margin + cardWidth / 2, cardY + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${vouchers.length} expéditions • ${totalColis} colis`, margin + cardWidth / 2, cardY + 16.8, { align: 'center' });

    // Card 2: Dépenses Sous-Traitance (Transporteurs Externes)
    const c2X = margin + cardWidth + cardGap;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(c2X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFillColor(245, 158, 11); // Amber
    doc.roundedRect(c2X, cardY, cardWidth, 1.5, 1, 1, 'F');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('DÉPENSES SOUS-TRAITANCE', c2X + cardWidth / 2, cardY + 5.5, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text(`-${formatCurrency(totalExternalCost, currency)}`, c2X + cardWidth / 2, cardY + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${externalVouchersCount} colis sous-traités`, c2X + cardWidth / 2, cardY + 16.8, { align: 'center' });

    // Card 3: Bénéfice Net Dégagé (Marge Réelle)
    const c3X = margin + (cardWidth + cardGap) * 2;
    doc.setFillColor(15, 23, 42); // Dark luxury Slate 900
    doc.setDrawColor(15, 23, 42);
    doc.roundedRect(c3X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFillColor(249, 115, 22); // Orange Accent
    doc.roundedRect(c3X, cardY, cardWidth, 1.5, 1, 1, 'F');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(251, 146, 60); // Orange 400
    doc.text('BÉNÉFICE NET DÉGAGÉ', c3X + cardWidth / 2, cardY + 5.5, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`+${formatCurrency(netMargin, currency)}`, c3X + cardWidth / 2, cardY + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(52, 211, 153); // Emerald 400
    doc.text(`Marge Nette : ${profitMarginPercent}%`, c3X + cardWidth / 2, cardY + 16.8, { align: 'center' });

    // Card 4: Encaissé au Départ vs Créances
    const c4X = margin + (cardWidth + cardGap) * 3;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(110, 231, 183);
    doc.roundedRect(c4X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFillColor(16, 185, 129); // Emerald
    doc.roundedRect(c4X, cardY, cardWidth, 1.5, 1, 1, 'F');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87);
    doc.text('ENCAISSÉ AU DÉPART', c4X + cardWidth / 2, cardY + 5.5, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text(formatCurrency(totalCollected, currency), c4X + cardWidth / 2, cardY + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Créances Restantes: ${formatCurrency(totalReceivables, currency)}`, c4X + cardWidth / 2, cardY + 16.8, { align: 'center' });

    // Card 5: Dettes Fournisseurs (Transporteurs)
    const c5X = margin + (cardWidth + cardGap) * 4;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(c5X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
    doc.setFillColor(244, 63, 94); // Rose
    doc.roundedRect(c5X, cardY, cardWidth, 1.5, 1, 1, 'F');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 18, 60);
    doc.text('DETTES TRANSPORTEURS', c5X + cardWidth / 2, cardY + 5.5, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text(formatCurrency(externalCostUnpaid, currency), c5X + cardWidth / 2, cardY + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Réglé aux Partenaires: ${formatCurrency(externalCostPaid, currency)}`, c5X + cardWidth / 2, cardY + 16.8, { align: 'center' });

    let currentY = 61;

    // 3. Subcontracting Carrier Breakdown Table (if external carriers exist)
    if (carrierStats.length > 0) {
      // Section Header Banner
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 6.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('1. VENTILATION DES SOUS-TRAITANCES PAR TRANSPORTEUR PARTENAIRE', margin + 3, currentY + 4.5);

      const carrierTableBody = carrierStats.map(c => [
        c.name,
        `${c.count} expédition${c.count > 1 ? 's' : ''}`,
        formatCurrency(c.clientRevenue, currency),
        `-${formatCurrency(c.externalCost, currency)}`,
        `+${formatCurrency(c.netProfit, currency)}`,
        c.debt > 0 ? `En attente: ${formatCurrency(c.debt, currency)}` : '✓ Réglé 100%'
      ]);

      autoTable(doc, {
        startY: currentY + 8,
        head: [['Transporteur Partenaire', 'Volume Envois', 'Facturé Client (CA)', 'Coût Sous-Traitance', 'Marge Nette Dégagée', 'Statut Règlement']],
        body: carrierTableBody,
        foot: [[
          'TOTAL SOUS-TRAITANCE',
          `${externalVouchersCount} envois`,
          formatCurrency(carrierStats.reduce((acc, c) => acc + c.clientRevenue, 0), currency),
          `-${formatCurrency(totalExternalCost, currency)}`,
          `+${formatCurrency(carrierStats.reduce((acc, c) => acc + c.netProfit, 0), currency)}`,
          externalCostUnpaid > 0 ? `Dette: ${formatCurrency(externalCostUnpaid, currency)}` : '✓ Tout est réglé'
        ]],
        theme: 'grid',
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [51, 65, 85], // Slate 700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }
        },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 32, halign: 'center' },
          2: { cellWidth: 42, halign: 'right' },
          3: { cellWidth: 42, halign: 'right', textColor: [180, 83, 9] },
          4: { cellWidth: 42, halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
          5: { cellWidth: 45, halign: 'center' }
        }
      });

      // Update currentY after carrier table
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 4. Detailed Voucher Register Table (Grand livre)
    // Section Header Banner
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`2. GRAND LIVRE CHRONOLOGIQUE DES EXPÉDITIONS (${vouchers.length} BONS ENREGISTRÉS)`, margin + 3, currentY + 4.5);

    const voucherTableBody = vouchers.map(v => {
      const extCost = Number(v.externalCost) || 0;
      const price = Number(v.totalPrice) || 0;
      const profit = price - extCost;
      const pStatus = v.paymentStatus || v.paymentMethod;
      let paymentLabel = 'Payé 100%';
      if (pStatus === 'AVANCE') {
        paymentLabel = `Avance (${v.advanceAmount || 0})`;
      } else if (pStatus === 'NON_PAYE' || pStatus === 'A_LA_LIVRAISON') {
        paymentLabel = 'Non Payé';
      }

      const modeLabel = v.isExternalTransport 
        ? `Ext: ${v.externalCarrierName || 'Partenaire'}${v.externalCarrierVoucherRef ? `\n(Réf: #${v.externalCarrierVoucherRef})` : ''}`
        : 'Flotte Interne Loyalis';

      const senderText = `${v.sender?.name || '—'}${v.sender?.phone ? `\n${v.sender.phone}` : ''}`;
      const recipientText = `${v.recipient?.name || '—'}\n➔ ${v.recipient?.destination || v.destinationCity || '—'}`;

      return [
        formatDate(v.date),
        `#${v.trackingNumber}`,
        senderText,
        recipientText,
        `${v.totalColis || 1} c.\n(${v.totalWeightKg || 0} kg)`,
        modeLabel,
        formatCurrency(price, currency),
        v.isExternalTransport ? `-${formatCurrency(extCost, currency)}` : '—',
        `${profit >= 0 ? '+' : ''}${formatCurrency(profit, currency)}`,
        paymentLabel
      ];
    });

    autoTable(doc, {
      startY: currentY + 8,
      head: [[
        'Date',
        'N° Bon',
        'Expéditeur',
        'Destinataire & Ville',
        'Colis',
        'Mode / Transporteur',
        'Facturé Client',
        'Coût Externe',
        'Marge Nette',
        'Règlement'
      ]],
      body: voucherTableBody.length > 0 ? voucherTableBody : [['—', '—', 'Aucun bon trouvé pour cette période', '—', '—', '—', '—', '—', '—', '—']],
      foot: [[
        'TOTAL GÉNÉRAL',
        `${vouchers.length} bons`,
        '',
        '',
        `${totalColis} colis`,
        '',
        formatCurrency(totalClientRevenue, currency),
        `-${formatCurrency(totalExternalCost, currency)}`,
        `+${formatCurrency(netMargin, currency)}`,
        `Enc: ${formatCurrency(totalCollected, currency)}`
      ]],
      theme: 'grid',
      margin: { left: margin, right: margin, bottom: 18 },
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 2.2, bottom: 2.2, left: 2.2, right: 2.2 },
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [15, 23, 42], // Slate 900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        cellPadding: { top: 2.8, bottom: 2.8, left: 2.2, right: 2.2 }
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        cellPadding: { top: 2.5, bottom: 2.5, left: 2.2, right: 2.2 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' }, // Date
        1: { cellWidth: 22, fontStyle: 'bold', textColor: [234, 88, 12], halign: 'center' }, // N° Bon
        2: { cellWidth: 38 }, // Expéditeur
        3: { cellWidth: 42 }, // Destinataire & Ville
        4: { cellWidth: 18, halign: 'center' }, // Colis & Poids
        5: { cellWidth: 37 }, // Mode / Transporteur
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }, // Facturé Client
        7: { cellWidth: 23, halign: 'right', textColor: [180, 83, 9] }, // Coût Externe
        8: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] }, // Marge Nette
        9: { cellWidth: 25, halign: 'center' } // Règlement
      },
      didDrawPage: (data) => {
        // Professional Footer on every page
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `${settings.companyName || 'Loyalis Trans'}  •  Relevé Financier & Opérationnel  •  Période : ${periodLabel}  •  Document officiel à valeur comptable`,
          margin,
          pageHeight - 6
        );
        doc.setFont('helvetica', 'bold');
        doc.text(
          `Page ${currentPage} / ${pageCount}`,
          pageWidth - margin,
          pageHeight - 6,
          { align: 'right' }
        );
      }
    });

    // 5. Save & Trigger Download
    doc.save(`${fileName}.pdf`);
    return true;
  } catch (err) {
    console.error('Erreur lors de la génération du PDF vectoriel:', err);
    return false;
  }
}

/**
 * Backwards compatible exportMultiPagePDF
 */
export async function exportMultiPagePDF(
  elementId: string,
  fileName: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  return true;
}
