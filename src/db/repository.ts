import { db, createPool, isDatabaseConfigured, getConnectionString } from './index.ts';
import { settingsTable, vouchersTable, users } from './schema.ts';
import { eq, desc, and, gte, lte, or, ilike, inArray } from 'drizzle-orm';
import { CompanySettings, Voucher, VoucherStats } from '../types.ts';

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Loyalis Trans',
  tagline: 'Transport & Messagerie Express de Bagages & Marchandises',
  phone1: '+212 6 61 00 00 00',
  phone2: '+33 6 00 00 00 00',
  email: 'contact@loyalistrans.com',
  address: 'Agence Principale - Gare Routière / Transit International',
  currency: 'DH',
  trackingCodeDigits: 7,
  trackingPrefix: '',
  trackingSuffix: '',
  nextTrackingNumber: 502,
  allowManualTrackingNumber: true,
  defaultDepartureCity: 'Casablanca',
  defaultAgencies: [
    'Casablanca',
    'Tanger',
    'Marrakech',
    'Agadir',
    'Rabat',
    'Fès',
    'Oujda',
    'Nador',
    'Paris',
    'Bruxelles',
    'Madrid',
    'Lyon',
    'Bordeaux'
  ],
  defaultNatureOptions: [
    'Valise',
    'Carton standard',
    'Sac de voyage',
    'Effets personnels',
    'Électroménager',
    'Matériel informatique',
    'Textile / Vêtements',
    'Colis alimentaire scellé',
    'Documents'
  ],
  termsAndConditions: '1. Les bagages doivent être fermés et étiquetés avec le numéro de bon.\n2. Tout bagage dont la valeur dépasse 1 500 DHS doit être déclaré lors de son dépôt.\n3. La société Loyalis Trans décline toute responsabilité pour les objets précieux non déclarés.\n4. Tout bagage perdu fera l’objet d’une déclaration après un délai de 15 jours.'
};

// Resilient in-memory store for fallback
let memorySettings: CompanySettings = { ...DEFAULT_SETTINGS };
let memoryVouchers: Voucher[] = [
  {
    id: 'v-501',
    trackingNumber: '0000501',
    sequenceNumber: 501,
    date: new Date().toISOString().substring(0, 10),
    time: '10:00',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sender: {
      name: 'Client Expéditeur',
      cin: 'AB123456',
      phone: '+212 6 61 00 00 00',
      address: 'Casablanca'
    },
    recipient: {
      name: 'Destinataire',
      destination: 'Paris (Île-de-France)',
      phone: '+33 6 00 00 00 00',
      address: 'Paris'
    },
    departureCity: 'Casablanca',
    destinationCity: 'Paris',
    items: [
      { id: 'item-501-1', nature: 'Valise / Colis', weightKg: 20, quantity: 1, unitPrice: 200, notes: 'Bagage étiqueté' }
    ],
    totalColis: 1,
    totalWeightKg: 20,
    totalPrice: 200,
    paymentStatus: 'PAYE',
    advanceAmount: 200,
    remainingAmount: 0,
    paymentMethod: 'PAYE',
    status: 'EN_ATTENTE',
    agencyName: 'Agence Loyalis Trans',
    agentName: 'Responsable Agence',
    createdByAgent: 'Sofiane',
    isValidated: true,
    validatedBy: 'Amine'
  }
];

export async function ensureDatabaseColumns(): Promise<void> {
  const pool = createPool();
  if (!pool) {
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        display_name TEXT,
        role TEXT DEFAULT 'AGENT',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL DEFAULT 'Loyalis Trans',
        tagline TEXT DEFAULT 'Transport & Messagerie Express de Bagages & Marchandises',
        phone1 TEXT DEFAULT '+212 6 61 00 00 00',
        phone2 TEXT DEFAULT '+33 6 00 00 00 00',
        email TEXT DEFAULT 'contact@loyalistrans.com',
        address TEXT DEFAULT 'Agence Principale - Gare Routière / Transit International',
        currency TEXT DEFAULT 'DH',
        tracking_code_digits INTEGER DEFAULT 7,
        tracking_prefix TEXT DEFAULT '',
        tracking_suffix TEXT DEFAULT '',
        next_tracking_number INTEGER DEFAULT 1,
        allow_manual_tracking_number BOOLEAN DEFAULT TRUE,
        default_departure_city TEXT DEFAULT 'Casablanca',
        default_agencies JSONB DEFAULT '["Casablanca", "Tanger", "Marrakech", "Agadir", "Rabat", "Fès", "Oujda", "Nador", "Paris", "Bruxelles", "Madrid", "Lyon", "Bordeaux"]'::jsonb,
        default_nature_options JSONB DEFAULT '["Valise", "Carton standard", "Sac de voyage", "Effets personnels", "Électroménager", "Matériel informatique", "Textile / Vêtements", "Colis alimentaire scellé", "Documents"]'::jsonb,
        terms_and_conditions TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY,
        tracking_number TEXT NOT NULL UNIQUE,
        sequence_number INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        sender_name TEXT NOT NULL,
        sender_cin TEXT,
        sender_phone TEXT NOT NULL,
        sender_address TEXT,
        recipient_name TEXT NOT NULL,
        recipient_destination TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        recipient_address TEXT,
        departure_city TEXT NOT NULL,
        destination_city TEXT NOT NULL,
        items JSONB NOT NULL,
        total_colis INTEGER NOT NULL,
        total_weight_kg DOUBLE PRECISION NOT NULL,
        total_price DOUBLE PRECISION NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'PAYE',
        advance_amount DOUBLE PRECISION DEFAULT 0,
        remaining_amount DOUBLE PRECISION DEFAULT 0,
        payment_method TEXT DEFAULT 'PAYE',
        status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
        notes TEXT,
        agent_name TEXT,
        agency_name TEXT,
        bon_reel_photo JSONB,
        case_photos JSONB DEFAULT '[]'::jsonb,
        is_external_transport BOOLEAN DEFAULT FALSE,
        external_carrier_name TEXT,
        external_carrier_phone TEXT,
        external_carrier_voucher_ref TEXT,
        external_cost DOUBLE PRECISION DEFAULT 0,
        external_payment_status TEXT DEFAULT 'PAID',
        external_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_vouchers_tracking ON vouchers(tracking_number);
      CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date);
      CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
    `);

    await pool.query(`
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_external_transport BOOLEAN DEFAULT FALSE;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS external_carrier_name TEXT;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS external_carrier_phone TEXT;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS external_carrier_voucher_ref TEXT;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS external_cost DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS external_payment_status TEXT DEFAULT 'PAID';
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS external_notes TEXT;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS created_by_agent TEXT;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT FALSE;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS validated_by TEXT;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP;
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS validation_notes TEXT;
    `);
  } catch (err: any) {
    console.warn('[Database Setup Info]:', err?.message || err);
  }
}

export function formatTrackingCode(seqNumber: number, settings: CompanySettings): string {
  const digits = settings.trackingCodeDigits || 7;
  const padded = String(seqNumber).padStart(digits, '0');
  const prefix = settings.trackingPrefix || '';
  const suffix = settings.trackingSuffix || '';
  return `${prefix}${padded}${suffix}`;
}

export async function getSettings(): Promise<CompanySettings> {
  if (db && isDatabaseConfigured()) {
    try {
      const rows = await db.select().from(settingsTable).limit(1);
      if (rows.length > 0) {
        const row = rows[0];
        const res: CompanySettings = {
          companyName: row.companyName,
          tagline: row.tagline || '',
          phone1: row.phone1 || '',
          phone2: row.phone2 || '',
          email: row.email || '',
          address: row.address || '',
          currency: row.currency || 'DH',
          trackingCodeDigits: row.trackingCodeDigits || 7,
          trackingPrefix: row.trackingPrefix || '',
          trackingSuffix: row.trackingSuffix || '',
          nextTrackingNumber: row.nextTrackingNumber || 1,
          allowManualTrackingNumber: row.allowManualTrackingNumber ?? true,
          defaultDepartureCity: row.defaultDepartureCity || 'Casablanca',
          defaultAgencies: (row.defaultAgencies as string[]) || DEFAULT_SETTINGS.defaultAgencies,
          defaultNatureOptions: (row.defaultNatureOptions as string[]) || DEFAULT_SETTINGS.defaultNatureOptions,
          termsAndConditions: row.termsAndConditions || DEFAULT_SETTINGS.termsAndConditions,
        };
        memorySettings = { ...res };
        return res;
      }
    } catch (error) {
      // Fall through to memory
    }
  }
  return memorySettings;
}

export async function updateSettings(newSettings: Partial<CompanySettings>): Promise<CompanySettings> {
  const current = memorySettings;
  const merged: CompanySettings = { ...current, ...newSettings };
  memorySettings = merged;

  if (db && isDatabaseConfigured()) {
    try {
      await db.insert(settingsTable).values({
        id: 1,
        companyName: merged.companyName,
        tagline: merged.tagline,
        phone1: merged.phone1,
        phone2: merged.phone2,
        email: merged.email,
        address: merged.address,
        currency: merged.currency,
        trackingCodeDigits: merged.trackingCodeDigits,
        trackingPrefix: merged.trackingPrefix,
        trackingSuffix: merged.trackingSuffix,
        nextTrackingNumber: merged.nextTrackingNumber,
        allowManualTrackingNumber: merged.allowManualTrackingNumber,
        defaultDepartureCity: merged.defaultDepartureCity,
        defaultAgencies: merged.defaultAgencies,
        defaultNatureOptions: merged.defaultNatureOptions,
        termsAndConditions: merged.termsAndConditions,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: settingsTable.id,
        set: {
          companyName: merged.companyName,
          tagline: merged.tagline,
          phone1: merged.phone1,
          phone2: merged.phone2,
          email: merged.email,
          address: merged.address,
          currency: merged.currency,
          trackingCodeDigits: merged.trackingCodeDigits,
          trackingPrefix: merged.trackingPrefix,
          trackingSuffix: merged.trackingSuffix,
          nextTrackingNumber: merged.nextTrackingNumber,
          allowManualTrackingNumber: merged.allowManualTrackingNumber,
          defaultDepartureCity: merged.defaultDepartureCity,
          defaultAgencies: merged.defaultAgencies,
          defaultNatureOptions: merged.defaultNatureOptions,
          termsAndConditions: merged.termsAndConditions,
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      // Memory handles
    }
  }
  return merged;
}

function mapRowToVoucher(row: typeof vouchersTable.$inferSelect): Voucher {
  return {
    id: row.id,
    trackingNumber: row.trackingNumber,
    sequenceNumber: row.sequenceNumber,
    date: row.date,
    time: row.time || '',
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    sender: {
      name: row.senderName,
      cin: row.senderCin || '',
      phone: row.senderPhone,
      address: row.senderAddress || '',
    },
    recipient: {
      name: row.recipientName,
      destination: row.recipientDestination,
      phone: row.recipientPhone,
      address: row.recipientAddress || '',
    },
    departureCity: row.departureCity,
    destinationCity: row.destinationCity,
    items: (row.items as any) || [],
    totalColis: row.totalColis,
    totalWeightKg: row.totalWeightKg,
    totalPrice: row.totalPrice,
    paymentStatus: row.paymentStatus as any,
    advanceAmount: row.advanceAmount ?? 0,
    remainingAmount: row.remainingAmount ?? 0,
    paymentMethod: (row.paymentMethod as any) || row.paymentStatus,
    status: row.status as any,
    notes: row.notes || '',
    agentName: row.agentName || '',
    agencyName: row.agencyName || '',
    createdByAgent: row.createdByAgent || '',
    isValidated: row.isValidated ?? false,
    validatedBy: row.validatedBy || '',
    validatedAt: row.validatedAt ? row.validatedAt.toISOString() : undefined,
    validationNotes: row.validationNotes || '',
    bonReelPhoto: (row.bonReelPhoto as any) || null,
    casePhotos: (row.casePhotos as any) || [],
    isExternalTransport: row.isExternalTransport ?? false,
    externalCarrierName: row.externalCarrierName || '',
    externalCarrierPhone: row.externalCarrierPhone || '',
    externalCarrierVoucherRef: row.externalCarrierVoucherRef || '',
    externalCost: row.externalCost ?? 0,
    externalPaymentStatus: (row.externalPaymentStatus as any) || 'PAID',
    externalNotes: row.externalNotes || '',
  };
}

export async function getVouchers(filters?: {
  search?: string;
  status?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Voucher[]> {
  let vouchers: Voucher[] = [];

  if (db && isDatabaseConfigured()) {
    try {
      const rows = await db.select().from(vouchersTable).orderBy(desc(vouchersTable.createdAt));
      vouchers = rows.map(mapRowToVoucher);
      memoryVouchers = vouchers;
    } catch (error) {
      vouchers = [...memoryVouchers];
    }
  } else {
    vouchers = [...memoryVouchers];
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    vouchers = vouchers.filter(v =>
      v.trackingNumber.toLowerCase().includes(q) ||
      v.sender.name.toLowerCase().includes(q) ||
      v.sender.cin.toLowerCase().includes(q) ||
      v.sender.phone.toLowerCase().includes(q) ||
      v.recipient.name.toLowerCase().includes(q) ||
      v.recipient.destination.toLowerCase().includes(q) ||
      v.recipient.phone.toLowerCase().includes(q) ||
      v.items.some(it => it.nature.toLowerCase().includes(q))
    );
  }

  if (filters?.status && filters.status !== 'ALL') {
    vouchers = vouchers.filter(v => v.status === filters.status);
  }

  if (filters?.destination && filters.destination !== 'ALL') {
    vouchers = vouchers.filter(v =>
      v.destinationCity.toLowerCase() === filters.destination!.toLowerCase() ||
      v.recipient.destination.toLowerCase().includes(filters.destination!.toLowerCase())
    );
  }

  if (filters?.startDate) {
    vouchers = vouchers.filter(v => v.date >= filters.startDate!);
  }

  if (filters?.endDate) {
    vouchers = vouchers.filter(v => v.date <= filters.endDate!);
  }

  return vouchers;
}

export async function getVoucherByIdOrTracking(idOrTracking: string): Promise<Voucher | null> {
  if (db && isDatabaseConfigured()) {
    try {
      const rows = await db.select().from(vouchersTable).where(
        or(
          eq(vouchersTable.id, idOrTracking),
          eq(vouchersTable.trackingNumber, idOrTracking)
        )
      ).limit(1);

      if (rows.length > 0) {
        return mapRowToVoucher(rows[0]);
      }
    } catch (error) {
      // fallback
    }
  }

  const found = memoryVouchers.find(v => v.id === idOrTracking || v.trackingNumber === idOrTracking);
  return found || null;
}

export async function createVoucher(payload: any): Promise<{ voucher: Voucher; nextTrackingNumber: number }> {
  const settings = await getSettings();
  const currentNextSeq = Number(settings.nextTrackingNumber) || 1;

  let finalTrackingNumber = payload.trackingNumber;
  let sequenceNumber = payload.sequenceNumber || currentNextSeq;

  if (!finalTrackingNumber || String(finalTrackingNumber).trim() === '') {
    finalTrackingNumber = formatTrackingCode(currentNextSeq, settings);
    sequenceNumber = currentNextSeq;
    await updateSettings({ nextTrackingNumber: currentNextSeq + 1 });
  } else {
    if (sequenceNumber >= currentNextSeq) {
      await updateSettings({ nextTrackingNumber: sequenceNumber + 1 });
    }
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const totalColis = payload.totalColis !== undefined ? Number(payload.totalColis) : items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
  const totalWeightKg = payload.totalWeightKg !== undefined ? Number(payload.totalWeightKg) : items.reduce((sum: number, it: any) => sum + (Number(it.weightKg) || 0), 0);
  const totalPrice = Number(payload.totalPrice) >= 0 ? Number(payload.totalPrice) : items.reduce((sum: number, it: any) => sum + (Number(it.price) || Number(it.unitPrice) || 0), 0);

  const now = new Date();
  const id = payload.id || `v-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const finalPaymentStatus = payload.paymentStatus || (payload.paymentMethod === 'A_LA_LIVRAISON' || payload.paymentMethod === 'NON_PAYE' ? 'NON_PAYE' : payload.paymentMethod === 'AVANCE' ? 'AVANCE' : 'PAYE');
  
  let advance = 0;
  if (finalPaymentStatus === 'AVANCE') {
    advance = Number(payload.advanceAmount) || 0;
  } else if (finalPaymentStatus === 'PAYE') {
    advance = totalPrice;
  }
  const remaining = finalPaymentStatus === 'PAYE' ? 0 : finalPaymentStatus === 'NON_PAYE' ? totalPrice : Math.max(0, Math.round((totalPrice - advance) * 100) / 100);

  const sanitizedItems = items.map((it: any, idx: number) => ({
    id: it.id || `item-${Date.now()}-${idx}`,
    nature: it.nature || 'Colis standard',
    weightKg: Number(it.weightKg) || 0,
    quantity: Number(it.quantity) || 1,
    price: it.price !== undefined ? Number(it.price) : Number(it.unitPrice) || 0,
    unitPrice: it.price !== undefined ? Number(it.price) : Number(it.unitPrice) || 0,
    notes: it.notes || ''
  }));

  const newVoucher: Voucher = {
    id,
    trackingNumber: String(finalTrackingNumber).trim(),
    sequenceNumber,
    date: payload.date || now.toISOString().split('T')[0],
    time: payload.time || now.toTimeString().substring(0, 5),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sender: {
      name: payload.sender?.name || '',
      cin: payload.sender?.cin || '',
      phone: payload.sender?.phone || '',
      address: payload.sender?.address || '',
    },
    recipient: {
      name: payload.recipient?.name || '',
      destination: payload.recipient?.destination || '',
      phone: payload.recipient?.phone || '',
      address: payload.recipient?.address || '',
    },
    departureCity: payload.departureCity || settings.defaultDepartureCity || 'Casablanca',
    destinationCity: payload.destinationCity || payload.recipient?.destination || '',
    items: sanitizedItems,
    totalColis: totalColis || 1,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    paymentStatus: finalPaymentStatus,
    advanceAmount: advance,
    remainingAmount: remaining,
    paymentMethod: payload.paymentMethod || finalPaymentStatus,
    status: payload.status || 'EN_ATTENTE',
    notes: payload.notes || '',
    agencyName: payload.agencyName || settings.address,
    agentName: payload.agentName || 'Agent Loyalis Trans',
    createdByAgent: payload.createdByAgent || payload.agentName || 'Sofiane',
    isValidated: Boolean(payload.isValidated),
    validatedBy: payload.validatedBy || undefined,
    validatedAt: payload.validatedAt ? payload.validatedAt : undefined,
    validationNotes: payload.validationNotes || '',
    bonReelPhoto: payload.bonReelPhoto || null,
    casePhotos: payload.casePhotos || [],
    isExternalTransport: Boolean(payload.isExternalTransport),
    externalCarrierName: payload.externalCarrierName || '',
    externalCarrierPhone: payload.externalCarrierPhone || '',
    externalCarrierVoucherRef: payload.externalCarrierVoucherRef || '',
    externalCost: Number(payload.externalCost) || 0,
    externalPaymentStatus: payload.externalPaymentStatus || 'PAID',
    externalNotes: payload.externalNotes || '',
  };

  // Update memory store
  memoryVouchers = [newVoucher, ...memoryVouchers.filter(v => v.id !== id)];

  if (db && isDatabaseConfigured()) {
    try {
      await db.insert(vouchersTable).values({
        id,
        trackingNumber: String(finalTrackingNumber).trim(),
        sequenceNumber,
        date: newVoucher.date,
        time: newVoucher.time,
        createdAt: now,
        updatedAt: now,
        senderName: newVoucher.sender.name,
        senderCin: newVoucher.sender.cin,
        senderPhone: newVoucher.sender.phone,
        senderAddress: newVoucher.sender.address,
        recipientName: newVoucher.recipient.name,
        recipientDestination: newVoucher.recipient.destination,
        recipientPhone: newVoucher.recipient.phone,
        recipientAddress: newVoucher.recipient.address,
        departureCity: newVoucher.departureCity,
        destinationCity: newVoucher.destinationCity,
        items: sanitizedItems,
        totalColis: newVoucher.totalColis,
        totalWeightKg: newVoucher.totalWeightKg,
        totalPrice: newVoucher.totalPrice,
        paymentStatus: finalPaymentStatus,
        advanceAmount: advance,
        remainingAmount: remaining,
        paymentMethod: newVoucher.paymentMethod,
        status: newVoucher.status,
        notes: newVoucher.notes,
        agencyName: newVoucher.agencyName,
        agentName: newVoucher.agentName,
        createdByAgent: newVoucher.createdByAgent,
        isValidated: newVoucher.isValidated,
        validatedBy: newVoucher.validatedBy || null,
        validatedAt: newVoucher.validatedAt ? new Date(newVoucher.validatedAt) : null,
        validationNotes: newVoucher.validationNotes,
        bonReelPhoto: newVoucher.bonReelPhoto,
        casePhotos: newVoucher.casePhotos,
        isExternalTransport: newVoucher.isExternalTransport,
        externalCarrierName: newVoucher.externalCarrierName,
        externalCarrierPhone: newVoucher.externalCarrierPhone,
        externalCarrierVoucherRef: newVoucher.externalCarrierVoucherRef,
        externalCost: newVoucher.externalCost,
        externalPaymentStatus: newVoucher.externalPaymentStatus,
        externalNotes: newVoucher.externalNotes,
      });
    } catch (error) {
      // Memory store handles it
    }
  }

  const updatedSettings = await getSettings();
  return {
    voucher: newVoucher,
    nextTrackingNumber: updatedSettings.nextTrackingNumber,
  };
}

export async function updateVoucher(idOrTracking: string, payload: any): Promise<Voucher> {
  const existing = await getVoucherByIdOrTracking(idOrTracking);
  if (!existing) {
    throw new Error('Bon non trouvé');
  }

  const items = Array.isArray(payload.items) ? payload.items : existing.items;
  const totalColis = payload.totalColis !== undefined ? Number(payload.totalColis) : items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
  const totalWeightKg = payload.totalWeightKg !== undefined ? Number(payload.totalWeightKg) : items.reduce((sum: number, it: any) => sum + (Number(it.weightKg) || 0), 0);
  const totalPrice = payload.totalPrice !== undefined ? Number(payload.totalPrice) : existing.totalPrice;

  const finalPaymentStatus = payload.paymentStatus || existing.paymentStatus || (payload.paymentMethod === 'A_LA_LIVRAISON' ? 'NON_PAYE' : 'PAYE');
  let finalAdvance = payload.advanceAmount !== undefined ? Number(payload.advanceAmount) : (existing.advanceAmount || 0);
  if (finalPaymentStatus === 'PAYE') {
    finalAdvance = totalPrice;
  } else if (finalPaymentStatus === 'NON_PAYE') {
    finalAdvance = 0;
  }
  const finalRemaining = finalPaymentStatus === 'PAYE' ? 0 : finalPaymentStatus === 'NON_PAYE' ? totalPrice : Math.max(0, Math.round((totalPrice - finalAdvance) * 100) / 100);

  const updated: Voucher = {
    ...existing,
    trackingNumber: payload.trackingNumber || existing.trackingNumber,
    date: payload.date || existing.date,
    time: payload.time || existing.time,
    updatedAt: new Date().toISOString(),
    sender: {
      ...existing.sender,
      ...(payload.sender || {})
    },
    recipient: {
      ...existing.recipient,
      ...(payload.recipient || {})
    },
    departureCity: payload.departureCity ?? existing.departureCity,
    destinationCity: payload.destinationCity ?? existing.destinationCity,
    items,
    totalColis: totalColis || 1,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    paymentStatus: finalPaymentStatus,
    advanceAmount: finalAdvance,
    remainingAmount: finalRemaining,
    paymentMethod: payload.paymentMethod || existing.paymentMethod || finalPaymentStatus,
    status: payload.status || existing.status,
    notes: payload.notes ?? existing.notes,
    agencyName: payload.agencyName ?? existing.agencyName,
    agentName: payload.agentName ?? existing.agentName,
    createdByAgent: payload.createdByAgent ?? existing.createdByAgent,
    isValidated: payload.isValidated !== undefined ? Boolean(payload.isValidated) : existing.isValidated,
    validatedBy: payload.validatedBy !== undefined ? payload.validatedBy : existing.validatedBy,
    validatedAt: payload.validatedAt ? payload.validatedAt : existing.validatedAt,
    validationNotes: payload.validationNotes !== undefined ? payload.validationNotes : existing.validationNotes,
    bonReelPhoto: payload.bonReelPhoto !== undefined ? payload.bonReelPhoto : existing.bonReelPhoto,
    casePhotos: payload.casePhotos !== undefined ? payload.casePhotos : existing.casePhotos,
    isExternalTransport: payload.isExternalTransport !== undefined ? Boolean(payload.isExternalTransport) : existing.isExternalTransport,
    externalCarrierName: payload.externalCarrierName !== undefined ? payload.externalCarrierName : existing.externalCarrierName,
    externalCarrierPhone: payload.externalCarrierPhone !== undefined ? payload.externalCarrierPhone : existing.externalCarrierPhone,
    externalCarrierVoucherRef: payload.externalCarrierVoucherRef !== undefined ? payload.externalCarrierVoucherRef : existing.externalCarrierVoucherRef,
    externalCost: payload.externalCost !== undefined ? Number(payload.externalCost) : (existing.externalCost || 0),
    externalPaymentStatus: payload.externalPaymentStatus !== undefined ? payload.externalPaymentStatus : (existing.externalPaymentStatus || 'PAID'),
    externalNotes: payload.externalNotes !== undefined ? payload.externalNotes : existing.externalNotes,
  };

  memoryVouchers = memoryVouchers.map(v => v.id === existing.id ? updated : v);

  if (db && isDatabaseConfigured()) {
    try {
      await db.update(vouchersTable).set({
        trackingNumber: updated.trackingNumber,
        date: updated.date,
        time: updated.time,
        updatedAt: new Date(),
        senderName: updated.sender.name,
        senderCin: updated.sender.cin,
        senderPhone: updated.sender.phone,
        senderAddress: updated.sender.address,
        recipientName: updated.recipient.name,
        recipientDestination: updated.recipient.destination,
        recipientPhone: updated.recipient.phone,
        recipientAddress: updated.recipient.address,
        departureCity: updated.departureCity,
        destinationCity: updated.destinationCity,
        items,
        totalColis: updated.totalColis,
        totalWeightKg: updated.totalWeightKg,
        totalPrice: updated.totalPrice,
        paymentStatus: finalPaymentStatus,
        advanceAmount: finalAdvance,
        remainingAmount: finalRemaining,
        paymentMethod: updated.paymentMethod,
        status: updated.status,
        notes: updated.notes,
        agencyName: updated.agencyName,
        agentName: updated.agentName,
        createdByAgent: updated.createdByAgent,
        isValidated: updated.isValidated,
        validatedBy: updated.validatedBy || null,
        validatedAt: updated.validatedAt ? new Date(updated.validatedAt) : null,
        validationNotes: updated.validationNotes,
        bonReelPhoto: updated.bonReelPhoto,
        casePhotos: updated.casePhotos,
        isExternalTransport: updated.isExternalTransport,
        externalCarrierName: updated.externalCarrierName,
        externalCarrierPhone: updated.externalCarrierPhone,
        externalCarrierVoucherRef: updated.externalCarrierVoucherRef,
        externalCost: updated.externalCost,
        externalPaymentStatus: updated.externalPaymentStatus,
        externalNotes: updated.externalNotes,
      }).where(eq(vouchersTable.id, existing.id));
    } catch (error) {
      // Memory store handles it
    }
  }

  return updated;
}

export async function validateVoucher(
  idOrTracking: string, 
  validation: { isValidated: boolean; validatedBy: string; validationNotes?: string }
): Promise<Voucher> {
  const existing = await getVoucherByIdOrTracking(idOrTracking);
  if (!existing) throw new Error('Bon non trouvé');

  const updated: Voucher = {
    ...existing,
    isValidated: validation.isValidated,
    validatedBy: validation.validatedBy,
    validatedAt: validation.isValidated ? new Date().toISOString() : undefined,
    validationNotes: validation.validationNotes || '',
    updatedAt: new Date().toISOString()
  };

  memoryVouchers = memoryVouchers.map(v => v.id === existing.id ? updated : v);

  if (db && isDatabaseConfigured()) {
    try {
      await db.update(vouchersTable).set({
        isValidated: validation.isValidated,
        validatedBy: validation.validatedBy,
        validatedAt: validation.isValidated ? new Date() : null,
        validationNotes: validation.validationNotes || '',
        updatedAt: new Date(),
      }).where(eq(vouchersTable.id, existing.id));
    } catch (error) {
      // Memory fallback
    }
  }

  return updated;
}

export async function deleteVoucher(idOrTracking: string): Promise<boolean> {
  const existing = await getVoucherByIdOrTracking(idOrTracking);
  
  memoryVouchers = memoryVouchers.filter(v => v.id !== idOrTracking && v.trackingNumber !== idOrTracking && (existing ? v.id !== existing.id && v.trackingNumber !== existing.trackingNumber : true));

  if (db && isDatabaseConfigured()) {
    try {
      if (existing) {
        await db.delete(vouchersTable).where(
          or(eq(vouchersTable.id, existing.id), eq(vouchersTable.trackingNumber, existing.trackingNumber))
        );
      } else {
        await db.delete(vouchersTable).where(
          or(eq(vouchersTable.id, idOrTracking), eq(vouchersTable.trackingNumber, idOrTracking))
        );
      }
    } catch (error) {
      console.warn('DB delete error:', error);
    }
  }
  return true;
}

export async function batchValidateVouchers(ids: string[], validatedBy: string): Promise<number> {
  if (!ids.length) return 0;
  const now = new Date().toISOString();
  memoryVouchers = memoryVouchers.map(v => {
    if (ids.includes(v.id) || ids.includes(v.trackingNumber)) {
      return {
        ...v,
        isValidated: true,
        validatedBy: validatedBy || 'Amine',
        validatedAt: now,
        validationNotes: 'Validation groupée rapide',
        updatedAt: now
      };
    }
    return v;
  });

  if (db && isDatabaseConfigured()) {
    try {
      await db.update(vouchersTable)
        .set({
          isValidated: true,
          validatedBy: validatedBy || 'Amine',
          validatedAt: new Date(),
          validationNotes: 'Validation groupée rapide',
          updatedAt: new Date()
        })
        .where(or(inArray(vouchersTable.id, ids), inArray(vouchersTable.trackingNumber, ids)));
    } catch (error) {
      // Memory fallback
    }
  }
  return ids.length;
}

export async function batchUpdateStatus(ids: string[], status: string): Promise<number> {
  if (!ids.length) return 0;
  const now = new Date().toISOString();
  memoryVouchers = memoryVouchers.map(v => {
    if (ids.includes(v.id) || ids.includes(v.trackingNumber)) {
      return { ...v, status: status as any, updatedAt: now };
    }
    return v;
  });

  if (db && isDatabaseConfigured()) {
    try {
      await db.update(vouchersTable)
        .set({ status, updatedAt: new Date() })
        .where(or(inArray(vouchersTable.id, ids), inArray(vouchersTable.trackingNumber, ids)));
    } catch (error) {
      // Memory fallback
    }
  }
  return ids.length;
}

export async function batchDelete(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  memoryVouchers = memoryVouchers.filter(v => !ids.includes(v.id) && !ids.includes(v.trackingNumber));

  if (db && isDatabaseConfigured()) {
    try {
      await db.delete(vouchersTable)
        .where(or(inArray(vouchersTable.id, ids), inArray(vouchersTable.trackingNumber, ids)));
    } catch (error) {
      // Memory fallback
    }
  }
  return ids.length;
}

export async function getStats(): Promise<VoucherStats> {
  const vouchers = await getVouchers();
  const today = new Date().toISOString().split('T')[0];

  return {
    totalVouchers: vouchers.length,
    totalRevenue: vouchers.reduce((acc, v) => acc + (Number(v.totalPrice) || 0), 0),
    totalWeightKg: vouchers.reduce((acc, v) => acc + (Number(v.totalWeightKg) || 0), 0),
    totalColis: vouchers.reduce((acc, v) => acc + (Number(v.totalColis) || 0), 0),
    pendingCount: vouchers.filter(v => v.status === 'EN_ATTENTE').length,
    inTransitCount: vouchers.filter(v => v.status === 'EN_TRANSIT').length,
    arrivedCount: vouchers.filter(v => v.status === 'ARRIVE_AGENCE').length,
    deliveredCount: vouchers.filter(v => v.status === 'LIVRE').length,
    cancelledCount: vouchers.filter(v => v.status === 'ANNULE').length,
    todayCount: vouchers.filter(v => v.date === today).length,
    todayRevenue: vouchers.filter(v => v.date === today).reduce((acc, v) => acc + (Number(v.totalPrice) || 0), 0)
  };
}

export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    await ensureDatabaseColumns();
  } catch (error) {
    // Silent
  }
}

export async function getDatabaseExplorerData() {
  const vouchers = await getVouchers();
  const settings = await getSettings();
  const configured = isDatabaseConfigured();
  const connString = getConnectionString();

  return {
    connected: configured,
    databaseType: configured ? 'PostgreSQL (Supabase Cloud Database)' : 'Stockage Local Sécurisé (En attente de connexion Supabase)',
    region: 'Prêt pour nouvelle instance',
    projectId: configured ? 'Instance Connectée' : 'Non Connecté',
    instanceName: configured ? 'supabase-postgres' : 'Stockage Local / Mémoire',
    timestamp: new Date().toISOString(),
    tables: [
      {
        name: 'vouchers',
        displayName: 'Bons de bagages & messagerie (vouchers)',
        rowCount: vouchers.length,
        columns: [
          'id', 'tracking_number', 'sequence_number', 'date', 'time',
          'sender_name', 'sender_cin', 'sender_phone', 'sender_address',
          'recipient_name', 'recipient_destination', 'recipient_phone', 'recipient_address',
          'departure_city', 'destination_city', 'items', 'total_colis', 'total_weight_kg',
          'total_price', 'payment_status', 'advance_amount', 'remaining_amount',
          'payment_method', 'status', 'notes', 'agent_name', 'agency_name',
          'is_external_transport', 'external_carrier_name', 'external_carrier_phone',
          'external_carrier_voucher_ref', 'external_cost', 'external_payment_status', 'external_notes',
          'bon_reel_photo', 'case_photos', 'created_at', 'updated_at'
        ],
        rows: vouchers
      },
      {
        name: 'settings',
        displayName: 'Configuration Entreprise & Numérotation (settings)',
        rowCount: 1,
        columns: [
          'id', 'company_name', 'tagline', 'phone1', 'phone2', 'email', 'address',
          'currency', 'tracking_code_digits', 'tracking_prefix', 'tracking_suffix',
          'next_tracking_number', 'allow_manual_tracking_number', 'default_departure_city',
          'default_agencies', 'default_nature_options', 'terms_and_conditions', 'updated_at'
        ],
        rows: [settings]
      }
    ]
  };
}
