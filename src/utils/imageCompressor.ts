import { VoucherPhoto } from '../types';

/**
 * Compresses an image file (JPEG/PNG/WEBP/Camera capture)
 * Resizes max dimension to 1600px and optimizes quality to ~0.82
 */
export async function compressImageFile(
  file: File | Blob, 
  maxWidth = 1600, 
  maxHeight = 1600, 
  quality = 0.82
): Promise<{ dataUrl: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context non disponible'));
          return;
        }

        // Fill white background in case of transparent pngs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Estimate size in bytes from base64 string
        const sizeBytes = Math.round((dataUrl.length * 3) / 4);
        resolve({ dataUrl, sizeBytes });
      };
      img.onerror = () => reject(new Error('Impossible de lire le fichier image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates automatic formatted photo name with tracking number
 */
export function generatePhotoFilename(
  type: 'BON_REEL' | 'PARCEL_CASE',
  trackingNumber: string,
  index = 1
): string {
  const cleanTracking = (trackingNumber || 'SANS-NUM').replace(/[^a-zA-Z0-9-_]/g, '');
  if (type === 'BON_REEL') {
    return `Bon-Reel-${cleanTracking}.jpg`;
  }
  return `Colis-${cleanTracking}-Cas-${index}.jpg`;
}

/**
 * Process uploaded / camera captured file into a structured VoucherPhoto
 */
export async function processVoucherPhoto(
  file: File,
  type: 'BON_REEL' | 'PARCEL_CASE',
  trackingNumber: string,
  index = 1,
  caption = ''
): Promise<VoucherPhoto> {
  const { dataUrl, sizeBytes } = await compressImageFile(file);
  const name = generatePhotoFilename(type, trackingNumber, index);

  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name,
    dataUrl,
    type,
    sizeBytes,
    capturedAt: new Date().toISOString(),
    caption: caption.trim()
  };
}

/**
 * Download a VoucherPhoto with its proper automatic filename
 */
export function downloadPhoto(photo: VoucherPhoto, fallbackTracking = ''): void {
  const filename = photo.name || generatePhotoFilename(photo.type, fallbackTracking);
  const link = document.createElement('a');
  link.href = photo.dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format bytes into human readable string (KB / MB)
 */
export function formatPhotoSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
