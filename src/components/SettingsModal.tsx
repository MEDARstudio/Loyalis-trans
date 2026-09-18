import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  ArrowRight,
  Users,
  Lock,
  Key,
  Eye,
  EyeOff,
  Shield,
  UserCheck
} from 'lucide-react';
import { CompanySettings, Voucher, AgentProfile } from '../types';
import { formatTrackingNumber } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  clearStoredSupabaseConfig,
  testSupabaseConnection, 
  getDatabaseProjectName,
  SUPABASE_SQL_CREATION_SCRIPT,
  supabaseApi
} from '../services/supabase';
import { api } from '../services/api';
import { 
  getStoredAgents, 
  createNewAgentProfile, 
  updateAgentProfile, 
  deleteAgentProfile 
} from '../services/agentAuth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  vouchers?: Voucher[];
  currentAgent?: AgentProfile;
  onSaveSettings: (newSettings: CompanySettings) => Promise<void>;
  onResetDemo: () => Promise<void>;
  onAgentsUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  vouchers,
  currentAgent,
  onSaveSettings,
  onResetDemo,
  onAgentsUpdated
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [activeTab, setActiveTab] = useState<'numbering' | 'company' | 'agencies' | 'profiles' | 'terms' | 'supabase'>('numbering');
  const [newAgencyInput, setNewAgencyInput] = useState<string>('');
  const [newNatureInput, setNewNatureInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Profiles Management State (Amine Admin)
  const [agentsList, setAgentsList] = useState<AgentProfile[]>([]);
  const [showPasswordAgentIds, setShowPasswordAgentIds] = useState<string[]>([]);
  const [profileActionFeedback, setProfileActionFeedback] = useState<string | null>(null);
  
  // New Agent Form
  const [newAgentName, setNewAgentName] = useState<string>('');
  const [newAgentUsername, setNewAgentUsername] = useState<string>('');
  const [newAgentPassword, setNewAgentPassword] = useState<string>('');
  const [newAgentRole, setNewAgentRole] = useState<'ADMIN' | 'AGENT'>('AGENT');
  const [newAgentAgency, setNewAgentAgency] = useState<string>('Casablanca');
  const [newAgentCanDelete, setNewAgentCanDelete] = useState<boolean>(false);
  const [newAgentCanValidate, setNewAgentCanValidate] = useState<boolean>(false);
  const [newAgentPhone, setNewAgentPhone] = useState<string>('');

  // Calculate the highest sequence number from existing vouchers
  const { lastVoucher, lastVoucherSeq } = useMemo(() => {
    if (!vouchers || vouchers.length === 0) {
      return { lastVoucher: null, lastVoucherSeq: 0 };
    }
    let maxSeq = 0;
    let foundVoucher: Voucher | null = null;
    for (const v of vouchers) {
      const digits = String(v.trackingNumber || '').replace(/\D/g, '');
      const parsedDigits = digits ? parseInt(digits, 10) : 0;
      const effectiveSeq = v.sequenceNumber || parsedDigits || 0;
      if (effectiveSeq > maxSeq) {
        maxSeq = effectiveSeq;
        foundVoucher = v;
      }
    }
    return { lastVoucher: foundVoucher, lastVoucherSeq: maxSeq };
  }, [vouchers]);

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

  useEffect(() => {
    if (isOpen) {
      setAgentsList(getStoredAgents());
      setProfileActionFeedback(null);
    }
  }, [isOpen]);

  const handleToggleShowPassword = (id: string) => {
    if (showPasswordAgentIds.includes(id)) {
      setShowPasswordAgentIds(showPasswordAgentIds.filter(i => i !== id));
    } else {
      setShowPasswordAgentIds([...showPasswordAgentIds, id]);
    }
  };

  const handleCreateNewAgent = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileActionFeedback(null);
    const res = createNewAgentProfile({
      name: newAgentName,
      username: newAgentUsername,
      password: newAgentPassword,
      role: newAgentRole,
      agencyCity: newAgentAgency,
      canDelete: newAgentCanDelete,
      canValidate: newAgentCanValidate,
      phone: newAgentPhone
    });

    if (res.success) {
      setAgentsList(getStoredAgents());
      setNewAgentName('');
      setNewAgentUsername('');
      setNewAgentPassword('');
      setNewAgentRole('AGENT');
      setNewAgentCanDelete(false);
      setNewAgentCanValidate(false);
      setNewAgentPhone('');
      setProfileActionFeedback(`Profil "${res.agent?.name}" créé avec succès !`);
      if (onAgentsUpdated) onAgentsUpdated();
    } else {
      setProfileActionFeedback(`Erreur : ${res.error}`);
    }
  };

  const handleChangeAgentRole = (agentId: string, role: 'ADMIN' | 'AGENT') => {
    const res = updateAgentProfile(agentId, { role });
    if (res.success) {
      setAgentsList(getStoredAgents());
      setProfileActionFeedback(`Rôle mis à jour pour ${res.agent?.name}.`);
      if (onAgentsUpdated) onAgentsUpdated();
    }
  };

  const handleTogglePermission = (agentId: string, perm: 'canDelete' | 'canValidate', val: boolean) => {
    const res = updateAgentProfile(agentId, { [perm]: val });
    if (res.success) {
      setAgentsList(getStoredAgents());
      if (onAgentsUpdated) onAgentsUpdated();
    }
  };

  const handleDeleteAgentClick = (agentId: string) => {
    const res = deleteAgentProfile(agentId);
    if (res.success) {
      setAgentsList(getStoredAgents());
      setProfileActionFeedback('Profil supprimé avec succès.');
      if (onAgentsUpdated) onAgentsUpdated();
    } else {
      setProfileActionFeedback(`Erreur : ${res.error}`);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[96vh] sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold truncate">Paramètres de l'Application</h2>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Configuration des numéros de suivi, coordonnées et agents
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 sm:px-6 pt-2 gap-1.5 sm:gap-2 overflow-x-auto text-xs font-bold shrink-0">
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
            onClick={() => setActiveTab('profiles')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'profiles'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-orange-500" />
            <span>Profils & Rôles</span>
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
            <span>Base de Données</span>
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
              
              {/* Status Banner - Last Voucher & Next Voucher */}
              {lastVoucher && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold text-sm">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                        Dernier bon enregistré dans le système :
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                        N° {lastVoucher.trackingNumber}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        (Séquence {lastVoucherSeq}) • {lastVoucher.date}
                      </span>
                    </div>
                  </div>

                  {lastVoucherSeq >= (formData.nextTrackingNumber || 1) && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, nextTrackingNumber: lastVoucherSeq + 1 })}
                      className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Définir automatiquement le prochain numéro après le dernier bon"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Définir après le dernier bon (N° {lastVoucherSeq + 1})</span>
                    </button>
                  )}
                </div>
              )}

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

                <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xs bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-orange-200/50 dark:border-orange-800/40">
                  <span className="font-semibold text-orange-700 dark:text-orange-400 block mb-0.5">Auto-Incrémentation garantie :</span>
                  Chaque création de bon utilise ce numéro puis incrémente automatiquement pour que le bon suivant reçoive le numéro consécutif.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Prochain Numéro Séquentiel (Nombre)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nextTrackingNumber: (prev.nextTrackingNumber || 1) + 1 }))}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 font-bold transition-colors"
                        title="Ajouter +1"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nextTrackingNumber: (prev.nextTrackingNumber || 1) + 10 }))}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 font-bold transition-colors"
                        title="Ajouter +10"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.nextTrackingNumber !== undefined ? formData.nextTrackingNumber : 1}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      const parsed = digits ? parseInt(digits, 10) : 1;
                      setFormData({ ...formData, nextTrackingNumber: parsed });
                    }}
                    placeholder="ex: 505 ou 0000505"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Vous pouvez saisir directement un chiffre (ex: 505).
                  </span>
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
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Complété automatiquement par des zéros à gauche.
                  </span>
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
                    placeholder="ex: BON-"
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

          {/* TAB 4: DATABASE & CLOUD STATUS */}
          {activeTab === 'supabase' && (
            <div className="space-y-5">
              
              {/* Connected Database Information & Status Card */}
              {(() => {
                const dbName = getDatabaseProjectName(supabaseConfig.url);
                const isConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
                const isConnected = isConfigured && (supabaseStatus.ok === true);

                return (
                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    supabaseStatus.testing 
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700' 
                      : isConnected
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-400 dark:border-emerald-700 shadow-sm'
                        : isConfigured && supabaseStatus.ok === false
                          ? 'bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/20 border-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Database className={`w-5 h-5 ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`} />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Base de données connectée :
                          </span>
                          {isConnected ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              {dbName} (Connectée)
                            </span>
                          ) : supabaseStatus.testing ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1.5">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Vérification en cours...
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200 flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              Non connectée
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          <span>Nom du Projet :</span>
                          <span className="font-mono text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">
                            {dbName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            (Hôte : db.olahhcegkeqromqdfwnj.supabase.co:5432)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                          <div className="bg-white/70 dark:bg-slate-900/70 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Hôte</span>
                            <span className="truncate block font-semibold text-slate-800 dark:text-slate-200">db.{dbName}.supabase.co</span>
                          </div>
                          <div className="bg-white/70 dark:bg-slate-900/70 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Port</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">5432</span>
                          </div>
                          <div className="bg-white/70 dark:bg-slate-900/70 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Database</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">postgres</span>
                          </div>
                          <div className="bg-white/70 dark:bg-slate-900/70 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[10px] block">Utilisateur</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">postgres</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                          {isConnected 
                            ? `Le site est correctement relié à la base de données Supabase [${dbName}]. Tous les enregistrements, modifications et états des colis sont synchronisés.`
                            : isConfigured
                              ? `Identifiants configurés pour [${dbName}]. Cliquez sur "Tester la Connexion" pour vérifier l'accès aux tables.`
                              : "Aucune base de données externe n'est configurée. Le site fonctionne actuellement en mode local."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={checkSupabase}
                          disabled={supabaseStatus.testing}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus.testing ? 'animate-spin' : ''}`} />
                          <span>{supabaseStatus.testing ? 'Test...' : 'Tester la Connexion'}</span>
                        </button>

                        {isConfigured && (
                          <button
                            type="button"
                            onClick={() => {
                              clearStoredSupabaseConfig();
                              setSupabaseConfig({ url: '', anonKey: '' });
                              setSupabaseStatus({ testing: false, ok: false, message: 'Déconnectée' });
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
                            title="Déconnecter cette base"
                          >
                            Déconnecter
                          </button>
                        )}
                      </div>
                    </div>

                    {supabaseStatus.message && (
                      <div className={`mt-3 p-2.5 rounded-xl text-xs font-mono ${
                        supabaseStatus.ok
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200'
                      }`}>
                        {supabaseStatus.message}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Supabase URL & Anon Key Inputs */}
              <div className="space-y-4 pt-2">
                <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Paramètres de Connexion Supabase
                </h5>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={supabaseConfig.url}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, url: e.target.value.trim() })}
                    placeholder="https://olahhcegkeqromqdfwnj.supabase.co"
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Action Box: SQL Table Creation Script & Direct Synchronizer */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                      Script SQL d'Initialisation des Tables
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      À coller une seule fois dans le SQL Editor de Supabase pour créer la structure
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
                      Synchroniser les Bons Existants vers Supabase
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Envoie immédiatement les bons enregistrés vers votre base connectée
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncAllVouchers}
                    disabled={syncingAllToSupabase}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingAllToSupabase ? 'animate-spin' : ''}`} />
                    <span>{syncingAllToSupabase ? 'Synchronisation...' : 'Synchroniser les Données'}</span>
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

          {/* TAB 4: Profiles & Roles Management (Amine Admin) */}
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              
              {/* Header Info */}
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                    Gestion des Profils & Permissions d'Accès
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    En tant qu'administrateur principal (Amine), vous pouvez créer de nouveaux comptes, attribuer les rôles et permissions (validation, suppression), ou révoquer les accès. Les identifiants et mots de passe sont strictement protégés et confidentiels.
                  </p>
                </div>
              </div>

              {/* Feedback Alert */}
              {profileActionFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  profileActionFeedback.startsWith('Erreur') 
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800' 
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileActionFeedback}</span>
                </div>
              )}

              {/* Existing Profiles List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span>Profils Actifs ({agentsList.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Cliquez sur l'icône oeil pour révéler les accès administrateur
                  </span>
                </div>

                <div className="space-y-3">
                  {agentsList.map((ag) => {
                    const isAmineAdmin = ag.username === '010904' || ag.name.toLowerCase() === 'amine';
                    const showCreds = showPasswordAgentIds.includes(ag.id);

                    return (
                      <div 
                        key={ag.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                      >
                        {/* Profile Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                              ag.role === 'ADMIN'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {ag.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  {ag.name}
                                </span>
                                {isAmineAdmin && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                    Admin Principal
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Agence : <strong>{ag.agencyCity || 'Non définie'}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Role Switcher */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-500">Rôle :</label>
                            <select
                              value={ag.role}
                              onChange={(e) => handleChangeAgentRole(ag.id, e.target.value as 'ADMIN' | 'AGENT')}
                              disabled={isAmineAdmin}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
                            >
                              <option value="ADMIN">ADMINISTRATEUR</option>
                              <option value="AGENT">AGENT DE GUICHET</option>
                            </select>

                            {!isAmineAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAgentClick(ag.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                                title="Supprimer ce profil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Confidential Credentials Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Identifiant :</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {showCreds ? ag.username : '••••••'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 font-medium">Mot de passe :</span>
                              <button
                                type="button"
                                onClick={() => handleToggleShowPassword(ag.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                title={showCreds ? 'Masquer' : 'Afficher'}
                              >
                                {showCreds ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {showCreds ? (ag.password || 'Non configuré') : '••••••'}
                            </span>
                          </div>
                        </div>

                        {/* Permissions Checkboxes */}
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ag.canValidate || false}
                              onChange={(e) => handleTogglePermission(ag.id, 'canValidate', e.target.checked)}
                              className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                            />
                            <span>Peut valider les bons</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ag.canDelete || false}
                              onChange={(e) => handleTogglePermission(ag.id, 'canDelete', e.target.checked)}
                              className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                            />
                            <span>Peut supprimer les bons</span>
                          </label>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Create New Agent Profile Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Créer un nouveau profil agent
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Remplissez l'identifiant et le mot de passe pour autoriser un nouveau collaborateur
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="Ex: Karim ou Fatima"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Ville d'agence
                    </label>
                    <select
                      value={newAgentAgency}
                      onChange={(e) => setNewAgentAgency(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold focus:outline-none focus:border-orange-500"
                    >
                      {formData.defaultAgencies.map((ag) => (
                        <option key={ag} value={ag}>{ag}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Identifiant de connexion
                    </label>
                    <input
                      type="text"
                      value={newAgentUsername}
                      onChange={(e) => setNewAgentUsername(e.target.value)}
                      placeholder="Ex: 010905 ou agent_casa"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Mot de passe
                    </label>
                    <input
                      type="text"
                      value={newAgentPassword}
                      onChange={(e) => setNewAgentPassword(e.target.value)}
                      placeholder="Mot de passe secret..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Rôle
                    </label>
                    <select
                      value={newAgentRole}
                      onChange={(e) => setNewAgentRole(e.target.value as 'ADMIN' | 'AGENT')}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold focus:outline-none focus:border-orange-500"
                    >
                      <option value="AGENT">AGENT DE GUICHET</option>
                      <option value="ADMIN">ADMINISTRATEUR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Téléphone (optionnel)
                    </label>
                    <input
                      type="tel"
                      value={newAgentPhone}
                      onChange={(e) => setNewAgentPhone(e.target.value)}
                      placeholder="06..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Permissions for new agent */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAgentCanValidate}
                      onChange={(e) => setNewAgentCanValidate(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                    />
                    <span>Peut valider les bons</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAgentCanDelete}
                      onChange={(e) => setNewAgentCanDelete(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                    />
                    <span>Peut supprimer les bons</span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCreateNewAgent}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer le Profil</span>
                  </button>
                </div>

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
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
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
