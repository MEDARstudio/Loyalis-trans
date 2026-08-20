import { CompanySettings, Voucher, VoucherStats } from '../types';
import { supabaseApi } from './supabase';

const STORAGE_KEY_VOUCHERS = 'loyalis_trans_vouchers_v2';
const STORAGE_KEY_SETTINGS = 'loyalis_trans_settings_v2';

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

const DEFAULT_SAMPLE_VOUCHERS: Voucher[] = [
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
    agentName: 'Responsable Agence'
  }
];

function getLocalSettings(): CompanySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    // If nextTrackingNumber is old test 1..3, set to 502
    if (!parsed.nextTrackingNumber || parsed.nextTrackingNumber < 502) {
      parsed.nextTrackingNumber = 502;
    }
    parsed.termsAndConditions = DEFAULT_SETTINGS.termsAndConditions;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings: CompanySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function getLocalVouchers(): Voucher[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOUCHERS);
    if (!raw) {
      return [];
    }
    const parsed: Voucher[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purge obsolete test samples 1, 2, 3
    const filtered = parsed.filter(
      v =>
        v.id !== 'v-sample-1' &&
        v.id !== 'v-sample-2' &&
        v.id !== 'v-sample-3' &&
        v.trackingNumber !== '0000001' &&
        v.trackingNumber !== '0000002' &&
        v.trackingNumber !== '0000003'
    );
    return filtered;
  } catch {
    return [];
  }
}

function saveLocalVouchers(vouchers: Voucher[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(vouchers));
  } catch (e) {
    console.warn('LocalStorage vouchers save error:', e);
  }
}

function calculateLocalStats(vouchers: Voucher[]): VoucherStats {
  const total = vouchers.length;
  const todayStr = new Date().toISOString().substring(0, 10);
  let pendingCount = 0;
  let inTransitCount = 0;
  let arrivedCount = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let totalRevenue = 0;
  let totalWeightKg = 0;
  let totalColis = 0;
  let todayCount = 0;
  let todayRevenue = 0;

  for (const v of vouchers) {
    if (v.status === 'EN_ATTENTE') pendingCount++;
    else if (v.status === 'EN_TRANSIT') inTransitCount++;
    else if (v.status === 'ARRIVE_AGENCE') arrivedCount++;
    else if (v.status === 'LIVRE') deliveredCount++;
    else if (v.status === 'ANNULE') cancelledCount++;

    const price = Number(v.totalPrice) || 0;
    const weight = Number(v.totalWeightKg) || 0;
    const colis = Number(v.totalColis) || 0;

    totalRevenue += price;
    totalWeightKg += weight;
    totalColis += colis;

    if (v.date === todayStr || (v.createdAt && v.createdAt.startsWith(todayStr))) {
      todayCount++;
      todayRevenue += price;
    }
  }

  return {
    totalVouchers: total,
    totalRevenue,
    totalWeightKg: Math.round(totalWeightKg * 100) / 100,
    totalColis,
    pendingCount,
    inTransitCount,
    arrivedCount,
    deliveredCount,
    cancelledCount,
    todayCount,
    todayRevenue
  };
}

export const api = {
  // --- SETTINGS ---
  async getSettings(): Promise<CompanySettings> {
    // 1. Try Express API
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          saveLocalSettings(data);
          return data;
        }
      }
    } catch {
      // Backend not running (e.g. GitHub Pages)
    }

    // 2. Try Direct Supabase
    try {
      const supData = await supabaseApi.getSettings();
      if (supData) {
        saveLocalSettings(supData);
        return supData;
      }
    } catch (err) {
      console.warn('Supabase getSettings fallback error:', err);
    }

    // 3. Fallback to LocalStorage
    return getLocalSettings();
  },

  async updateSettings(settingsPatch: Partial<CompanySettings>): Promise<{ success: boolean; settings: CompanySettings }> {
    // 1. Try Express API
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPatch)
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalSettings(data.settings);
        // Also mirror to Supabase
        supabaseApi.updateSettings(data.settings).catch(() => {});
        return data;
      }
    } catch {
      // Backend not running
    }

    // 2. Try Direct Supabase
    try {
      await supabaseApi.updateSettings(settingsPatch);
    } catch (e) {
      console.warn('Supabase direct settings update failed:', e);
    }

    // 3. Update Local Storage
    const current = getLocalSettings();
    const updated = { ...current, ...settingsPatch };
    saveLocalSettings(updated);
    return { success: true, settings: updated };
  },

  // --- VOUCHERS LIST ---
  async getVouchers(params?: {
    q?: string;
    status?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Voucher[]> {
    // 1. Try Express API
    try {
      const query = new URLSearchParams();
      if (params?.q) query.append('q', params.q);
      if (params?.status && params.status !== 'ALL') query.append('status', params.status);
      if (params?.destination && params.destination !== 'ALL') query.append('destination', params.destination);
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);

      const res = await fetch(`/api/vouchers?${query.toString()}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          saveLocalVouchers(data);
          return data;
        }
      }
    } catch {
      // Backend not running (e.g. GitHub Pages)
    }

    // 2. Try Direct Supabase
    try {
      const supVouchers = await supabaseApi.getVouchers();
      if (supVouchers !== null) {
        saveLocalVouchers(supVouchers);
        let list = supVouchers;
        if (params?.status && params.status !== 'ALL') {
          list = list.filter(v => v.status === params.status);
        }
        if (params?.destination && params.destination !== 'ALL') {
          list = list.filter(v => v.destinationCity === params.destination || v.recipient.destination === params.destination);
        }
        if (params?.startDate) {
          list = list.filter(v => v.date >= params.startDate!);
        }
        if (params?.endDate) {
          list = list.filter(v => v.date <= params.endDate!);
        }
        if (params?.q) {
          const q = params.q.toLowerCase();
          list = list.filter(v =>
            v.trackingNumber.toLowerCase().includes(q) ||
            v.sender.name.toLowerCase().includes(q) ||
            v.recipient.name.toLowerCase().includes(q) ||
            v.sender.phone.includes(q) ||
            v.recipient.phone.includes(q)
          );
        }
        return list;
      }
    } catch (err) {
      console.warn('Supabase getVouchers fallback error:', err);
    }

    // 3. Fallback to LocalStorage
    let vouchers = getLocalVouchers();
    if (params?.status && params.status !== 'ALL') {
      vouchers = vouchers.filter(v => v.status === params.status);
    }
    if (params?.destination && params.destination !== 'ALL') {
      vouchers = vouchers.filter(v => v.destinationCity === params.destination || v.recipient.destination === params.destination);
    }
    if (params?.startDate) {
      vouchers = vouchers.filter(v => v.date >= params.startDate!);
    }
    if (params?.endDate) {
      vouchers = vouchers.filter(v => v.date <= params.endDate!);
    }
    if (params?.q) {
      const q = params.q.toLowerCase();
      vouchers = vouchers.filter(v =>
        v.trackingNumber.toLowerCase().includes(q) ||
        v.sender.name.toLowerCase().includes(q) ||
        v.recipient.name.toLowerCase().includes(q) ||
        v.sender.phone.includes(q) ||
        v.recipient.phone.includes(q)
      );
    }
    return vouchers;
  },

  async getVoucherById(id: string): Promise<Voucher> {
    // 1. Try Express API
    try {
      const res = await fetch(`/api/vouchers/${encodeURIComponent(id)}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return res.json();
        }
      }
    } catch {
      // Backend not running
    }

    // 2. Try local cache
    const vouchers = getLocalVouchers();
    const found = vouchers.find(v => v.id === id || v.trackingNumber === id);
    if (found) return found;

    // 3. Try direct Supabase
    const all = await supabaseApi.getVouchers();
    const match = all?.find(v => v.id === id || v.trackingNumber === id);
    if (match) return match;

    throw new Error('Bon introuvable');
  },

  // --- CREATE VOUCHER ---
  async createVoucher(payload: Partial<Voucher>): Promise<{ success: boolean; voucher: Voucher; nextTrackingNumber: number }> {
    // 1. Try Express API
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        const local = getLocalVouchers();
        saveLocalVouchers([data.voucher, ...local.filter(v => v.id !== data.voucher.id)]);
        // Mirror directly to Supabase as well
        supabaseApi.insertOrUpdateVoucher(data.voucher).catch(() => {});
        return data;
      }
    } catch {
      // Backend not running (e.g. GitHub Pages)
    }

    // 2. Construct local object and save directly to Supabase
    const settings = getLocalSettings();
    const vouchers = getLocalVouchers();
    const seq = payload.sequenceNumber || settings.nextTrackingNumber || (vouchers.length + 1);
    const tracking = payload.trackingNumber || String(seq).padStart(settings.trackingCodeDigits || 7, '0');

    const newVoucher: Voucher = {
      id: payload.id || `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trackingNumber: tracking,
      sequenceNumber: seq,
      date: payload.date || new Date().toISOString().substring(0, 10),
      time: payload.time || new Date().toTimeString().substring(0, 5),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: payload.sender || { name: '', cin: '', phone: '', address: '' },
      recipient: payload.recipient || { name: '', destination: '', phone: '', address: '' },
      departureCity: payload.departureCity || settings.defaultDepartureCity || 'Casablanca',
      destinationCity: payload.destinationCity || payload.recipient?.destination || '',
      items: payload.items || [],
      totalColis: payload.totalColis || 1,
      totalWeightKg: payload.totalWeightKg || 0,
      totalPrice: payload.totalPrice || 0,
      paymentStatus: payload.paymentStatus || 'NON_PAYE',
      advanceAmount: payload.advanceAmount || 0,
      remainingAmount: payload.remainingAmount || 0,
      paymentMethod: payload.paymentMethod || 'A_LA_LIVRAISON',
      status: payload.status || 'EN_ATTENTE',
      notes: payload.notes || '',
      agencyName: payload.agencyName || settings.address,
      agentName: payload.agentName || 'Agent Loyalis Trans',
      createdByAgent: payload.createdByAgent || '',
      isValidated: payload.isValidated !== undefined 
        ? (Boolean(payload.isValidated) || String(payload.createdByAgent || '').toLowerCase().includes('amine'))
        : String(payload.createdByAgent || '').toLowerCase().includes('amine'),
      validatedBy: payload.validatedBy || (String(payload.createdByAgent || '').toLowerCase().includes('amine') ? 'Amine' : undefined),
      validatedAt: payload.validatedAt || (String(payload.createdByAgent || '').toLowerCase().includes('amine') ? new Date().toISOString() : undefined),
      validationNotes: payload.validationNotes || (String(payload.createdByAgent || '').toLowerCase().includes('amine') ? 'Validé automatiquement (Créé par l\'administrateur)' : ''),
      bonReelPhoto: payload.bonReelPhoto || null,
      casePhotos: payload.casePhotos || [],
      isExternalTransport: payload.isExternalTransport || false,
      externalCarrierName: payload.externalCarrierName || '',
      externalCarrierPhone: payload.externalCarrierPhone || '',
      externalCarrierVoucherRef: payload.externalCarrierVoucherRef || '',
      externalCost: payload.externalCost || 0,
      externalPaymentStatus: payload.externalPaymentStatus || 'PAID',
      externalNotes: payload.externalNotes || ''
    };

    const nextSeq = seq + 1;
    saveLocalVouchers([newVoucher, ...vouchers]);
    saveLocalSettings({ ...settings, nextTrackingNumber: nextSeq });

    // Send directly to Supabase
    supabaseApi.insertOrUpdateVoucher(newVoucher).catch(err => {
      console.warn('Direct Supabase insert notice:', err);
    });

    return { success: true, voucher: newVoucher, nextTrackingNumber: nextSeq };
  },

  // --- UPDATE VOUCHER ---
  async updateVoucher(id: string, payload: Partial<Voucher>): Promise<{ success: boolean; voucher: Voucher }> {
    // 1. Try Express API
    try {
      const res = await fetch(`/api/vouchers/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        const vouchers = getLocalVouchers();
        saveLocalVouchers(vouchers.map(v => (v.id === id || v.trackingNumber === id ? data.voucher : v)));
        supabaseApi.insertOrUpdateVoucher(data.voucher).catch(() => {});
        return data;
      }
    } catch {
      // Backend not running
    }

    // 2. Direct Local & Supabase Update
    const vouchers = getLocalVouchers();
    const idx = vouchers.findIndex(v => v.id === id || v.trackingNumber === id);
    if (idx === -1) throw new Error('Bon non trouvé');

    const updated: Voucher = {
      ...vouchers[idx],
      ...payload,
      updatedAt: new Date().toISOString()
    };

    vouchers[idx] = updated;
    saveLocalVouchers([...vouchers]);

    // Send directly to Supabase
    supabaseApi.insertOrUpdateVoucher(updated).catch(() => {});

    return { success: true, voucher: updated };
  },

  // --- VALIDATE VOUCHER ---
  async validateVoucher(
    id: string,
    validationData: {
      agentName?: string;
      validatedBy?: string;
      isValidated?: boolean;
      bonReelPhoto?: any;
      casePhotos?: any[];
      validationNotes?: string;
    }
  ): Promise<{ success: boolean; voucher: Voucher }> {
    try {
      const res = await fetch(`/api/vouchers/${encodeURIComponent(id)}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData)
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        const vouchers = getLocalVouchers();
        saveLocalVouchers(vouchers.map(v => (v.id === id || v.trackingNumber === id ? data.voucher : v)));
        supabaseApi.insertOrUpdateVoucher(data.voucher).catch(() => {});
        return data;
      }
    } catch {
      // Backend not running
    }

    const vouchers = getLocalVouchers();
    const idx = vouchers.findIndex(v => v.id === id || v.trackingNumber === id);
    if (idx === -1) throw new Error('Bon introuvable pour validation');

    const updated: Voucher = {
      ...vouchers[idx],
      isValidated: validationData.isValidated !== undefined ? validationData.isValidated : true,
      validatedBy: validationData.validatedBy || validationData.agentName || 'Agent Loyalis',
      validatedAt: new Date().toISOString(),
      validationNotes: validationData.validationNotes || vouchers[idx].validationNotes,
      bonReelPhoto: validationData.bonReelPhoto !== undefined ? validationData.bonReelPhoto : vouchers[idx].bonReelPhoto,
      casePhotos: validationData.casePhotos !== undefined ? validationData.casePhotos : vouchers[idx].casePhotos,
      updatedAt: new Date().toISOString()
    };

    vouchers[idx] = updated;
    saveLocalVouchers([...vouchers]);

    // Send to Supabase
    supabaseApi.insertOrUpdateVoucher(updated).catch(() => {});

    return { success: true, voucher: updated };
  },

  // --- BATCH VALIDATE ---
  async batchValidate(ids: string[], agentName: string): Promise<{ success: boolean; count: number }> {
    try {
      const res = await fetch('/api/vouchers/batch/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, agentName })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        return data;
      }
    } catch {
      // Backend not running
    }

    const vouchers = getLocalVouchers();
    let count = 0;
    const nowIso = new Date().toISOString();

    const updated = vouchers.map(v => {
      if (ids.includes(v.id) || ids.includes(v.trackingNumber)) {
        count++;
        const val = {
          ...v,
          isValidated: true,
          validatedBy: agentName,
          validatedAt: nowIso,
          updatedAt: nowIso
        };
        supabaseApi.insertOrUpdateVoucher(val).catch(() => {});
        return val;
      }
      return v;
    });

    saveLocalVouchers(updated);
    return { success: true, count };
  },

  // --- DELETE VOUCHER ---
  async deleteVoucher(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`/api/vouchers/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const vouchers = getLocalVouchers();
        saveLocalVouchers(vouchers.filter(v => v.id !== id && v.trackingNumber !== id));
        supabaseApi.deleteVoucher(id).catch(() => {});
        return { success: true };
      }
    } catch {
      // Backend not running
    }

    const vouchers = getLocalVouchers();
    saveLocalVouchers(vouchers.filter(v => v.id !== id && v.trackingNumber !== id));
    supabaseApi.deleteVoucher(id).catch(() => {});
    return { success: true };
  },

  // --- BATCH UPDATE STATUS ---
  async batchUpdateStatus(ids: string[], status: string): Promise<{ success: boolean; count: number }> {
    try {
      const res = await fetch('/api/vouchers/batch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
    } catch {
      // Backend not running
    }

    const vouchers = getLocalVouchers();
    let count = 0;
    const updated = vouchers.map(v => {
      if (ids.includes(v.id) || ids.includes(v.trackingNumber)) {
        count++;
        const item = { ...v, status: status as any, updatedAt: new Date().toISOString() };
        supabaseApi.insertOrUpdateVoucher(item).catch(() => {});
        return item;
      }
      return v;
    });

    saveLocalVouchers(updated);
    return { success: true, count };
  },

  // --- BATCH DELETE ---
  async batchDelete(ids: string[]): Promise<{ success: boolean; count: number }> {
    try {
      const res = await fetch('/api/vouchers/batch/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
    } catch {
      // Backend not running
    }

    const vouchers = getLocalVouchers();
    const filtered = vouchers.filter(v => !ids.includes(v.id) && !ids.includes(v.trackingNumber));
    const count = vouchers.length - filtered.length;
    saveLocalVouchers(filtered);
    supabaseApi.batchDelete(ids).catch(() => {});
    return { success: true, count };
  },

  // --- STATS ---
  async getStats(): Promise<VoucherStats> {
    try {
      const res = await fetch('/api/stats');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
    } catch {
      // Backend not running
    }

    const vouchers = getLocalVouchers();
    return calculateLocalStats(vouchers);
  },

  // --- DATABASE EXPLORER & SQL RUNNER ---
  async getDatabaseExplorer(): Promise<any> {
    try {
      const res = await fetch('/api/database/explorer');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
    } catch {
      // Backend not running
    }

    // Direct Supabase Tables representation
    const vouchers = getLocalVouchers();
    const settings = getLocalSettings();

    return {
      status: 'ok',
      database: 'Supabase PostgreSQL Cloud',
      tables: [
        {
          name: 'vouchers',
          count: vouchers.length,
          columns: ['id', 'tracking_number', 'sequence_number', 'date', 'sender_name', 'recipient_name', 'departure_city', 'destination_city', 'total_colis', 'total_weight_kg', 'total_price', 'payment_status', 'status', 'bon_reel_photo', 'case_photos'],
          rows: vouchers
        },
        {
          name: 'settings',
          count: 1,
          columns: ['id', 'company_name', 'phone1', 'phone2', 'email', 'address', 'currency', 'terms_and_conditions'],
          rows: [settings]
        }
      ]
    };
  },

  async resetDemo(): Promise<void> {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch {
      // ignore
    }
    saveLocalVouchers(DEFAULT_SAMPLE_VOUCHERS);
    saveLocalSettings(DEFAULT_SETTINGS);
  },

  async executeSqlQuery(sql: string): Promise<any> {
    try {
      const res = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
    } catch {
      // Fallback to client-side SQL simulator
    }

    // Local client-side SQL simulator for vouchers / settings
    const vouchers = getLocalVouchers();
    const settings = getLocalSettings();
    const cleanSql = sql.trim().toLowerCase();

    if (cleanSql.includes('from settings')) {
      return {
        columns: ['id', 'company_name', 'phone1', 'phone2', 'email', 'address', 'currency'],
        rows: [[settings.companyName, settings.phone1, settings.phone2, settings.email, settings.address, settings.currency]],
        rowCount: 1
      };
    }

    // Vouchers query simulator
    const sampleRows = vouchers.map(v => [
      v.trackingNumber,
      v.date,
      v.sender.name,
      v.recipient.name,
      v.departureCity || 'Casablanca',
      v.destinationCity || v.recipient.destination,
      v.totalColis || 1,
      v.totalWeightKg || 0,
      v.totalPrice,
      v.paymentStatus,
      v.status
    ]);

    return {
      columns: ['tracking_number', 'date', 'sender_name', 'recipient_name', 'departure_city', 'destination_city', 'total_colis', 'total_weight_kg', 'total_price', 'payment_status', 'status'],
      rows: sampleRows,
      rowCount: sampleRows.length
    };
  }
};
