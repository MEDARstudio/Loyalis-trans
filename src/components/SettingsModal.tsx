import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Hash, 
  Building, 
  Phone, 
  MapPin, 
  Save, 
  Coins, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Plus, 
  Trash2,
  FileText,
  Database,
  Cloud,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { CompanySettings } from '../types';
import { formatTrackingNumber } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  SUPABASE_SQL_CREATION_SCRIPT,
  supabaseApi
} from '../services/supabase';
import { api } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  onSaveSettings: (newSettings: CompanySettings) => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetDemo
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [activeTab, setActiveTab] = useState<'numbering' | 'company' | 'agencies' | 'terms' | 'supabase'>('numbering');
  const [newAgencyInput, setNewAgencyInput] = useState<string>('');
  const [newNatureInput, setNewNatureInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Supabase connection state
  const [supabaseConfig, setSupabaseConfig] = useState(getStoredSupabaseConfig());
  const [supabaseStatus, setSupabaseStatus] = useState<{ testing: boolean; ok?: boolean; message?: string }>({ testing: false });
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [syncingAllToSupabase, setSyncingAllToSupabase] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const prevIsOpenRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFormData(settings);
      setSavedSuccess(false);
      setSupabaseConfig(getStoredSupabaseConfig());
      checkSupabase();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const checkSupabase = async () => {
    setSupabaseStatus({ testing: true });
    const res = await testSupabaseConnection();
    setSupabaseStatus({ testing: false, ok: res.ok, message: res.message });
  };

  const handleSyncAllVouchers = async () => {
    setSyncingAllToSupabase(true);
    setSyncResult(null);
    try {
      const allVouchers = await api.getVouchers();
      const res = await supabaseApi.syncAllLocalVouchersToSupabase(allVouchers);
      if (res.error) {
        setSyncResult(`Erreur: ${res.error}`);
      } else {
        setSyncResult(`Succès ! ${res.count} bon(s) synchronisé(s) dans la table Supabase.`);
      }
    } catch (err: any) {
      setSyncResult(`Erreur: ${err?.message || 'Échec de synchronisation'}`);
    } finally {
      setSyncingAllToSupabase(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_CREATION_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (!isOpen) return null;

  // Live preview of next code
  const nextCodePreview = formatTrackingNumber(
    formData.nextTrackingNumber || 1,
    formData.trackingCodeDigits || 7,
    formData.trackingPrefix || '',
    formData.trackingSuffix || ''
  );

  const handleAddAgency = () => {
    if (!newAgencyInput.trim()) return;
    if (!formData.defaultAgencies.includes(newAgencyInput.trim())) {
      setFormData({
        ...formData,
        defaultAgencies: [...formData.defaultAgencies, newAgencyInput.trim()]
      });
    }
    setNewAgencyInput('');
  };

  const handleRemoveAgency = (agency: string) => {
    setFormData({
      ...formData,
      defaultAgencies: formData.defaultAgencies.filter(a => a !== agency)
    });
  };

  const handleAddNature = () => {
    if (!newNatureInput.trim()) return;
    if (!formData.defaultNatureOptions.includes(newNatureInput.trim())) {
      setFormData({
        ...formData,
        defaultNatureOptions: [...formData.defaultNatureOptions, newNatureInput.trim()]
      });
    }
    setNewNatureInput('');
  };

  const handleRemoveNature = (nature: string) => {
    setFormData({
      ...formData,
      defaultNatureOptions: formData.defaultNatureOptions.filter(n => n !== nature)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      saveStoredSupabaseConfig(supabaseConfig);
      await onSaveSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shadow-md shadow-orange-600/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Paramètres de l'Application</h2>
              <p className="text-xs text-slate-300">
                Configuration des numéros de suivi, coordonnées de Loyalis Trans, agences et base Supabase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 pt-2 gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('numbering')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'numbering'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Numéro de Suivi ({formData.trackingCodeDigits} chiffres)</span>
          </button>

          <button
            onClick={() => setActiveTab('company')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'company'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Société & Coordonnées</span>
          </button>

          <button
            onClick={() => setActiveTab('agencies')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'agencies'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Agences & Natures</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'supabase'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Liaison Supabase (GitHub & Cloud)</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'terms'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Conditions & Mentions</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          
          {/* TAB 1: Numbering System */}
          {activeTab === 'numbering' && (
            <div className="space-y-5">
              
              {/* Live Code Preview */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-900/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300 block">
                    Aperçu du prochain code généré automatiquement :
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-900 px-4 py-1.5 rounded-xl border border-orange-300 dark:border-orange-800 shadow-inner">
                      {nextCodePreview}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({formData.trackingCodeDigits} chiffres)
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                  Le système incrémente automatiquement ce numéro après chaque création de bon de transport.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Prochain Numéro Séquentiel (Nombre)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.nextTrackingNumber || 1}
                    onChange={e => setFormData({ ...formData, nextTrackingNumber: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nombre de Chiffres (Longueur Fixe)
                  </label>
                  <select
                    value={formData.trackingCodeDigits || 7}
                    onChange={e => setFormData({ ...formData, trackingCodeDigits: parseInt(e.target.value) || 7 })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={5}>5 Chiffres (ex: 00001)</option>
                    <option value={6}>6 Chiffres (ex: 000001)</option>
                    <option value={7}>7 Chiffres (Standard Loyalis: 0000001)</option>
                    <option value={8}>8 Chiffres (ex: 00000001)</option>
                  </select>
                </div>
              </div>

              {/* Prefix & Suffix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Préfixe Optionnel
                  </label>
                  <input
                    type="text"
                    value={formData.trackingPrefix || ''}
                    onChange={e => setFormData({ ...formData, trackingPrefix: e.target.value.toUpperCase() })}
                    placeholder="ex: LT-"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm uppercase focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Suffixe Optionnel
                  </label>
                  <input
                    type="text"
                    value={formData.trackingSuffix || ''}
                    onChange={e => setFormData({ ...formData, trackingSuffix: e.target.value.toUpperCase() })}
                    placeholder="ex: -MA"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm uppercase focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Allow Manual Override */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Autoriser la Saisie Manuelle du Numéro de Suivi
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Permet aux agents de corriger ou forcer un numéro de bon papier existant
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowManualTrackingNumber !== false}
                  onChange={e => setFormData({ ...formData, allowManualTrackingNumber: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
              </div>

            </div>
          )}

          {/* TAB 2: Company Info */}
          {activeTab === 'company' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nom de la Société
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Slogan & Activité
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Téléphone Principal (Maroc)
                  </label>
                  <input
                    type="text"
                    value={formData.phone1}
                    onChange={e => setFormData({ ...formData, phone1: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Téléphone Secondaire (Europe)
                  </label>
                  <input
                    type="text"
                    value={formData.phone2}
                    onChange={e => setFormData({ ...formData, phone2: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Email de Contact
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Devise Monétaire
                  </label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="DH">DH (Dirham Marocain)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Adresse Principale de l'Agence
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Ville de Départ par Défaut
                </label>
                <input
                  type="text"
                  value={formData.defaultDepartureCity}
                  onChange={e => setFormData({ ...formData, defaultDepartureCity: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Agencies & Nature */}
          {activeTab === 'agencies' && (
            <div className="space-y-6">
              
              {/* Agencies */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Liste des Agences / Destinataires Fréquents
                </label>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newAgencyInput}
                    onChange={e => setNewAgencyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAgency(); }}}
                    placeholder="Ajouter une ville ou agence (ex: Lille, Nador...)"
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAgency}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[80px]">
                  {formData.defaultAgencies.map(agency => (
                    <span
                      key={agency}
                      className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-xs"
                    >
                      {agency}
                      <button
                        type="button"
                        onClick={() => handleRemoveAgency(agency)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Natures of luggage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Suggestions rapides pour Nature des Bagages / Colis
                </label>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newNatureInput}
                    onChange={e => setNewNatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNature(); }}}
                    placeholder="Ajouter une nature (ex: Sacoche, Bicyclette...)"
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddNature}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[80px]">
                  {formData.defaultNatureOptions.map(nature => (
                    <span
                      key={nature}
                      className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-xs"
                    >
                      {nature}
                      <button
                        type="button"
                        onClick={() => handleRemoveNature(nature)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: SUPABASE DIRECT CLOUD INTEGRATION (Requested for GitHub Pages & Cloud) */}
          {activeTab === 'supabase' && (
            <div className="space-y-5">
              
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <Cloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200 uppercase">
                    Liaison Directe Supabase PostgreSQL
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                    Permet au site (qu'il soit hébergé sur GitHub Pages ou en serveur Cloud) d'enregistrer et lire directement les bons de transport dans votre projet Supabase.
                  </p>
                </div>
              </div>

              {/* Live Connection Test Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-400">Statut Supabase :</span>
                    {supabaseStatus.testing ? (
                      <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Test en cours...
                      </span>
                    ) : supabaseStatus.ok ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connecté avec succès à Supabase !
                      </span>
                    ) : (
                      <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Non connecté ({supabaseStatus.message || 'Vérifiez la table'})
                      </span>
                    )}
                  </div>
                  {supabaseStatus.message && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      {supabaseStatus.message}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={checkSupabase}
                  disabled={supabaseStatus.testing}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${supabaseStatus.testing ? 'animate-spin' : ''}`} />
                  <span>Tester la Connexion</span>
                </button>
              </div>

              {/* Supabase URL & Anon Key */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={supabaseConfig.url}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, url: e.target.value.trim() })}
                    placeholder="https://nhvmbzhpcaaqfjgnkdrd.supabase.co"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={supabaseConfig.anonKey}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value.trim() })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Action Box: SQL Table Creation Script & Direct Synchronizer */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                      Script SQL d'Initialisation (Tables & RLS)
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      À coller dans le SQL Editor de Supabase pour créer la table des bons
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Script SQL Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le Script SQL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 1-Click Sync All Vouchers to Supabase */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                      Synchroniser tous les Bons Existants vers Supabase
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Envoie immédiatement tous les bons locaux vers la table Supabase
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncAllVouchers}
                    disabled={syncingAllToSupabase}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingAllToSupabase ? 'animate-spin' : ''}`} />
                    <span>{syncingAllToSupabase ? 'Synchronisation...' : 'Forcer la Synchronisation'}</span>
                  </button>
                </div>

                {syncResult && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold ${
                    syncResult.startsWith('Succès') 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                  }`}>
                    {syncResult}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: Terms & Maintenance */}
          {activeTab === 'terms' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Conditions Générales de Transport (imprimées au bas du bon & consultables)
                </label>
                <textarea
                  rows={6}
                  value={formData.termsAndConditions}
                  onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              {/* Reset demo data */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Réinitialisation des Données Démo
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Recharge les données de test initiales si besoin
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-reset-demo-data"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              </div>
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between sticky bottom-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Paramètres enregistrés !</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Paramètres'}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Confirmation Modal for Reset Demo */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Réinitialisation des Données Démo"
        message="Voulez-vous vraiment réinitialiser toutes les données de démonstration aux valeurs initiales d'usine ?"
        confirmText="Réinitialiser"
        cancelText="Annuler"
        isDestructive={true}
        onConfirm={async () => {
          await onResetDemo();
          setIsResetConfirmOpen(false);
          onClose();
        }}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
