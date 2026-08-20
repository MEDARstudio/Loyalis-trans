import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CompanySettings, Voucher } from '../types';

// Default Supabase project credentials provided by user
const DEFAULT_SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL) || 'https://olahhcegkeqromqdfwnj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sYWhoY2Vna2Vxcm9tcWRmd25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzA0OTIsImV4cCI6MjEwMjgwNjQ5Mn0.1T-6Yj5BJS7O3gfrLV0Z5c_9EM6Da00WJc31iCY4K9s';

const SUPABASE_CONFIG_STORAGE_KEY = 'loyalis_trans_supabase_config_v2';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getDatabaseProjectName(url?: string): string {
  const targetUrl = url || getStoredSupabaseConfig().url;
  if (!targetUrl || targetUrl.trim() === '') return 'Non configurée';
  try {
    const parsed = new URL(targetUrl.trim());
    const host = parsed.hostname;
    const projectRef = host.split('.')[0];
    return projectRef || host;
  } catch {
    return targetUrl.replace(/^https?:\/\//, '').split('.')[0] || 'Base Supabase';
  }
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') {
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || DEFAULT_SUPABASE_URL,
        anonKey: parsed.anonKey || DEFAULT_SUPABASE_ANON_KEY
      };
    }
  } catch {
    // ignore
  }
  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    _cachedClient = null; // force re-create
  } catch (e) {
    console.warn('Failed to save supabase config:', e);
  }
}

export function clearStoredSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
    localStorage.removeItem('loyalis_trans_supabase_config_v1');
    _cachedClient = null;
  } catch (e) {
    console.warn('Failed to clear supabase config:', e);
  }
}

let _cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey || config.url.trim() === '' || config.anonKey.trim() === '') {
    return null;
  }

  if (!_cachedClient) {
    try {
      _cachedClient = createClient(config.url.trim(), config.anonKey.trim(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    } catch (err) {
      console.warn('[Supabase] Client init warning:', err);
      return null;
    }
  }
  return _cachedClient;
}

// Check connection to Supabase
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; tableExists?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Aucune base Supabase configurée. Veuillez renseigner l\'URL et la Clé API.' };
  }

  try {
    const { data, error } = await client.from('vouchers').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation "vouchers" does not exist') || error.message?.includes('does not exist')) {
        return { 
          ok: true, 
          tableExists: false, 
          message: 'Connecté avec succès à Supabase ! Veuillez exécuter le script SQL dans le SQL Editor pour créer la table "vouchers".' 
        };
      }
      return { ok: false, message: `Erreur Supabase: ${error.message} (${error.code || ''})` };
    }
    return { ok: true, tableExists: true, message: 'Connexion Supabase active et tables opérationnelles !' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Impossible de joindre le serveur Supabase' };
  }
}

// SQL Script to create tables in Supabase SQL Editor
export const SUPABASE_SQL_CREATION_SCRIPT = `-- ==========================================================
-- SCRIPT SQL D'INITIALISATION DE LA BASE LOYALIS TRANS SUR SUPABASE
-- À exécuter dans : Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==========================================================

-- 1. Table des Paramètres de l'Entreprise (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
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
    allow_manual_tracking_number BOOLEAN DEFAULT true,
    default_departure_city TEXT DEFAULT 'Casablanca',
    default_agencies JSONB DEFAULT '["Casablanca", "Tanger", "Marrakech", "Agadir", "Rabat", "Fès", "Oujda", "Nador", "Paris", "Bruxelles", "Madrid", "Lyon", "Bordeaux"]'::jsonb,
    default_nature_options JSONB DEFAULT '["Valise", "Carton standard", "Sac de voyage", "Effets personnels", "Électroménager", "Matériel informatique", "Textile / Vêtements", "Colis alimentaire scellé", "Documents"]'::jsonb,
    terms_and_conditions TEXT DEFAULT '1. Les bagages doivent être fermés et étiquetés avec le numéro de bon.\n2. La société Loyalis Trans décline toute responsabilité pour les objets précieux non déclarés.\n3. Tout colis non réclamé après 30 jours fera l''objet de frais de gardiennage.\n4. La présentation du bon original ou du code QR est obligatoire lors du retrait.',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les paramètres par défaut si la table est vide
INSERT INTO public.settings (id, company_name, tagline, phone1, phone2, email, address, currency)
VALUES (1, 'Loyalis Trans', 'Transport & Messagerie Express de Bagages & Marchandises', '+212 6 61 00 00 00', '+33 6 00 00 00 00', 'contact@loyalistrans.com', 'Agence Principale - Gare Routière / Transit International', 'DH')
ON CONFLICT (id) DO NOTHING;

-- 2. Table des Bons de Bagages & Colis (Vouchers)
CREATE TABLE IF NOT EXISTS public.vouchers (
    id TEXT PRIMARY KEY,
    tracking_number TEXT NOT NULL UNIQUE,
    sequence_number INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Expéditeur
    sender_name TEXT NOT NULL,
    sender_cin TEXT,
    sender_phone TEXT NOT NULL,
    sender_address TEXT,
    
    -- Destinataire
    recipient_name TEXT NOT NULL,
    recipient_destination TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_address TEXT,
    
    -- Villes
    departure_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    
    -- Articles & Colis (JSONB)
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Métriques
    total_colis INTEGER NOT NULL DEFAULT 1,
    total_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Paiements & Règlements
    payment_status TEXT NOT NULL DEFAULT 'PAYE',
    advance_amount DOUBLE PRECISION DEFAULT 0,
    remaining_amount DOUBLE PRECISION DEFAULT 0,
    payment_method TEXT DEFAULT 'PAYE',
    
    -- Statut Logistique
    status TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    notes TEXT,
    agent_name TEXT,
    agency_name TEXT,
    
    -- Validation & Audit
    created_by_agent TEXT,
    is_validated BOOLEAN DEFAULT false,
    validated_by TEXT,
    validated_at TIMESTAMP WITH TIME ZONE,
    validation_notes TEXT,
    
    -- Photos & Documents (JSONB)
    bon_reel_photo JSONB,
    case_photos JSONB DEFAULT '[]'::jsonb,
    
    -- Sous-traitance
    is_external_transport BOOLEAN DEFAULT false,
    external_carrier_name TEXT,
    external_carrier_phone TEXT,
    external_carrier_voucher_ref TEXT,
    external_cost DOUBLE PRECISION DEFAULT 0,
    external_payment_status TEXT DEFAULT 'PAID',
    external_notes TEXT
);

-- 3. Table des Utilisateurs & Agents (Users)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'AGENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Activer Row Level Security (RLS) et permettre la lecture / écriture
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access settings" ON public.settings;
CREATE POLICY "Public full access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vouchers" ON public.vouchers;
CREATE POLICY "Public full access vouchers" ON public.vouchers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access users" ON public.users;
CREATE POLICY "Public full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Index pour recherche ultra-rapide
CREATE INDEX IF NOT EXISTS idx_vouchers_tracking ON public.vouchers(tracking_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON public.vouchers(date);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON public.vouchers(status);
`;

// Direct Supabase Data Operations for Frontend
export const supabaseApi = {
  async getSettings(): Promise<CompanySettings | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client.from('settings').select('*').limit(1).single();
      if (error || !data) return null;
      return {
        companyName: data.company_name,
        tagline: data.tagline,
        phone1: data.phone1,
        phone2: data.phone2,
        email: data.email,
        address: data.address,
        currency: data.currency || 'DH',
        trackingCodeDigits: data.tracking_code_digits || 7,
        trackingPrefix: data.tracking_prefix || '',
        trackingSuffix: data.tracking_suffix || '',
        nextTrackingNumber: data.next_tracking_number || 1,
        allowManualTrackingNumber: data.allow_manual_tracking_number ?? true,
        defaultDepartureCity: data.default_departure_city || 'Casablanca',
        defaultAgencies: data.default_agencies || [],
        defaultNatureOptions: data.default_nature_options || [],
        termsAndConditions: data.terms_and_conditions || ''
      };
    } catch {
      return null;
    }
  },

  async updateSettings(settings: Partial<CompanySettings>): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row: any = {
        updated_at: new Date().toISOString()
      };
      if (settings.companyName !== undefined) row.company_name = settings.companyName;
      if (settings.tagline !== undefined) row.tagline = settings.tagline;
      if (settings.phone1 !== undefined) row.phone1 = settings.phone1;
      if (settings.phone2 !== undefined) row.phone2 = settings.phone2;
      if (settings.email !== undefined) row.email = settings.email;
      if (settings.address !== undefined) row.address = settings.address;
      if (settings.currency !== undefined) row.currency = settings.currency;
      if (settings.trackingCodeDigits !== undefined) row.tracking_code_digits = settings.trackingCodeDigits;
      if (settings.trackingPrefix !== undefined) row.tracking_prefix = settings.trackingPrefix;
      if (settings.trackingSuffix !== undefined) row.tracking_suffix = settings.trackingSuffix;
      if (settings.nextTrackingNumber !== undefined) row.next_tracking_number = settings.nextTrackingNumber;
      if (settings.allowManualTrackingNumber !== undefined) row.allow_manual_tracking_number = settings.allowManualTrackingNumber;
      if (settings.defaultDepartureCity !== undefined) row.default_departure_city = settings.defaultDepartureCity;
      if (settings.defaultAgencies !== undefined) row.default_agencies = settings.defaultAgencies;
      if (settings.defaultNatureOptions !== undefined) row.default_nature_options = settings.defaultNatureOptions;
      if (settings.termsAndConditions !== undefined) row.terms_and_conditions = settings.termsAndConditions;

      const { error } = await client.from('settings').upsert({ id: 1, ...row });
      return !error;
    } catch {
      return false;
    }
  },

  async getVouchers(): Promise<Voucher[] | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] getVouchers error:', error);
        return null;
      }
      if (!data) return [];

      return data.map(row => ({
        id: row.id,
        trackingNumber: row.tracking_number,
        sequenceNumber: row.sequence_number,
        date: row.date,
        time: row.time || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sender: {
          name: row.sender_name,
          cin: row.sender_cin || '',
          phone: row.sender_phone,
          address: row.sender_address || ''
        },
        recipient: {
          name: row.recipient_name,
          destination: row.recipient_destination,
          phone: row.recipient_phone,
          address: row.recipient_address || ''
        },
        departureCity: row.departure_city,
        destinationCity: row.destination_city,
        items: row.items || [],
        totalColis: row.total_colis,
        totalWeightKg: row.total_weight_kg,
        totalPrice: row.total_price,
        paymentStatus: row.payment_status,
        advanceAmount: row.advance_amount || 0,
        remainingAmount: row.remaining_amount || 0,
        paymentMethod: row.payment_method,
        status: row.status,
        notes: row.notes,
        agentName: row.agent_name,
        agencyName: row.agency_name,
        createdByAgent: row.created_by_agent,
        isValidated: row.is_validated,
        validatedBy: row.validated_by,
        validatedAt: row.validated_at,
        validationNotes: row.validation_notes,
        bonReelPhoto: row.bon_reel_photo || null,
        casePhotos: row.case_photos || [],
        isExternalTransport: row.is_external_transport,
        externalCarrierName: row.external_carrier_name,
        externalCarrierPhone: row.external_carrier_phone,
        externalCarrierVoucherRef: row.external_carrier_voucher_ref,
        externalCost: row.external_cost,
        externalPaymentStatus: row.external_payment_status,
        externalNotes: row.external_notes
      }));
    } catch {
      return null;
    }
  },

  async insertOrUpdateVoucher(v: Voucher): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const row = {
        id: v.id,
        tracking_number: v.trackingNumber,
        sequence_number: v.sequenceNumber,
        date: v.date,
        time: v.time || '',
        created_at: v.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: v.sender?.name || '',
        sender_cin: v.sender?.cin || '',
        sender_phone: v.sender?.phone || '',
        sender_address: v.sender?.address || '',
        recipient_name: v.recipient?.name || '',
        recipient_destination: v.recipient?.destination || '',
        recipient_phone: v.recipient?.phone || '',
        recipient_address: v.recipient?.address || '',
        departure_city: v.departureCity || '',
        destination_city: v.destinationCity || '',
        items: v.items || [],
        total_colis: v.totalColis || 1,
        total_weight_kg: v.totalWeightKg || 0,
        total_price: v.totalPrice || 0,
        payment_status: v.paymentStatus || 'PAYE',
        advance_amount: v.advanceAmount || 0,
        remaining_amount: v.remainingAmount || 0,
        payment_method: v.paymentMethod || 'PAYE',
        status: v.status || 'EN_ATTENTE',
        notes: v.notes || '',
        agent_name: v.agentName || '',
        agency_name: v.agencyName || '',
        created_by_agent: v.createdByAgent || '',
        is_validated: v.isValidated || false,
        validated_by: v.validatedBy || null,
        validated_at: v.validatedAt || null,
        validation_notes: v.validationNotes || '',
        bon_reel_photo: v.bonReelPhoto || null,
        case_photos: v.casePhotos || [],
        is_external_transport: v.isExternalTransport || false,
        external_carrier_name: v.externalCarrierName || '',
        external_carrier_phone: v.externalCarrierPhone || '',
        external_carrier_voucher_ref: v.externalCarrierVoucherRef || '',
        external_cost: v.externalCost || 0,
        external_payment_status: v.externalPaymentStatus || 'PAID',
        external_notes: v.externalNotes || ''
      };

      const { error } = await client.from('vouchers').upsert(row);
      if (error) {
        console.warn('[Supabase] Insert/Upsert error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] Direct write failed:', err);
      return false;
    }
  },

  async deleteVoucher(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('vouchers').delete().or(`id.eq.${id},tracking_number.eq.${id}`);
      if (error) {
        console.warn('[Supabase] deleteVoucher error:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async batchDelete(ids: string[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || ids.length === 0) return false;
    try {
      const { error } = await client.from('vouchers').delete().in('id', ids);
      if (error) {
        console.warn('[Supabase] batchDelete error:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async syncAllLocalVouchersToSupabase(vouchers: Voucher[]): Promise<{ count: number; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { count: 0, error: 'Client Supabase non configuré' };

    try {
      let successCount = 0;
      for (const v of vouchers) {
        const ok = await this.insertOrUpdateVoucher(v);
        if (ok) successCount++;
      }
      return { count: successCount };
    } catch (err: any) {
      return { count: 0, error: err?.message || 'Erreur lors de la synchronisation vers Supabase' };
    }
  }
};
