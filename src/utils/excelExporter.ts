import * as XLSX from 'xlsx';
import { CompanySettings, Voucher } from '../types';
import { formatDate, getPaymentMethodLabel, getStatusBadge } from './formatters';

export interface ExcelExportOptions {
  fileName?: string;
  includeItemsBreakdown?: boolean;
  selectedFields?: {
    trackingNumber?: boolean;
    date?: boolean;
    senderName?: boolean;
    senderCin?: boolean;
    senderPhone?: boolean;
    senderAddress?: boolean;
    recipientName?: boolean;
    recipientDestination?: boolean;
    recipientPhone?: boolean;
    departureCity?: boolean;
    totalColis?: boolean;
    totalWeightKg?: boolean;
    totalPrice?: boolean;
    paymentMethod?: boolean;
    status?: boolean;
    itemsSummary?: boolean;
    notes?: boolean;
    createdAt?: boolean;
  };
}

export function exportVouchersToExcel(
  vouchers: Voucher[],
  settings: CompanySettings,
  options?: ExcelExportOptions
) {
  const currency = settings.currency || 'DH';
  const rows: Record<string, any>[] = [];

  vouchers.forEach((v, index) => {
    const itemsDescription = v.items
      .map(it => `${it.quantity}x ${it.nature} (${it.weightKg} kg)`)
      .join(' | ');

    const row: Record<string, any> = {};

    row['N°'] = index + 1;
    row['N° Suivi'] = v.trackingNumber;
    row['Date'] = formatDate(v.date);
    row['Ville Départ'] = v.departureCity || '-';
    row['Expéditeur'] = v.sender.name;
    row['CIN Expéditeur'] = v.sender.cin || '-';
    row['Téléphone Expéditeur'] = v.sender.phone;
    row['Adresse Expéditeur'] = v.sender.address || '-';
    row['Destinataire'] = v.recipient.name;
    row['Destination / Ville'] = v.recipient.destination;
    row['Téléphone Destinataire'] = v.recipient.phone;
    row['Nombre de Colis'] = v.totalColis;
    row['Poids Total (kg)'] = v.totalWeightKg;
    row[`Prix Total Client (${currency})`] = v.totalPrice;
    row['Mode Transport'] = v.isExternalTransport ? `Sous-traité (${v.externalCarrierName || 'Externe'})` : 'Flotte Loyalis Trans';
    row['Réf Transporteur Externe'] = v.externalCarrierVoucherRef || '-';
    row[`Coût Transporteur Externe (${currency})`] = v.isExternalTransport ? (v.externalCost || 0) : 0;
    row[`Bénéfice Net Dégagé (${currency})`] = v.isExternalTransport ? (v.totalPrice - (v.externalCost || 0)) : v.totalPrice;
    row['Règlement Transporteur'] = v.isExternalTransport ? (v.externalPaymentStatus === 'PAID' ? 'Réglé' : 'À Régler (Dette)') : '-';
    row['Mode de Paiement Client'] = getPaymentMethodLabel(v.paymentStatus || v.paymentMethod);
    row[`Avance Versée (${currency})`] = v.advanceAmount || 0;
    row[`Reste à Payer (${currency})`] = v.remainingAmount !== undefined ? v.remainingAmount : (v.totalPrice - (v.advanceAmount || 0));
    row['Statut Colis'] = getStatusBadge(v.status).label;
    row['Détail des Bagages'] = itemsDescription;
    row['Observations / Notes'] = v.notes || '-';
    row['Notes Sous-traitance'] = v.externalNotes || '-';
    row['Date Création'] = new Date(v.createdAt).toLocaleString('fr-FR');

    rows.push(row);
  });

  // Calculate totals
  const totalColisSum = vouchers.reduce((acc, v) => acc + (v.totalColis || 0), 0);
  const totalWeightSum = vouchers.reduce((acc, v) => acc + (v.totalWeightKg || 0), 0);
  const totalPriceSum = vouchers.reduce((acc, v) => acc + (v.totalPrice || 0), 0);
  const totalExternalCostSum = vouchers.reduce((acc, v) => acc + (v.isExternalTransport ? (Number(v.externalCost) || 0) : 0), 0);
  const totalNetMarginSum = totalPriceSum - totalExternalCostSum;
  const totalAdvanceSum = vouchers.reduce((acc, v) => acc + (Number(v.advanceAmount) || 0), 0);
  const totalRemainingSum = vouchers.reduce((acc, v) => acc + (v.remainingAmount !== undefined ? Number(v.remainingAmount) : ((v.totalPrice || 0) - (Number(v.advanceAmount) || 0))), 0);

  // Add empty separator row and total summary row
  const summaryRow: Record<string, any> = {
    'N°': 'TOTAL',
    'N° Suivi': `${vouchers.length} bon(s)`,
    'Date': '',
    'Ville Départ': '',
    'Expéditeur': '',
    'CIN Expéditeur': '',
    'Téléphone Expéditeur': '',
    'Adresse Expéditeur': '',
    'Destinataire': '',
    'Destination / Ville': '',
    'Téléphone Destinataire': '',
    'Nombre de Colis': totalColisSum,
    'Poids Total (kg)': Math.round(totalWeightSum * 100) / 100,
    [`Prix Total Client (${currency})`]: Math.round(totalPriceSum * 100) / 100,
    'Mode Transport': '',
    'Réf Transporteur Externe': '',
    [`Coût Transporteur Externe (${currency})`]: Math.round(totalExternalCostSum * 100) / 100,
    [`Bénéfice Net Dégagé (${currency})`]: Math.round(totalNetMarginSum * 100) / 100,
    'Règlement Transporteur': '',
    'Mode de Paiement Client': '',
    [`Avance Versée (${currency})`]: Math.round(totalAdvanceSum * 100) / 100,
    [`Reste à Payer (${currency})`]: Math.round(totalRemainingSum * 100) / 100,
    'Statut Colis': '',
    'Détail des Bagages': '',
    'Observations / Notes': '',
    'Notes Sous-traitance': '',
    'Date Création': ''
  };
  rows.push(summaryRow);

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-calculate column widths
  const colKeys = Object.keys(rows[0] || {});
  const colWidths = colKeys.map(key => {
    let maxLen = key.length;
    rows.forEach(r => {
      const valStr = String(r[key] || '');
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bons de Bagages');

  // Optional secondary sheet with items detail
  if (options?.includeItemsBreakdown) {
    const itemRows: Record<string, any>[] = [];
    vouchers.forEach(v => {
      v.items.forEach((it, itIdx) => {
        itemRows.push({
          'N° Suivi': v.trackingNumber,
          'Date': formatDate(v.date),
          'Expéditeur': v.sender.name,
          'Destinataire': v.recipient.name,
          'Destination': v.recipient.destination,
          'Article #': itIdx + 1,
          'Nature / Description': it.nature,
          'Quantité': it.quantity,
          'Poids Total (kg)': it.weightKg,
          [`Montant (${currency})`]: it.price !== undefined ? it.price : ((it.unitPrice || 0) * (it.quantity || 1)),
          'Remarques': it.notes || '-'
        });
      });
    });
    if (itemRows.length > 0) {
      const itemsWorksheet = XLSX.utils.json_to_sheet(itemRows);
      XLSX.utils.book_append_sheet(workbook, itemsWorksheet, 'Détail des Colis');
    }
  }

  const dateTag = new Date().toISOString().slice(0, 10);
  const finalFileName = options?.fileName || `LoyalisTrans_Bons_Bagages_${dateTag}.xlsx`;

  XLSX.writeFile(workbook, finalFileName);
}
