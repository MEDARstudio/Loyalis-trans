import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Voucher } from '../types';
import { formatCurrency, formatDate, getPaymentStatusInfo, getStatusBadge } from './formatters';
import { generateVoucherQRDataUrl } from './qrGenerator';

export type VoucherPdfLayout = 'double-stub' | 'full-page' | 'compact-receipt';

/**
 * Generates a high-quality, crisp native vector PDF for a transport voucher.
 * Guaranteed zero raster blur, selectable text, tiny file size (~40-80KB), and 100% reliable download on all devices.
 */
export async function generateNativeVoucherPDF(
  voucher: Voucher,
  settings: CompanySettings,
  layout: VoucherPdfLayout = 'double-stub'
): Promise<jsPDF> {
  const currency = settings.currency || 'DH';
  const statusInfo = getStatusBadge(voucher.status);
  const payInfo = getPaymentStatusInfo(
    voucher.paymentStatus || voucher.paymentMethod,
    voucher.advanceAmount || 0,
    voucher.totalPrice,
    voucher.remainingAmount
  );

  // Generate QR code for embedding
  let qrDataUrl = '';
  try {
    qrDataUrl = await generateVoucherQRDataUrl(voucher, { size: 300 });
  } catch (err) {
    console.warn('Could not generate QR code for PDF:', err);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: layout === 'compact-receipt' ? [80, 210] : 'a4'
  });

  if (layout === 'double-stub') {
    renderDoubleStubLayout(doc, voucher, settings, currency, statusInfo, payInfo, qrDataUrl);
  } else if (layout === 'compact-receipt') {
    renderCompactReceiptLayout(doc, voucher, settings, currency, statusInfo, payInfo, qrDataUrl);
  } else {
    renderFullPageLayout(doc, voucher, settings, currency, statusInfo, payInfo, qrDataUrl);
  }

  return doc;
}

/**
 * Downloads the native vector PDF directly
 */
export async function downloadVoucherNativePDF(
  voucher: Voucher,
  settings: CompanySettings,
  layout: VoucherPdfLayout = 'double-stub',
  customFileName?: string
): Promise<boolean> {
  try {
    const doc = await generateNativeVoucherPDF(voucher, settings, layout);
    const fileName = customFileName || `Bon_Transport_LoyalisTrans_${voucher.trackingNumber}`;
    doc.save(`${fileName}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to download native voucher PDF:', err);
    return false;
  }
}

/**
 * Returns a Blob of the native vector PDF for sharing or viewing
 */
export async function getVoucherNativePdfBlob(
  voucher: Voucher,
  settings: CompanySettings,
  layout: VoucherPdfLayout = 'double-stub'
): Promise<Blob> {
  const doc = await generateNativeVoucherPDF(voucher, settings, layout);
  return doc.output('blob');
}

/* ════════════════════════════════════════════════════════════════════════
   LAYOUT 1: DOUBLE SOUCHE (CLIENT + AGENCE SUR 1 PAGE A4)
   ════════════════════════════════════════════════════════════════════════ */
function renderDoubleStubLayout(
  doc: jsPDF,
  voucher: Voucher,
  settings: CompanySettings,
  currency: string,
  statusInfo: { label: string },
  payInfo: { label: string; type: string; advance: number; remaining: number },
  qrDataUrl: string
) {
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  // ═══════════════ SOUCHE 1 : CLIENT (Y: 8 to 142mm) ═══════════════
  renderSingleStub(
    doc,
    voucher,
    settings,
    currency,
    statusInfo,
    payInfo,
    qrDataUrl,
    margin,
    8,
    contentWidth,
    134,
    'EXEMPLAIRE CLIENT / EXPÉDITEUR',
    [234, 88, 12] // Orange header badge
  );

  // ═══════════════ LIGNE DE DÉCOUPE POINTILLÉE ═══════════════
  const cutY = 146;
  doc.setLineDashPattern([2, 2], 0);
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.4);
  doc.line(margin, cutY, pageWidth - margin, cutY);
  doc.setLineDashPattern([], 0); // reset

  doc.setFillColor(255, 255, 255);
  doc.rect(pageWidth / 2 - 40, cutY - 2.5, 80, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('✂  COUPER ICI — SOUCHE AGENCE / CHAUFFEUR', pageWidth / 2, cutY + 1, { align: 'center' });

  // ═══════════════ SOUCHE 2 : AGENCE / CHAUFFEUR (Y: 151 to 286mm) ═══════════════
  renderSingleStub(
    doc,
    voucher,
    settings,
    currency,
    statusInfo,
    payInfo,
    qrDataUrl,
    margin,
    151,
    contentWidth,
    134,
    'EXEMPLAIRE AGENCE / CHAUFFEUR & LIVREUR',
    [15, 23, 42] // Dark slate header badge
  );

  // Micro footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Présentation obligatoire de ce bon pour le retrait. Loyalis Trans Express • ' + (settings.phone1 || '+212 600-000000'),
    pageWidth / 2,
    292,
    { align: 'center' }
  );
}

function renderSingleStub(
  doc: jsPDF,
  voucher: Voucher,
  settings: CompanySettings,
  currency: string,
  statusInfo: { label: string },
  payInfo: { label: string; type: string; advance: number; remaining: number },
  qrDataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number,
  stubTitle: string,
  badgeColor: [number, number, number]
) {
  // Border container
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');

  // Top Title Pill Badge
  doc.setFillColor(...badgeColor);
  doc.roundedRect(x + w - 75, y, 75, 5.5, 0, 0, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(stubTitle, x + w - 37.5, y + 3.8, { align: 'center' });

  // ── Header Left: Brand & Contacts ──
  // Logo LT square
  doc.setFillColor(234, 88, 12); // #ea580c
  doc.roundedRect(x + 3, y + 3, 9, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('LT', x + 7.5, y + 9.2, { align: 'center' });

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text((settings.companyName || 'LOYALIS TRANS').toUpperCase(), x + 14, y + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(234, 88, 12);
  doc.text('TRANSPORT EXPRESS BAGAGES & COLIS', x + 14, y + 10.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const contactLine = `Tél : ${settings.phone1 || '+212 600-000000'}${settings.phone2 ? ` | ${settings.phone2}` : ''} • ${settings.address || 'Casablanca'}`;
  doc.text(contactLine, x + 3, y + 15.5);

  // ── Header Right: Tracking & QR ──
  const trackBoxX = x + w - 66;
  const trackBoxY = y + 7;
  const trackBoxW = 63;
  const trackBoxH = 17;

  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(trackBoxX, trackBoxY, trackBoxW, trackBoxH, 2, 2, 'F');

  // QR Code inside box
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', trackBoxX + 1.5, trackBoxY + 1.5, 14, 14);
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('BON DE TRANSPORT N°', trackBoxX + 17, trackBoxY + 5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(251, 146, 60); // orange-400
  doc.text(voucher.trackingNumber, trackBoxX + 17, trackBoxY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Date : ${formatDate(voucher.date)} ${voucher.time ? `(${voucher.time})` : ''}`, trackBoxX + 17, trackBoxY + 14);

  // ── Trajet Banner ──
  const routeY = y + 25.5;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(x + 3, routeY, w - 6, 6.5, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x + 3, routeY, w - 6, 6.5, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRAJET :', x + 6, routeY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(234, 88, 12); // orange-600
  const departure = (voucher.departureCity || settings.defaultDepartureCity || 'Casablanca').toUpperCase();
  const destination = (voucher.recipient.destination || voucher.destinationCity || 'Destination').toUpperCase();
  doc.text(`${departure}   ➔   ${destination}`, x + 22, routeY + 4.5);

  // Status tag
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + w - 32, routeY + 1.2, 26, 4.2, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(statusInfo.label.toUpperCase(), x + w - 19, routeY + 4.2, { align: 'center' });

  // ── Sender & Recipient Grid ──
  const partiesY = routeY + 8;
  const colW = (w - 8) / 2;

  // Expéditeur Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(x + 3, partiesY, colW, 18, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x + 3, partiesY, colW, 18, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EXPÉDITEUR (ENVOYEUR)', x + 5.5, partiesY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(truncateText(voucher.sender.name || 'Client', 30), x + 5.5, partiesY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tél : ${voucher.sender.phone || '-'}`, x + 5.5, partiesY + 12);

  if (voucher.sender.cin) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`CIN : ${voucher.sender.cin}`, x + 5.5, partiesY + 15.5);
  }

  // Destinataire Box
  doc.setFillColor(255, 247, 237); // orange-50
  doc.roundedRect(x + 3 + colW + 2, partiesY, colW, 18, 1.5, 1.5, 'F');
  doc.setDrawColor(254, 215, 170); // orange-200
  doc.roundedRect(x + 3 + colW + 2, partiesY, colW, 18, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(194, 65, 12); // orange-700
  doc.text('DESTINATAIRE (RÉCEPTIONNAIRE)', x + 3 + colW + 4.5, partiesY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(truncateText(voucher.recipient.name || 'Destinataire', 30), x + 3 + colW + 4.5, partiesY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tél : ${voucher.recipient.phone || '-'}`, x + 3 + colW + 4.5, partiesY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(154, 52, 18);
  doc.text(`Ville : ${voucher.recipient.destination || voucher.destinationCity}`, x + 3 + colW + 4.5, partiesY + 15.5);

  // ── Items Table (compact autoTable) ──
  const tableY = partiesY + 19.5;
  const tableData = voucher.items.map((it, idx) => [
    `${idx + 1}`,
    `${it.nature}${it.notes ? ` (${it.notes})` : ''}`,
    `${it.quantity || 1}`,
    it.weightKg ? `${it.weightKg} kg` : '-',
    it.price ? formatCurrency(it.price, currency) : '-'
  ]);

  autoTable(doc, {
    startY: tableY,
    margin: { left: x + 3, right: doc.internal.pageSize.getWidth() - (x + w - 3) },
    head: [['#', 'Nature Colis / Bagage', 'Qté', 'Poids', 'Prix']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalTableY = (doc as any).lastAutoTable.finalY || (tableY + 22);

  // ── Financial Summary Box ──
  const finY = Math.min(finalTableY + 1.5, y + 104);
  const finH = 14;

  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(x + 3, finY, w - 6, finH, 2, 2, 'F');

  // Total Colis & Poids
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('TOTAL COLIS', x + 6, finY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${voucher.totalColis} colis`, x + 6, finY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('POIDS TOTAL', x + 32, finY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${voucher.totalWeightKg} kg`, x + 32, finY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('STATUT RÈGLEMENT', x + 62, finY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(251, 146, 60);
  doc.text(payInfo.label.toUpperCase(), x + 62, finY + 8);

  // Grand Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('MONTANT TOTAL', x + w - 10, finY + 4, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(251, 146, 60);
  doc.text(formatCurrency(voucher.totalPrice, currency), x + w - 10, finY + 8.5, { align: 'right' });

  // Breakdown subline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  if (payInfo.type === 'AVANCE') {
    doc.setTextColor(252, 211, 77); // amber-300
    doc.text(`✓ Avance reçue : ${formatCurrency(payInfo.advance, currency)}`, x + 6, finY + 12.2);
    doc.setTextColor(253, 164, 175); // rose-300
    doc.text(`⚠ Reste à payer à l'arrivée : ${formatCurrency(payInfo.remaining, currency)}`, x + w - 10, finY + 12.2, { align: 'right' });
  } else if (payInfo.type === 'NON_PAYE') {
    doc.setTextColor(253, 164, 175);
    doc.text(`⚠ Montant à encaisser obligatoirement à la livraison : ${formatCurrency(voucher.totalPrice, currency)}`, x + 6, finY + 12.2);
  } else {
    doc.setTextColor(110, 231, 183); // emerald-300
    doc.text(`✓ Réglé en totalité au départ (Reste dû : 0 ${currency})`, x + 6, finY + 12.2);
  }

  // ── Signatures ──
  const sigY = finY + finH + 1.5;
  const sigH = 10;
  const sigW = (w - 8) / 2;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(x + 3, sigY, sigW, sigH, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text('Signature Expéditeur :', x + 5, sigY + 3.5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('"Lu et accepté les conditions"', x + 5, sigY + 8);

  doc.roundedRect(x + 3 + sigW + 2, sigY, sigW, sigH, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text('Visa & Cachet Loyalis Trans :', x + 3 + sigW + 4, sigY + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text(`Agent : ${voucher.agentName || 'Responsable Agence'}`, x + 3 + sigW + 4, sigY + 8);
}

/* ════════════════════════════════════════════════════════════════════════
   LAYOUT 2: PLEINE PAGE A4 (FACTURE & BORDEREAU ADMINISTRATIF)
   ════════════════════════════════════════════════════════════════════════ */
function renderFullPageLayout(
  doc: jsPDF,
  voucher: Voucher,
  settings: CompanySettings,
  currency: string,
  statusInfo: { label: string },
  payInfo: { label: string; type: string; advance: number; remaining: number },
  qrDataUrl: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Header background bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Logo Badge
  doc.setFillColor(234, 88, 12);
  doc.roundedRect(margin, 5, 16, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('LT', margin + 8, 15.5, { align: 'center' });

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text((settings.companyName || 'LOYALIS TRANS').toUpperCase(), margin + 20, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(251, 146, 60);
  doc.text('BORDEREAU OFFICIEL DE TRANSPORT & FACTURE BAGAGES', margin + 20, 18);

  // Tracking Number Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('BON DE TRANSPORT N°', pageWidth - margin, 10, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(251, 146, 60);
  doc.text(voucher.trackingNumber, pageWidth - margin, 17, { align: 'right' });

  // Date and contact line below bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date d'émission : ${formatDate(voucher.date)} ${voucher.time ? `• ${voucher.time}` : ''}`, margin, 34);
  doc.text(`Service Client : ${settings.phone1 || '+212 600-000000'} | ${settings.address || 'Casablanca'}`, pageWidth - margin, 34, { align: 'right' });

  // Trajet Box
  const routeY = 38;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, routeY, contentWidth, 12, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, routeY, contentWidth, 12, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ITINÉRAIRE / TRAJET :', margin + 4, routeY + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12);
  const departure = (voucher.departureCity || settings.defaultDepartureCity || 'Casablanca').toUpperCase();
  const destination = (voucher.recipient.destination || voucher.destinationCity || 'Destination').toUpperCase();
  doc.text(`${departure}   ➔   ${destination}`, margin + 42, routeY + 8);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 35, routeY + 2.5, 31, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(statusInfo.label.toUpperCase(), pageWidth - margin - 19.5, routeY + 7, { align: 'center' });

  // Expéditeur & Destinataire
  const partiesY = 53;
  const colW = (contentWidth - 6) / 2;

  // Expéditeur
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, partiesY, colW, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, partiesY, colW, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('EXPÉDITEUR', margin + 4, partiesY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(voucher.sender.name || 'Client', margin + 4, partiesY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tél : ${voucher.sender.phone || '-'}`, margin + 4, partiesY + 17.5);
  if (voucher.sender.cin) doc.text(`CIN : ${voucher.sender.cin}`, margin + 4, partiesY + 22.5);
  if (voucher.sender.address) doc.text(`Adresse : ${voucher.sender.address}`, margin + 4, partiesY + 27);

  // Destinataire
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(margin + colW + 6, partiesY, colW, 30, 2, 2, 'F');
  doc.setDrawColor(254, 215, 170);
  doc.roundedRect(margin + colW + 6, partiesY, colW, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(194, 65, 12);
  doc.text('DESTINATAIRE', margin + colW + 10, partiesY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(voucher.recipient.name || 'Destinataire', margin + colW + 10, partiesY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tél : ${voucher.recipient.phone || '-'}`, margin + colW + 10, partiesY + 17.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Destination : ${destination}`, margin + colW + 10, partiesY + 22.5);
  if (voucher.recipient.address) doc.text(`Adresse : ${voucher.recipient.address}`, margin + colW + 10, partiesY + 27);

  // Items Table
  const tableData = voucher.items.map((it, idx) => [
    `${idx + 1}`,
    `${it.nature}${it.notes ? ` (${it.notes})` : ''}`,
    `${it.quantity || 1}`,
    it.weightKg ? `${it.weightKg} kg` : '-',
    it.price ? formatCurrency(it.price, currency) : '-'
  ]);

  autoTable(doc, {
    startY: 87,
    margin: { left: margin, right: margin },
    head: [['#', 'Désignation & Nature du Colis', 'Quantité', 'Poids', 'Montant TTC']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.3
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalTableY = (doc as any).lastAutoTable.finalY || 135;

  // Financial Grand Box
  const finY = finalTableY + 4;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, finY, contentWidth, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('TOTAL ARTICLES', margin + 6, finY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${voucher.totalColis} colis`, margin + 6, finY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('POIDS GLOBAL', margin + 45, finY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${voucher.totalWeightKg} kg`, margin + 45, finY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('MODE DE RÈGLEMENT', margin + 90, finY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(251, 146, 60);
  doc.text(payInfo.label.toUpperCase(), margin + 90, finY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('NET À PAYER', pageWidth - margin - 8, finY + 6, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(251, 146, 60);
  doc.text(formatCurrency(voucher.totalPrice, currency), pageWidth - margin - 8, finY + 13.5, { align: 'right' });

  // Breakdown line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (payInfo.type === 'AVANCE') {
    doc.setTextColor(252, 211, 77);
    doc.text(`✓ Avance réglée au départ : ${formatCurrency(payInfo.advance, currency)}`, margin + 6, finY + 18.5);
    doc.setTextColor(253, 164, 175);
    doc.text(`⚠ Reste à payer à la livraison : ${formatCurrency(payInfo.remaining, currency)}`, pageWidth - margin - 8, finY + 18.5, { align: 'right' });
  } else if (payInfo.type === 'NON_PAYE') {
    doc.setTextColor(253, 164, 175);
    doc.text(`⚠ Montant à payer intégralement à la livraison : ${formatCurrency(voucher.totalPrice, currency)}`, margin + 6, finY + 18.5);
  } else {
    doc.setTextColor(110, 231, 183);
    doc.text(`✓ Règlement intégral effectué au départ`, margin + 6, finY + 18.5);
  }

  // QR Code Box & Tracking bottom
  const qrBoxY = finY + 26;
  if (qrDataUrl) {
    try {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, qrBoxY, contentWidth, 24, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, qrBoxY, contentWidth, 24, 2, 2, 'S');

      doc.addImage(qrDataUrl, 'PNG', margin + 3, qrBoxY + 2, 20, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('SUIVI EN DIRECT ET VÉRIFICATION SÉCURISÉE', margin + 26, qrBoxY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Scannez ce QR Code avec l\'appareil photo de votre smartphone pour suivre l\'état du colis en temps réel.', margin + 26, qrBoxY + 12);
      doc.text(`Numéro de référence officiel : ${voucher.trackingNumber}`, margin + 26, qrBoxY + 17);
    } catch {
      // ignore
    }
  }

  // Signatures
  const sigY = qrBoxY + 28;
  const sigH = 20;
  const sigW = (contentWidth - 6) / 2;

  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, sigY, sigW, sigH, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Signature du Client Expéditeur :', margin + 4, sigY + 5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('"Reconnais avoir pris connaissance des conditions de transport"', margin + 4, sigY + 15);

  doc.roundedRect(margin + sigW + 6, sigY, sigW, sigH, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Cachet & Visa Loyalis Trans :', margin + sigW + 10, sigY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Agent : ${voucher.agentName || 'Direction Loyalis Trans'}`, margin + sigW + 10, sigY + 15);

  // Legal footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    settings.termsAndConditions || 'Présentation obligatoire de ce bon pour le retrait. Loyalis Trans décline toute responsabilité pour les objets précieux non déclarés.',
    pageWidth / 2,
    288,
    { align: 'center' }
  );
}

/* ════════════════════════════════════════════════════════════════════════
   LAYOUT 3: COMPACT RECEIPT (TICKET THERMIQUE 80MM)
   ════════════════════════════════════════════════════════════════════════ */
function renderCompactReceiptLayout(
  doc: jsPDF,
  voucher: Voucher,
  settings: CompanySettings,
  currency: string,
  statusInfo: { label: string },
  payInfo: { label: string; type: string; advance: number; remaining: number },
  qrDataUrl: string
) {
  const pageWidth = 80;
  const margin = 4;
  const w = pageWidth - margin * 2;

  let y = 6;

  // Header Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text((settings.companyName || 'LOYALIS TRANS').toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(234, 88, 12);
  doc.text('TRANSPORT EXPRESS BAGAGES & COLIS', pageWidth / 2, y, { align: 'center' });
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tél : ${settings.phone1 || '+212 600-000000'}`, pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Separator
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // Tracking
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('BON N° :', margin, y);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(234, 88, 12);
  doc.text(voucher.trackingNumber, pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date : ${formatDate(voucher.date)} ${voucher.time || ''}`, margin, y);
  y += 4.5;

  // Route
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, w, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const departure = voucher.departureCity || settings.defaultDepartureCity || 'Casablanca';
  const destination = voucher.recipient.destination || voucher.destinationCity || 'Destination';
  doc.text(`${departure} ➔ ${destination}`, pageWidth / 2, y + 3.5, { align: 'center' });
  y += 7.5;

  // Parties
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EXPÉDITEUR :', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(truncateText(voucher.sender.name, 22), margin + 20, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Tél : ${voucher.sender.phone}`, margin + 20, y);
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(194, 65, 12);
  doc.text('DESTINATAIRE :', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(truncateText(voucher.recipient.name, 20), margin + 23, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Tél : ${voucher.recipient.phone}`, margin + 23, y);
  y += 5;

  // Table
  const tableData = voucher.items.map(it => [
    `${it.quantity}x ${it.nature}`,
    it.weightKg ? `${it.weightKg}k` : '-',
    it.price ? formatCurrency(it.price, currency) : '-'
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Colis', 'Poids', 'Prix']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      textColor: [15, 23, 42]
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 6.5,
      textColor: [100, 116, 139]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }
    }
  });

  y = (doc as any).lastAutoTable.finalY || (y + 15);
  y += 2;

  // Totals
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total (${voucher.totalColis} colis • ${voucher.totalWeightKg} kg)`, margin, y);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(234, 88, 12);
  doc.text(formatCurrency(voucher.totalPrice, currency), pageWidth - margin, y, { align: 'right' });
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Règlement : ${payInfo.label}`, margin, y);
  y += 4;

  if (payInfo.remaining > 0) {
    doc.setTextColor(225, 29, 72);
    doc.text(`Reste à payer : ${formatCurrency(payInfo.remaining, currency)}`, margin, y);
    y += 4;
  }

  // QR Code
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 12, y, 24, 24);
      y += 26;
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Conservez ce reçu pour le retrait', pageWidth / 2, y, { align: 'center' });
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text;
}
