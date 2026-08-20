import QRCode from 'qrcode';
import { Voucher } from '../types';

export async function generateVoucherQRDataUrl(
  voucher: Voucher,
  options?: {
    size?: number;
    mode?: 'url' | 'details';
  }
): Promise<string> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const trackingUrl = `${currentOrigin}/?track=${encodeURIComponent(voucher.trackingNumber)}`;

  // Default to direct clickable Tracking URL for instant 1-tap mobile camera scanning
  let qrContent = trackingUrl;

  if (options?.mode === 'details') {
    qrContent = `📦 LOYALIS TRANS - SUIVI OFFICIEL
N° Suivi : ${voucher.trackingNumber}
Date : ${voucher.date}
Trajet : ${voucher.departureCity || 'Casablanca'} ➔ ${voucher.recipient.destination}
Expéditeur : ${voucher.sender.name} (${voucher.sender.phone})
Destinataire : ${voucher.recipient.name} (${voucher.recipient.phone})
Colis : ${voucher.totalColis} pièce(s) • ${voucher.totalWeightKg} kg
Montant : ${voucher.totalPrice} DH
Suivi en direct : ${trackingUrl}`;
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

