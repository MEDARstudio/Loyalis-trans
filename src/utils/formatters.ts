import { PaymentMethod, PaymentStatus, VoucherStatus } from '../types';

export function formatCurrency(amount: number, currency: string = 'DH'): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
  return `${formatted} ${currency}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    return new Date(dateString).toLocaleDateString('fr-FR');
  } catch {
    return dateString;
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function formatTrackingNumber(
  num: number | string,
  digits: number = 7,
  prefix: string = '',
  suffix: string = ''
): string {
  const numeric = typeof num === 'number' ? num : parseInt(String(num).replace(/\D/g, ''), 10) || 0;
  const padded = String(numeric).padStart(digits, '0');
  return `${prefix}${padded}${suffix}`;
}

export function getStatusBadge(status: VoucherStatus): {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'EN_ATTENTE':
      return {
        label: 'En attente',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500'
      };
    case 'EN_TRANSIT':
      return {
        label: 'En transit',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500'
      };
    case 'ARRIVE_AGENCE':
      return {
        label: 'Arrivé en agence',
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500'
      };
    case 'LIVRE':
      return {
        label: 'Livré / Retiré',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500'
      };
    case 'ANNULE':
      return {
        label: 'Annulé',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500'
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400'
      };
  }
}

export function getPaymentStatusInfo(
  paymentStatus?: PaymentStatus | PaymentMethod | string,
  advanceAmount: number = 0,
  totalPrice: number = 0,
  remainingAmount?: number
): {
  type: PaymentStatus;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  advance: number;
  remaining: number;
} {
  const statusStr = String(paymentStatus || 'PAYE').toUpperCase();
  let type: PaymentStatus = 'PAYE';

  if (statusStr === 'NON_PAYE' || statusStr === 'A_LA_LIVRAISON') {
    type = 'NON_PAYE';
  } else if (statusStr === 'AVANCE') {
    type = 'AVANCE';
  } else {
    type = 'PAYE';
  }

  const finalAdvance = type === 'AVANCE' ? advanceAmount : type === 'PAYE' ? totalPrice : 0;
  const finalRemaining = remainingAmount !== undefined 
    ? remainingAmount 
    : (type === 'PAYE' ? 0 : type === 'NON_PAYE' ? totalPrice : Math.max(0, totalPrice - finalAdvance));

  switch (type) {
    case 'PAYE':
      return {
        type: 'PAYE',
        label: 'Payé en totalité',
        shortLabel: 'Payé',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        badgeBorder: 'border-emerald-200 dark:border-emerald-800',
        advance: finalAdvance,
        remaining: 0
      };
    case 'NON_PAYE':
      return {
        type: 'NON_PAYE',
        label: 'Non payé (À la livraison)',
        shortLabel: 'Non payé',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/50',
        badgeText: 'text-rose-700 dark:text-rose-300',
        badgeBorder: 'border-rose-200 dark:border-rose-800',
        advance: 0,
        remaining: finalRemaining
      };
    case 'AVANCE':
      return {
        type: 'AVANCE',
        label: `Avance payée (${finalAdvance} DH)`,
        shortLabel: 'Avance',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/50',
        badgeText: 'text-amber-800 dark:text-amber-300',
        badgeBorder: 'border-amber-300 dark:border-amber-700',
        advance: finalAdvance,
        remaining: finalRemaining
      };
  }
}

export function getPaymentMethodLabel(method?: PaymentMethod | string): string {
  if (!method) return 'Payé';
  switch (method) {
    case 'PAYE':
    case 'DEJA_PAYE':
      return 'Payé';
    case 'NON_PAYE':
    case 'A_LA_LIVRAISON':
      return 'Non payé';
    case 'AVANCE':
      return 'Avance';
    case 'ESPECES':
      return 'Espèces (Comptant)';
    case 'CHEQUE':
      return 'Chèque';
    case 'VIREMENT':
      return 'Virement Bancaire';
    default:
      return method;
  }
}
