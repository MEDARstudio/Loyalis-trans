import { toPng, toBlob } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CompanySettings, Voucher } from '../types';
import { formatCurrency, formatDate, getStatusBadge } from './formatters';
import { downloadVoucherNativePDF } from './voucherPdfGenerator';
import { 
  downloadVoucherCanvasImage, 
  copyVoucherCanvasImageToClipboard,
  getVoucherCanvasFile
} from './voucherImageCanvasGenerator';

/**
 * Concise & high-impact summary text for WhatsApp, SMS & client messages (NO tracking link)
 */
export function buildVoucherSummaryText(voucher: Voucher, settings: CompanySettings): string {
  const currency = settings.currency || 'DH';
  
  let paymentText = '';
  const pStatus = voucher.paymentStatus || voucher.paymentMethod;
  if (pStatus === 'AVANCE') {
    const remaining = voucher.remainingAmount !== undefined 
      ? voucher.remainingAmount 
      : Math.max(0, voucher.totalPrice - (voucher.advanceAmount || 0));
    paymentText = `• Règlement : 🟡 Avance ${formatCurrency(voucher.advanceAmount || 0, currency)} (Reste à payer : *${formatCurrency(remaining, currency)}*)`;
  } else if (pStatus === 'NON_PAYE' || pStatus === 'A_LA_LIVRAISON') {
    paymentText = `• Règlement : 🔴 *À régler à la livraison* (*${formatCurrency(voucher.totalPrice, currency)}*)`;
  } else {
    paymentText = `• Règlement : 🟢 *Payé* (${formatCurrency(voucher.totalPrice, currency)})`;
  }

  const senderCity = voucher.departureCity || settings.defaultDepartureCity || 'Casablanca';
  const recipientCity = voucher.recipient.destination || voucher.destinationCity || 'Destination';

  return `📦 *LOYALIS TRANS - BON N° ${voucher.trackingNumber}*
━━━━━━━━━━━━━━━━━━━━━━━
📅 *Date :* ${formatDate(voucher.date)}
📍 *Trajet :* ${senderCity} ➔ ${recipientCity}

👤 *Expéditeur :* ${voucher.sender.name} (${voucher.sender.phone})
🎯 *Destinataire :* ${voucher.recipient.name} (${voucher.recipient.phone})

🧳 *Bagages :* ${voucher.totalColis} colis • ${voucher.totalWeightKg} kg
💰 *Total :* *${formatCurrency(voucher.totalPrice, currency)}*
${paymentText}
${voucher.notes ? `📝 *Note :* ${voucher.notes}\n` : ''}
📞 *Loyalis Trans :* ${settings.phone1 || '+212 600-000000'}${settings.phone2 ? ` | ${settings.phone2}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Helper to convert Base64/DataURL to a File object
 */
export async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  } catch (err) {
    console.warn('Failed to convert dataUrl to File:', err);
    return null;
  }
}

/**
 * Direct WhatsApp Link Launcher
 */
export function shareViaWhatsApp(
  voucher: Voucher, 
  settings: CompanySettings, 
  targetPhone?: string,
  customMessage?: string
) {
  const text = customMessage || buildVoucherSummaryText(voucher, settings);
  const encoded = encodeURIComponent(text);
  
  let cleanPhone = (targetPhone || voucher.recipient.phone || voucher.sender.phone || '').replace(/[^\d+]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '212' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  }

  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  window.open(url, '_blank');
}

/**
 * High-end Web Share API Pack (Transfers generated HD Voucher Image + Parcel Photos directly to WhatsApp or native sharing)
 */
export async function shareDirectVoucherPack(
  voucher: Voucher,
  settings: CompanySettings,
  options: {
    targetPhone?: string;
    includeVoucherImage?: boolean;
    includeCasePhotos?: boolean;
    customMessage?: string;
  } = {}
): Promise<{ success: boolean; method: 'web-share' | 'whatsapp-url' | 'fallback' }> {
  const message = options.customMessage || buildVoucherSummaryText(voucher, settings);
  const files: File[] = [];

  // 1. Generate & Attach HD Voucher Image
  if (options.includeVoucherImage !== false) {
    try {
      const voucherFile = await getVoucherCanvasFile(voucher, settings, `Bon_LoyalisTrans_${voucher.trackingNumber}.png`);
      if (voucherFile) {
        files.push(voucherFile);
      }
    } catch (err) {
      console.warn('Voucher image generation for share failed:', err);
    }
  }

  // 2. Attach Parcel Case Photos if requested
  if (options.includeCasePhotos) {
    if (voucher.casePhotos && voucher.casePhotos.length > 0) {
      for (let i = 0; i < voucher.casePhotos.length; i++) {
        const photo = voucher.casePhotos[i];
        const dataUrl = typeof photo === 'string' ? photo : photo?.dataUrl;
        if (dataUrl) {
          const photoFile = await dataUrlToFile(dataUrl, `Colis_${voucher.trackingNumber}_Photo${i + 1}.jpg`);
          if (photoFile) {
            files.push(photoFile);
          }
        }
      }
    }
    if (voucher.bonReelPhoto) {
      const dataUrl = typeof voucher.bonReelPhoto === 'string' ? voucher.bonReelPhoto : voucher.bonReelPhoto?.dataUrl;
      if (dataUrl) {
        const bonFile = await dataUrlToFile(dataUrl, `BonReel_${voucher.trackingNumber}.jpg`);
        if (bonFile) {
          files.push(bonFile);
        }
      }
    }
  }

  // Check if native Web Share with files is supported
  const nav = navigator as any;
  if (nav && nav.canShare && files.length > 0) {
    try {
      if (nav.canShare({ files })) {
        await nav.share({
          title: `Bon Loyalis Trans N° ${voucher.trackingNumber}`,
          text: message,
          files: files
        });
        return { success: true, method: 'web-share' };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { success: false, method: 'web-share' };
      }
      console.warn('Native share with files failed, falling back to direct WhatsApp link:', shareErr);
    }
  }

  // Fallback to direct WhatsApp URL opening
  shareViaWhatsApp(voucher, settings, options.targetPhone, message);
  return { success: true, method: 'whatsapp-url' };
}

export function shareViaEmail(voucher: Voucher, settings: CompanySettings) {
  const subject = encodeURIComponent(`Loyalis Trans - Bon de Bagages N° ${voucher.trackingNumber}`);
  const body = encodeURIComponent(buildVoucherSummaryText(voucher, settings));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export function shareViaSMS(voucher: Voucher, settings: CompanySettings) {
  const body = encodeURIComponent(buildVoucherSummaryText(voucher, settings));
  const phone = voucher.recipient.phone || voucher.sender.phone || '';
  window.location.href = `sms:${phone}?body=${body}`;
}

export async function copyVoucherText(voucher: Voucher, settings: CompanySettings): Promise<boolean> {
  try {
    const text = buildVoucherSummaryText(voucher, settings);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * 100% Reliable Voucher Image PNG Download:
 * Uses pure HTML5 2D Canvas Engine first (100% sharp, zero css bugs).
 * Falls back to DOM capture if needed.
 */
export async function exportVoucherImage(
  voucher: Voucher,
  settings: CompanySettings,
  elementIdFallback?: string
): Promise<boolean> {
  try {
    // Primary: Crisp HTML5 2D Canvas Engine
    const canvasSuccess = await downloadVoucherCanvasImage(voucher, settings);
    if (canvasSuccess) return true;
  } catch (canvasErr) {
    console.warn('Canvas generator fallback to DOM:', canvasErr);
  }

  // Fallback to DOM capture
  return exportElementAsImage(
    elementIdFallback || 'client-hd-voucher-card', 
    `Bon_Transport_LoyalisTrans_${voucher.trackingNumber}`
  );
}

/**
 * Robust Multi-Engine DOM to Image capture (PNG)
 */
export async function exportElementAsImage(elementId: string, fileName: string): Promise<boolean> {
  let el = document.getElementById(elementId);
  if (!el) {
    el = document.getElementById('client-hd-voucher-card') || 
         document.getElementById('printable-voucher-document') || 
         document.querySelector('.hd-voucher-card') as HTMLElement;
  }
  if (!el) {
    console.error(`Export error: element #${elementId} not found in DOM`);
    return false;
  }

  try {
    // Engine 1: html2canvas
    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
        scrollX: 0,
        scrollY: 0
      });
    } catch (h2cErr) {
      console.warn('html2canvas failed, attempting html-to-image fallback:', h2cErr);
    }

    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png', 0.98);
      triggerDownloadLink(dataUrl, `${fileName}.png`);
      return true;
    }

    // Engine 2: html-to-image fallback
    const renderOptions = {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true
    };

    let blob: Blob | null = null;
    try {
      blob = await toBlob(el, renderOptions);
    } catch {
      const dataUrl = await toPng(el, renderOptions);
      const res = await fetch(dataUrl);
      blob = await res.blob();
    }

    if (!blob) {
      throw new Error('Could not generate image blob from DOM element');
    }

    const blobUrl = URL.createObjectURL(blob);
    triggerDownloadLink(blobUrl, `${fileName}.png`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    return true;
  } catch (err) {
    console.error('Error generating image:', err);
    return false;
  }
}

/**
 * Copies captured image directly to user clipboard
 */
export async function copyElementAsImageToClipboard(
  elementId: string,
  voucherFallback?: { voucher: Voucher; settings: CompanySettings }
): Promise<boolean> {
  if (voucherFallback) {
    const directCanvasCopy = await copyVoucherCanvasImageToClipboard(voucherFallback.voucher, voucherFallback.settings);
    if (directCanvasCopy) return true;
  }

  let el = document.getElementById(elementId);
  if (!el) {
    el = document.getElementById('client-hd-voucher-card') || 
         document.getElementById('printable-voucher-document') || 
         document.querySelector('.hd-voucher-card') as HTMLElement;
  }
  if (!el) return false;

  try {
    let blob: Blob | null = null;

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png', 0.98));
    } catch {
      // ignore
    }

    if (!blob) {
      blob = await toBlob(el, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
    }

    if (blob && navigator.clipboard && (window as any).ClipboardItem) {
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
    return false;
  }
}

/**
 * Exports element as PDF with native fallback
 */
export async function exportElementAsPDF(
  elementId: string, 
  fileName: string,
  voucherFallback?: { voucher: Voucher; settings: CompanySettings }
): Promise<boolean> {
  if (voucherFallback) {
    return downloadVoucherNativePDF(voucherFallback.voucher, voucherFallback.settings, 'double-stub', fileName);
  }

  let el = document.getElementById(elementId);
  if (!el) {
    el = document.getElementById('printable-voucher-document') || 
         document.getElementById('client-hd-voucher-card') || 
         document.querySelector('.hd-voucher-card') as HTMLElement;
  }
  if (!el) {
    console.error(`Export PDF error: element #${elementId} not found in DOM`);
    return false;
  }

  try {
    let imgData: string = '';

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      imgData = canvas.toDataURL('image/png', 0.98);
    } catch {
      imgData = await toPng(el, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
    }

    const img = new Image();
    img.src = imgData;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load rendered image'));
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const maxWidth = pdfWidth - margin * 2;
    const maxHeight = pdfHeight - margin * 2;

    const imgRatio = img.width / img.height;
    let renderWidth = maxWidth;
    let renderHeight = maxWidth / imgRatio;

    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = maxHeight * imgRatio;
    }

    const imgX = (pdfWidth - renderWidth) / 2;
    const imgY = Math.max(margin, (pdfHeight - renderHeight) / 2);

    pdf.addImage(imgData, 'PNG', imgX, imgY, renderWidth, renderHeight, undefined, 'FAST');
    pdf.save(`${fileName}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    return false;
  }
}

function triggerDownloadLink(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 1500);
}
