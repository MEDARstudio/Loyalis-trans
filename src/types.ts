export type PaymentStatus = 'NON_PAYE' | 'PAYE' | 'AVANCE';

export type PaymentMethod = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'A_LA_LIVRAISON' | 'DEJA_PAYE' | 'NON_PAYE' | 'PAYE' | 'AVANCE';

export type VoucherStatus = 'EN_ATTENTE' | 'EN_TRANSIT' | 'ARRIVE_AGENCE' | 'LIVRE' | 'ANNULE';

export type ExternalPaymentStatus = 'PAID' | 'UNPAID';

export type AgentRole = 'ADMIN' | 'AGENT';

export interface AgentProfile {
  id: string;
  name: string; // 'Amine' | 'Sofiane'
  role: AgentRole;
  agencyCity: string; // 'Agadir' | 'Casablanca'
  canDelete: boolean;
  canValidate: boolean;
  color?: string;
  avatarInitials?: string;
  phone?: string;
}

export const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: 'agent-amine',
    name: 'Amine',
    role: 'ADMIN',
    agencyCity: 'Agadir',
    canDelete: true,
    canValidate: true,
    color: 'orange',
    avatarInitials: 'AM',
    phone: '+212 6 61 00 00 01'
  },
  {
    id: 'agent-sofiane',
    name: 'Sofiane',
    role: 'AGENT',
    agencyCity: 'Casablanca',
    canDelete: false,
    canValidate: false,
    color: 'blue',
    avatarInitials: 'SO',
    phone: '+212 6 62 00 00 02'
  }
];

export interface VoucherPhoto {
  id: string;
  name: string; // e.g. "Bon-Reel-0000003.jpg" or "Colis-0000003-Cas-1.jpg"
  dataUrl: string; // Base64 compressed image
  type: 'BON_REEL' | 'PARCEL_CASE';
  sizeBytes?: number;
  capturedAt: string; // ISO
  caption?: string; // Note ou description du cas/bon
}

export interface LuggageItem {
  id: string;
  nature: string;
  weightKg: number; // Poids total en kg pour cette nature de colis
  quantity: number; // Quantité de colis pour cette nature
  price?: number; // Montant total pour cette nature de colis (DH)
  unitPrice?: number; // Compatibilité rétroactive
  notes?: string;
}

export interface Voucher {
  id: string;
  trackingNumber: string;
  sequenceNumber: number;
  date: string; // YYYY-MM-DD
  time?: string;
  createdAt: string; // ISO
  updatedAt?: string;
  
  // Sender (Expéditeur)
  sender: {
    name: string;
    cin: string;
    phone: string;
    address: string;
  };

  // Recipient (Destinataire)
  recipient: {
    name: string;
    destination: string; // City / Agency / Address
    phone: string;
    address?: string;
  };

  // Baggage / Colis details
  departureCity: string;
  destinationCity: string;
  items: LuggageItem[];
  
  totalColis: number; // Automatic sum of quantities
  totalWeightKg: number; // Automatic sum of weight
  totalPrice: number; // Final price billed to client
  
  paymentStatus: PaymentStatus; // 'NON_PAYE' | 'PAYE' | 'AVANCE'
  advanceAmount?: number; // Montant de l'avance reçue (si AVANCE)
  remainingAmount?: number; // Reste à payer par le client
  paymentMethod?: PaymentMethod;
  status: VoucherStatus;
  notes?: string;
  agentName?: string;
  agencyName?: string;

  // Validation & Audit (Amine vs Sofiane)
  createdByAgent?: string; // e.g. 'Sofiane'
  isValidated?: boolean; // True quand vérifié et validé avec le bon réel
  validatedBy?: string; // e.g. 'Amine'
  validatedByAgent?: string; // Alias compatibility
  validatedAt?: string; // ISO
  validationNotes?: string;

  // Photos & Documents attachés
  bonReelPhoto?: VoucherPhoto | null; // Photo du bon réel manuscrit rempli sur place
  casePhotos?: VoucherPhoto[]; // Photos des colis, cas particuliers, emballages, litiges

  // Offline Mode & Synchronization
  isOfflinePending?: boolean; // True si créé hors-ligne et en attente de synchro
  syncStatus?: 'SYNCED' | 'PENDING' | 'SYNCING';
  offlineCreatedAt?: string;

  // Sous-traitance & Transporteur Externe (Quand notre transport ne voyage pas)
  isExternalTransport?: boolean; // True si confié à un transporteur tiers
  externalCarrierName?: string; // Nom du transporteur externe (ex: Trans Ghazala, CTM, Transporteur X)
  externalCarrierPhone?: string; // Téléphone du transporteur tiers
  externalCarrierVoucherRef?: string; // N° de reçu / Réf bon du transporteur tiers
  externalCost?: number; // Montant payé/dû au transporteur tiers (DH)
  externalPaymentStatus?: ExternalPaymentStatus; // 'PAID' (Payé/Réglé) | 'UNPAID' (À régler / En attente)
  externalNotes?: string; // Notes particulières sur la sous-traitance / lieu de transfert
}

export interface FinancialSummary {
  totalClientRevenue: number; // Total facturé aux clients
  totalClientCollected: number; // Total déjà encaissé des clients
  totalClientRemaining: number; // Reste à encaisser des clients
  
  totalExternalCost: number; // Dépenses totales sous-traitance (transporteurs tiers)
  totalExternalPaid: number; // Dépenses déjà payées aux transporteurs
  totalExternalUnpaid: number; // Reste à payer aux transporteurs tiers (dettes fournisseurs)
  
  netProfit: number; // Marge Nette = Total Revenu Client - Total Coût Sous-traitance
  profitMarginPercent: number; // (Marge / Revenu) * 100
  
  totalShipments: number;
  internalShipmentsCount: number; // Flotte propre
  externalShipmentsCount: number; // Sous-traités
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  phone1: string;
  phone2: string;
  email: string;
  address: string;
  currency: string;
  trackingCodeDigits: number; // e.g. 7 => "0000001"
  trackingPrefix: string; // e.g. "" or "LT-"
  trackingSuffix: string;
  nextTrackingNumber: number;
  allowManualTrackingNumber: boolean;
  defaultDepartureCity: string;
  defaultAgencies: string[];
  defaultNatureOptions: string[];
  termsAndConditions: string;
}

export interface VoucherStats {
  totalVouchers: number;
  totalRevenue: number;
  totalWeightKg: number;
  totalColis: number;
  pendingCount: number;
  inTransitCount: number;
  arrivedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  todayCount: number;
  todayRevenue: number;
}
