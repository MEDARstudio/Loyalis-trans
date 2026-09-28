import QRCode from 'qrcode';
import { Voucher } from '../types';

/**
 * Returns the official, direct tracking URL for a voucher.
 * Compatible with any domain, subpath, or local preview.
 */
export function getVoucherTrackingUrl(voucher: Voucher | { trackingNumber?: string; id?: string }): string {
  const currentOrigin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : '';
  const pathname = typeof window !== 'undefined' && window.location.pathname
    ? window.location.pathname.replace(/\/+$/, '')
    : '';
  
  const code = voucher.trackingNumber || voucher.id || '';
  return `${currentOrigin}${pathname}/?track=${encodeURIComponent(code)}`;
}

/**
 * Extracts a voucher tracking number from any QR code content, URL, hash, or scanned text.
 */
export function extractTrackingCode(input: string): string {
  if (!input) return '';
  const cleanInput = input.trim();

  // 1. Try URL parameters: ?track=0000501 or ?suivi=0000501 or ?code=0000501
  try {
    if (cleanInput.includes('?') || cleanInput.includes('&')) {
      const queryString = cleanInput.includes('?') ? cleanInput.split('?')[1] : cleanInput;
      const params = new URLSearchParams(queryString);
      const val = params.get('track') || params.get('suivi') || params.get('code') || params.get('bon') || params.get('qr');
      if (val && val.trim()) {
        return val.trim();
      }
    }
  } catch {
    // ignore
  }

  // 2. Try hash URL: #track=0000501 or #/track/0000501
  const hashMatch = cleanInput.match(/(?:track|suivi|code|bon)[=/]([a-zA-Z0-9_-]+)/i);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1].trim();
  }

  // 3. Try multiline text format (e.g. "N° Suivi : 0000501")
  const numMatch = cleanInput.match(/(?:N°\s*Suivi|N°\s*Bon|Suivi|Tracking)\s*[:#]\s*([a-zA-Z0-9_-]+)/i);
  if (numMatch && numMatch[1]) {
    return numMatch[1].trim();
  }

  // 4. Try path format: /track/0000501 or /suivi/0000501
  const pathMatch = cleanInput.match(/\/(?:track|suivi)\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1].trim();
  }

  // 5. Fallback: If it's already a code without spaces (or numeric/alphanumeric code)
  return cleanInput;
}

export async function generateVoucherQRDataUrl(
  voucher: Voucher,
  options?: {
    size?: number;
    mode?: 'url' | 'details';
  }
): Promise<string> {
  const trackingUrl = getVoucherTrackingUrl(voucher);

  // Default to direct clickable Tracking URL for instant 1-tap mobile camera scanning
  let qrContent = trackingUrl;

  if (options?.mode === 'details') {
    qrContent = `📦 LOYALIS TRANS - SUIVI OFFICIEL
N° Suivi : ${voucher.trackingNumber}
Date : ${voucher.date}
Trajet : ${voucher.departureCity || 'Casablanca'} ➔ ${voucher.recipient?.destination || voucher.destinationCity || ''}
Expéditeur : ${voucher.sender?.name || ''} (${voucher.sender?.phone || ''})
Destinataire : ${voucher.recipient?.name || ''} (${voucher.recipient?.phone || ''})
Colis : ${voucher.totalColis} pièce(s) • ${voucher.totalWeightKg} kg
Montant : ${voucher.totalPrice} DH
Suivi direct : ${trackingUrl}`;
  }

  try {
    const dataUrl = await QRCode.toDataURL(qrContent, {
      width: options?.size || 400,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'Q'
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}
