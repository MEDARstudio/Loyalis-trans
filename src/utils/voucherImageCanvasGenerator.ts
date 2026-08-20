import { CompanySettings, Voucher } from '../types';
import { formatCurrency, formatDate, getPaymentStatusInfo, getStatusBadge } from './formatters';
import { generateVoucherQRDataUrl } from './qrGenerator';

/**
 * High-Definition Pure Canvas 2D Voucher Image Generator.
 * Directly renders onto an off-screen HTML5 Canvas without relying on fragile DOM CSS parsing.
 * 100% razor-sharp, zero misalignments, perfect typography, consistent across all mobile and desktop browsers.
 */
export async function generateVoucherCanvas(
  voucher: Voucher,
  settings: CompanySettings
): Promise<HTMLCanvasElement> {
  const currency = settings.currency || 'DH';
  const statusInfo = getStatusBadge(voucher.status);
  const payInfo = getPaymentStatusInfo(
    voucher.paymentStatus || voucher.paymentMethod,
    voucher.advanceAmount || 0,
    voucher.totalPrice,
    voucher.remainingAmount
  );

  // Generate QR Code data URL
  let qrImage: HTMLImageElement | null = null;
  try {
    const qrDataUrl = await generateVoucherQRDataUrl(voucher, { size: 360 });
    if (qrDataUrl) {
      qrImage = new Image();
      qrImage.src = qrDataUrl;
      await new Promise<void>((resolve) => {
        qrImage!.onload = () => resolve();
        qrImage!.onerror = () => resolve(); // continue even if QR fails
      });
    }
  } catch (err) {
    console.warn('QR Code generation skipped in canvas:', err);
  }

  // Dimensions (High Definition Canvas: 1000px width)
  const width = 1000;
  const padding = 36;
  const contentWidth = width - padding * 2; // 928px

  // Calculate dynamic height based on items count
  const itemsCount = Math.max(voucher.items.length, 1);
  const itemRowHeight = 44;
  const tableHeight = 46 + itemsCount * itemRowHeight;
  
  // Base heights: Header (150) + Route (64) + Parties (140) + Table (tableHeight) + Financial (145) + QR & Footer (150) + margins
  const height = 150 + 64 + 140 + tableHeight + 145 + 160 + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Set crisp rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Full Background & Card Frame
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Subtle border around entire voucher card
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  roundRect(ctx, 10, 10, width - 20, height - 20, 24);
  ctx.stroke();

  let curY = padding;

  // 2. Top Header Bar (Obsidian Navy: #0f172a with Orange stripe: #ea580c)
  const headerHeight = 135;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, padding, curY, contentWidth, headerHeight, 20);
  ctx.fill();

  // Orange bottom accent line
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(padding, curY + headerHeight - 6, contentWidth, 6);

  // ── Brand Logo Badge (Orange Square) ──
  const logoSize = 64;
  const logoX = padding + 24;
  const logoY = curY + 24;
  ctx.fillStyle = '#ea580c';
  roundRect(ctx, logoX, logoY, logoSize, logoSize, 14);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LT', logoX + logoSize / 2, logoY + logoSize / 2 + 1);

  // ── Brand Name & Tagline ──
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const companyName = (settings.companyName || 'LOYALIS TRANS').toUpperCase();
  ctx.fillText(companyName, logoX + logoSize + 16, logoY + 18);

  ctx.fillStyle = '#fb923c'; // Orange-400
  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TRANSPORT EXPRESS BAGAGES & COLIS', logoX + logoSize + 16, logoY + 40);

  ctx.fillStyle = '#94a3b8'; // Slate-400
  ctx.font = '500 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const phoneContact = `Tél : ${settings.phone1 || '+212 600-000000'}${settings.phone2 ? `  •  ${settings.phone2}` : ''}`;
  ctx.fillText(phoneContact, logoX + logoSize + 16, logoY + 60);

  // ── Tracking Badge (Right Side) ──
  const trackBoxW = 260;
  const trackBoxH = 76;
  const trackBoxX = padding + contentWidth - trackBoxW - 20;
  const trackBoxY = curY + 24;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, trackBoxX, trackBoxY, trackBoxW, trackBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BON DE TRANSPORT N°', trackBoxX + trackBoxW / 2, trackBoxY + 20);

  ctx.fillStyle = '#fb923c'; // Vivid Orange
  ctx.font = '900 24px "Courier New", Courier, monospace';
  ctx.fillText(voucher.trackingNumber, trackBoxX + trackBoxW / 2, trackBoxY + 45);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Date : ${formatDate(voucher.date)} ${voucher.time ? `(${voucher.time})` : ''}`, trackBoxX + trackBoxW / 2, trackBoxY + 65);

  curY += headerHeight + 16;

  // 3. Route Banner (Departure ➔ Destination)
  const routeHeight = 54;
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, padding, curY, contentWidth, routeHeight, 14);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TRAJET :', padding + 20, curY + 32);

  ctx.fillStyle = '#ea580c';
  ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const depCity = (voucher.departureCity || settings.defaultDepartureCity || 'Casablanca').toUpperCase();
  const destCity = (voucher.recipient.destination || voucher.destinationCity || 'Destination').toUpperCase();
  ctx.fillText(`${depCity}    ➔    ${destCity}`, padding + 85, curY + 33);

  // Status Badge on Route Bar
  const statusBadgeText = statusInfo.label.toUpperCase();
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeTextWidth = ctx.measureText(statusBadgeText).width;
  const badgeW = badgeTextWidth + 24;
  const badgeH = 28;
  const badgeX = padding + contentWidth - badgeW - 16;
  const badgeY = curY + (routeHeight - badgeH) / 2;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.fillText(statusBadgeText, badgeX + badgeW / 2, badgeY + 18);

  curY += routeHeight + 14;

  // 4. Sender & Recipient Cards (Side-by-Side)
  const colGap = 16;
  const colW = (contentWidth - colGap) / 2;
  const partiesH = 125;

  // ── Expéditeur Box ──
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, padding, curY, colW, partiesH, 14);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('EXPÉDITEUR (ENVOYEUR)', padding + 18, curY + 26);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(voucher.sender.name || 'Client Expéditeur', padding + 18, curY + 52);

  ctx.fillStyle = '#334155';
  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Tél : ${voucher.sender.phone || '-'}`, padding + 18, curY + 76);

  if (voucher.sender.cin) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px "Courier New", Courier, monospace';
    ctx.fillText(`CIN : ${voucher.sender.cin}`, padding + 18, curY + 98);
  } else if (voucher.sender.address) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(voucher.sender.address.substring(0, 42), padding + 18, curY + 98);
  }

  // ── Destinataire Box ──
  const destX = padding + colW + colGap;
  ctx.fillStyle = '#fff7ed'; // Warm Orange-50
  roundRect(ctx, destX, curY, colW, partiesH, 14);
  ctx.fill();
  ctx.strokeStyle = '#fed7aa'; // Orange-200
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#c2410c'; // Orange-700
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DESTINATAIRE (RÉCEPTIONNAIRE)', destX + 18, curY + 26);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(voucher.recipient.name || 'Destinataire', destX + 18, curY + 52);

  ctx.fillStyle = '#334155';
  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Tél : ${voucher.recipient.phone || '-'}`, destX + 18, curY + 76);

  ctx.fillStyle = '#9a3412';
  ctx.font = '800 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Destination : ${(voucher.recipient.destination || voucher.destinationCity).toUpperCase()}`, destX + 18, curY + 98);

  curY += partiesH + 16;

  // 5. Baggage & Parcels Table (ALL ITEMS)
  const thHeight = 36;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, padding, curY, contentWidth, thHeight, 10, true, true, false, false);
  ctx.fill();

  // Table Headers
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N°', padding + 16, curY + 22);
  ctx.fillText(`DÉTAIL DES BAGAGES & COLIS (${voucher.totalColis} pièce(s))`, padding + 60, curY + 22);
  ctx.textAlign = 'center';
  ctx.fillText('QTÉ', padding + 540, curY + 22);
  ctx.fillText('POIDS', padding + 680, curY + 22);
  ctx.textAlign = 'right';
  ctx.fillText('MONTANT', padding + contentWidth - 20, curY + 22);

  curY += thHeight;

  // Table Body Rows
  voucher.items.forEach((it, idx) => {
    const isEven = idx % 2 === 0;
    ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
    ctx.fillRect(padding, curY, contentWidth, itemRowHeight);

    // Row bottom border
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, curY + itemRowHeight);
    ctx.lineTo(padding + contentWidth, curY + itemRowHeight);
    ctx.stroke();

    // Col 1: Index
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${idx + 1}`, padding + 16, curY + 26);

    // Col 2: Nature & Notes
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const natureText = it.nature + (it.notes ? `  [${it.notes}]` : '');
    ctx.fillText(natureText, padding + 60, curY + 26);

    // Col 3: Quantity
    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${it.quantity || 1}`, padding + 540, curY + 26);

    // Col 4: Weight
    ctx.fillText(it.weightKg > 0 ? `${it.weightKg} kg` : '-', padding + 680, curY + 26);

    // Col 5: Price
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 13.5px "Courier New", Courier, monospace';
    const itemPrice = it.price !== undefined ? it.price : (it.unitPrice !== undefined ? it.unitPrice * (it.quantity || 1) : 0);
    ctx.fillText(itemPrice > 0 ? formatCurrency(itemPrice, currency) : '-', padding + contentWidth - 20, curY + 26);

    curY += itemRowHeight;
  });

  // Table Outer Frame Box
  const fullTableHeight = thHeight + voucher.items.length * itemRowHeight;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  roundRect(ctx, padding, curY - fullTableHeight, contentWidth, fullTableHeight, 10);
  ctx.stroke();

  curY += 16;

  // 6. Financial Summary Box (Navy & Amber Gradient)
  const finH = 135;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, padding, curY, contentWidth, finH, 16);
  ctx.fill();

  // Top sub-band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, padding, curY, contentWidth, 75, 16, true, true, false, false);
  ctx.fill();

  // Column 1: Total Colis
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL COLIS', padding + 24, curY + 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${voucher.totalColis} colis`, padding + 24, curY + 56);

  // Column 2: Poids Total
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('POIDS TOTAL', padding + 190, curY + 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${voucher.totalWeightKg} kg`, padding + 190, curY + 56);

  // Column 3: Statut Règlement
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RÈGLEMENT', padding + 380, curY + 28);
  ctx.fillStyle = '#fb923c';
  ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(payInfo.label.toUpperCase(), padding + 380, curY + 56);

  // Column 4: Grand Total
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('MONTANT TOTAL À PAYER', padding + contentWidth - 24, curY + 28);

  ctx.fillStyle = '#fb923c';
  ctx.font = '900 28px "Courier New", Courier, monospace';
  ctx.fillText(formatCurrency(voucher.totalPrice, currency), padding + contentWidth - 24, curY + 58);

  // Bottom Breakdown Line in Financial Box
  ctx.textAlign = 'left';
  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  if (payInfo.type === 'AVANCE') {
    ctx.fillStyle = '#fde047'; // Amber-300
    ctx.fillText(`✓ Avance réglée au départ : ${formatCurrency(payInfo.advance, currency)}`, padding + 24, curY + 106);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fda4af'; // Rose-300
    ctx.fillText(`⚠ RESTE À PAYER À LA LIVRAISON : ${formatCurrency(payInfo.remaining, currency)}`, padding + contentWidth - 24, curY + 106);
  } else if (payInfo.type === 'NON_PAYE') {
    ctx.fillStyle = '#fda4af';
    ctx.fillText(`⚠ PAIEMENT OBLIGATOIRE À LA RÉCEPTION : ${formatCurrency(voucher.totalPrice, currency)}`, padding + 24, curY + 106);
  } else {
    ctx.fillStyle = '#6ee7b7'; // Emerald-300
    ctx.fillText(`✓ RÉGLÉ EN TOTALITÉ AU DÉPART (Reste dû : 0 ${currency})`, padding + 24, curY + 106);
  }

  curY += finH + 16;

  // 7. QR Code Station & Signatures / Conditions Box
  const qrBoxH = 100;
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, padding, curY, contentWidth, qrBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw QR Image
  if (qrImage) {
    const qrSize = 80;
    ctx.drawImage(qrImage, padding + 14, curY + 10, qrSize, qrSize);
  }

  // QR helper text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SUIVI EN DIRECT & RETRAIT SÉCURISÉ', padding + 110, curY + 30);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Scannez ce QR code avec l\'appareil photo de votre smartphone pour suivre le colis.', padding + 110, curY + 50);

  ctx.fillStyle = '#ea580c';
  ctx.font = '800 12px "Courier New", Courier, monospace';
  ctx.fillText(`Réf. Suivi : #${voucher.trackingNumber}   •   Agent : ${voucher.agentName || 'Direction Loyalis Trans'}`, padding + 110, curY + 72);

  // Signatures Right Side
  const sigBoxW = 260;
  const sigBoxX = padding + contentWidth - sigBoxW - 14;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, sigBoxX, curY + 12, sigBoxW, 76, 10);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Visa & Cachet Loyalis Trans :', sigBoxX + 12, curY + 30);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('DOCUMENT OFFICIEL CERTIFIÉ', sigBoxX + 12, curY + 54);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Présentation obligatoire au retrait', sigBoxX + 12, curY + 72);

  curY += qrBoxH + 16;

  // 8. Bottom Terms & Conditions
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const termsText = settings.termsAndConditions || 'Présentation obligatoire de ce bon pour le retrait. Loyalis Trans décline toute responsabilité pour les objets précieux non déclarés.';
  ctx.fillText(termsText, width / 2, curY + 10);

  return canvas;
}

/**
 * Downloads the voucher image generated directly from Canvas 2D
 */
export async function downloadVoucherCanvasImage(
  voucher: Voucher,
  settings: CompanySettings,
  customFileName?: string
): Promise<boolean> {
  try {
    const canvas = await generateVoucherCanvas(voucher, settings);
    const fileName = customFileName || `Bon_Transport_LoyalisTrans_${voucher.trackingNumber}.png`;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 0.98);
    });

    if (!blob) {
      throw new Error('Canvas blob generation failed');
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    return true;
  } catch (err) {
    console.error('Failed to download voucher canvas image:', err);
    return false;
  }
}

/**
 * Copies the Canvas 2D voucher image directly to clipboard
 */
export async function copyVoucherCanvasImageToClipboard(
  voucher: Voucher,
  settings: CompanySettings
): Promise<boolean> {
  try {
    const canvas = await generateVoucherCanvas(voucher, settings);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 0.98);
    });

    if (blob && navigator.clipboard && (window as any).ClipboardItem) {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy canvas image to clipboard:', err);
    return false;
  }
}

/**
 * Canvas Round Rectangle Helper with optional rounded corner selections
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  tl = true,
  tr = true,
  br = true,
  bl = true
) {
  ctx.beginPath();
  ctx.moveTo(x + (tl ? radius : 0), y);
  ctx.lineTo(x + width - (tr ? radius : 0), y);
  if (tr) ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - (br ? radius : 0));
  if (br) ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + (bl ? radius : 0), y + height);
  if (bl) ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + (tl ? radius : 0));
  if (tl) ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
