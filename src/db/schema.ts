import { pgTable, text, serial, integer, doublePrecision, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { LuggageItem, VoucherPhoto } from '../types.ts';

// Users table (Firebase Auth linkage)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('AGENT'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Company Settings table (Single record)
export const settingsTable = pgTable('settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull().default('Loyalis Trans'),
  tagline: text('tagline').default('Transport & Messagerie Express de Bagages & Marchandises'),
  phone1: text('phone1').default('+212 6 61 00 00 00'),
  phone2: text('phone2').default('+33 6 00 00 00 00'),
  email: text('email').default('contact@loyalistrans.com'),
  address: text('address').default('Agence Principale - Gare Routière / Transit International'),
  currency: text('currency').default('DH'),
  trackingCodeDigits: integer('tracking_code_digits').default(7),
  trackingPrefix: text('tracking_prefix').default(''),
  trackingSuffix: text('tracking_suffix').default(''),
  nextTrackingNumber: integer('next_tracking_number').default(1),
  allowManualTrackingNumber: boolean('allow_manual_tracking_number').default(true),
  defaultDepartureCity: text('default_departure_city').default('Casablanca'),
  defaultAgencies: jsonb('default_agencies').$type<string[]>().default([
    'Casablanca', 'Tanger', 'Marrakech', 'Agadir', 'Rabat', 'Fès', 'Oujda', 'Nador', 'Paris', 'Bruxelles', 'Madrid', 'Lyon', 'Bordeaux'
  ]),
  defaultNatureOptions: jsonb('default_nature_options').$type<string[]>().default([
    'Valise', 'Carton standard', 'Sac de voyage', 'Effets personnels', 'Électroménager', 'Matériel informatique', 'Textile / Vêtements', 'Colis alimentaire scellé', 'Documents'
  ]),
  termsAndConditions: text('terms_and_conditions').default(
    '1. Les bagages doivent être fermés et étiquetés avec le numéro de bon.\n2. La société Loyalis Trans décline toute responsabilité pour les objets précieux non déclarés.\n3. Tout colis non réclamé après 30 jours fera l\'objet de frais de gardiennage.\n4. La présentation du bon original ou du code QR est obligatoire lors du retrait.'
  ),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Vouchers (Bons de bagages & colis) table
export const vouchersTable = pgTable('vouchers', {
  id: text('id').primaryKey(), // e.g. "v-1700000000-xyz"
  trackingNumber: text('tracking_number').notNull().unique(),
  sequenceNumber: integer('sequence_number').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Sender details
  senderName: text('sender_name').notNull(),
  senderCin: text('sender_cin'),
  senderPhone: text('sender_phone').notNull(),
  senderAddress: text('sender_address'),

  // Recipient details
  recipientName: text('recipient_name').notNull(),
  recipientDestination: text('recipient_destination').notNull(),
  recipientPhone: text('recipient_phone').notNull(),
  recipientAddress: text('recipient_address'),

  // Trip routing
  departureCity: text('departure_city').notNull(),
  destinationCity: text('destination_city').notNull(),

  // Items (JSON array of LuggageItem)
  items: jsonb('items').$type<LuggageItem[]>().notNull(),

  // Metrics
  totalColis: integer('total_colis').notNull(),
  totalWeightKg: doublePrecision('total_weight_kg').notNull(),
  totalPrice: doublePrecision('total_price').notNull(),

  // Financial & Settlement
  paymentStatus: text('payment_status').notNull().default('PAYE'), // 'NON_PAYE' | 'PAYE' | 'AVANCE'
  advanceAmount: doublePrecision('advance_amount').default(0),
  remainingAmount: doublePrecision('remaining_amount').default(0),
  paymentMethod: text('payment_method').default('PAYE'),

  // Logistics status & info
  status: text('status').notNull().default('EN_ATTENTE'), // 'EN_ATTENTE' | 'EN_TRANSIT' | 'ARRIVE_AGENCE' | 'LIVRE' | 'ANNULE'
  notes: text('notes'),
  agentName: text('agent_name'),
  agencyName: text('agency_name'),

  // Agent & Validation Audit
  createdByAgent: text('created_by_agent'),
  isValidated: boolean('is_validated').default(false),
  validatedBy: text('validated_by'),
  validatedAt: timestamp('validated_at'),
  validationNotes: text('validation_notes'),

  // Photos & Documents
  bonReelPhoto: jsonb('bon_reel_photo').$type<VoucherPhoto | null>(),
  casePhotos: jsonb('case_photos').$type<VoucherPhoto[]>().default([]),

  // Sous-traitance & Transporteur Externe
  isExternalTransport: boolean('is_external_transport').default(false),
  externalCarrierName: text('external_carrier_name'),
  externalCarrierPhone: text('external_carrier_phone'),
  externalCarrierVoucherRef: text('external_carrier_voucher_ref'),
  externalCost: doublePrecision('external_cost').default(0),
  externalPaymentStatus: text('external_payment_status').default('PAID'), // 'PAID' | 'UNPAID'
  externalNotes: text('external_notes'),
});
