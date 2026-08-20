import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  Table as TableIcon, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Server, 
  HardDrive,
  Terminal,
  AlertTriangle,
  Cloud,
  CheckCircle2,
  Key,
  Globe,
  Trash2,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/api';
import { 
  testSupabaseConnection, 
  SUPABASE_SQL_CREATION_SCRIPT, 
  supabaseApi,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig
} from '../services/supabase';

const PRESET_QUERIES = [
  { label: 'Tous les bons (vouchers)', sql: 'SELECT * FROM vouchers ORDER BY created_at DESC;' },
  { label: 'Bons & Règlements', sql: 'SELECT tracking_number, date, sender_name, recipient_name, departure_city, destination_city, total_price, payment_status, status FROM vouchers ORDER BY created_at DESC;' },
  { label: 'Configuration (settings)', sql: 'SELECT * FROM settings;' },
];

export const DatabaseView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'sql' | 'supabase'>('supabase');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('vouchers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);

  // Supabase state & credentials form
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>('');
  const [supabaseStatus, setSupabaseStatus] = useState<{ testing: boolean; ok?: boolean; message?: string }>({ testing: false });
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [configSaveSuccess, setConfigSaveSuccess] = useState<boolean>(false);

  // SQL Runner state
  const [customSql, setCustomSql] = useState<string>('SELECT * FROM vouchers ORDER BY created_at DESC;');
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);
  const [sqlResult, setSqlResult] = useState<any | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const loadConfig = () => {
    const config = getStoredSupabaseConfig();
    setSupabaseUrl(config.url || '');
    setSupabaseAnonKey(config.anonKey || '');
  };

  const fetchExplorerData = async () => {
    setLoading(true);
    try {
      const res = await api.getDatabaseExplorer();
      setData(res);
      runCustomSql('SELECT * FROM vouchers ORDER BY created_at DESC;');
    } catch (err: any) {
      console.error('Error fetching explorer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkSupabase = async () => {
    setSupabaseStatus({ testing: true });
    const res = await testSupabaseConnection();
    setSupabaseStatus({ testing: false, ok: res.ok, message: res.message });
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveStoredSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
    });
    setConfigSaveSuccess(true);
    setTimeout(() => setConfigSaveSuccess(false), 3000);
    await checkSupabase();
    await fetchExplorerData();
  };

  const handleDisconnectSupabase = async () => {
    clearStoredSupabaseConfig();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setSupabaseStatus({ 
      testing: false, 
      ok: false, 
      message: 'Base de données Supabase déconnectée et configuration effacée. L\'application fonctionne en mode local sécurisé.' 
    });
    await fetchExplorerData();
  };

  const handleSyncToSupabase = async () => {
    setSyncingAll(true);
    setSyncMessage(null);
    try {
      const all = await api.getVouchers();
      const res = await supabaseApi.syncAllLocalVouchersToSupabase(all);
      if (res.error) {
        setSyncMessage(`Erreur : ${res.error}`);
      } else {
        setSyncMessage(`Succès ! ${res.count} bon(s) synchronisés directement dans votre nouvelle base Supabase.`);
        fetchExplorerData();
      }
    } catch (e: any) {
      setSyncMessage(`Erreur : ${e?.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  const runCustomSql = async (sqlToRun?: string) => {
    const query = sqlToRun || customSql;
    if (!query.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    try {
      const res = await api.executeSqlQuery(query);
      setSqlResult(res);
    } catch (err: any) {
      setSqlError(err.message || 'Erreur lors de l\'exécution SQL');
      setSqlResult(null);
    } finally {
      setSqlLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    fetchExplorerData();
    checkSupabase();
  }, []);

  const currentTableObj = data?.tables?.find((t: any) => t.name === selectedTable) || data?.tables?.[0];
  const rows = currentTableObj?.rows || [];

  const filteredRows = rows.filter((row: any) => {
    if (!searchQuery.trim()) return true;
    const str = JSON.stringify(row).toLowerCase();
    return str.includes(searchQuery.toLowerCase().trim());
  });

  const handleCopyJson = (dataToCopy: any) => {
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_CREATION_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadBackup = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `loyalis-database-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight">
                  Base de Données & Liaison Supabase
                </h2>
                {isConfigured && supabaseStatus.ok ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connectée
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Non connectée (Mode local sécurisé)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Google Cloud déconnecté. Configurez votre nouvelle base de données Supabase ci-dessous.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchExplorerData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              <span>Actualiser</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sauvegarder en JSON</span>
            </button>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 hover:border-emerald-500/50 transition-all"
            >
              <span>Accéder à Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Specs Pills */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-orange-400" />
            Hôte : <strong className="text-slate-200">{supabaseUrl ? new URL(supabaseUrl).hostname : 'Aucun (Déconnecté)'}</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            Google Cloud : <strong className="text-rose-400">Désactivé & Déconnecté</strong>
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Navigation Sub-Tabs */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('supabase')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'supabase'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Connexion Nouvelle Base Supabase</span>
            </button>

            <button
              onClick={() => setActiveSubTab('tables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'tables'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Explorateur des Tables ({rows.length} lignes)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('sql')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'sql'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Console SQL</span>
            </button>
          </div>

          {activeSubTab === 'tables' && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer les lignes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white pl-9 pr-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden w-64"
              />
            </div>
          )}
        </div>

        {/* SUB-TAB 1: SUPABASE CONFIGURATION */}
        {activeSubTab === 'supabase' && (
          <div className="p-6 space-y-6">

            {/* Instruction Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 space-y-3">
              <div className="flex items-center gap-2 text-orange-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Ce dont nous avons besoin pour connecter votre nouvelle base Supabase :
                </h3>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed font-sans pl-1">
                <li>
                  <strong className="text-white">Créer un nouveau projet</strong> sur <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-bold">supabase.com</a>.
                </li>
                <li>
                  Aller dans <strong className="text-white">Project Settings ➔ API</strong> et copier :
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-400">
                    <li><strong className="text-orange-400">Project URL</strong> (ex : <code className="text-slate-300 font-mono">https://xxxxxxxxxxxxxxxx.supabase.co</code>)</li>
                    <li><strong className="text-orange-400">Project API Keys (anon / public)</strong> (la clé commençant par <code className="text-slate-300 font-mono">eyJhbGci...</code>)</li>
                  </ul>
                </li>
                <li>
                  Aller dans <strong className="text-white">SQL Editor</strong>, créer une <strong className="text-white">New Query</strong>, coller le script SQL ci-dessous et cliquer sur <strong className="text-emerald-400">Run</strong>.
                </li>
              </ol>
            </div>

            {/* Credentials Input Form */}
            <form onSubmit={handleSaveConfig} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Key className="w-4 h-4 text-orange-400" />
                  <span>Paramètres de Connexion Supabase</span>
                </h4>
                {isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Déconnecter & Tout Effacer</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supabase Project URL</span>
                  </label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    placeholder="https://votre-projet.supabase.co"
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supabase Anon Key (Public)</span>
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={e => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer & Connecter</span>
                </button>

                <button
                  type="button"
                  onClick={checkSupabase}
                  disabled={supabaseStatus.testing}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus.testing ? 'animate-spin' : ''}`} />
                  <span>Tester le Statut</span>
                </button>
              </div>

              {configSaveSuccess && (
                <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold">
                  ✓ Configuration Supabase enregistrée avec succès.
                </div>
              )}

              {/* Status Banner */}
              <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-300 border border-slate-800">
                {supabaseStatus.testing ? (
                  <span className="text-amber-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Vérification de la connexion en cours...
                  </span>
                ) : supabaseStatus.ok ? (
                  <span className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{supabaseStatus.message || 'Connecté avec succès à Supabase !'}</span>
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{supabaseStatus.message || 'En attente de vos identifiants de nouvelle base.'}</span>
                  </span>
                )}
              </div>
            </form>

            {/* 1-Click Sync Button */}
            {isConfigured && supabaseStatus.ok && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">
                    Synchroniser les Bons vers la Nouvelle Base
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Envoyer tous les bons existants vers votre nouvelle base Supabase.
                  </p>
                </div>

                <button
                  onClick={handleSyncToSupabase}
                  disabled={syncingAll}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
                  <span>{syncingAll ? 'Synchronisation...' : 'Envoyer les Bons vers Supabase'}</span>
                </button>
              </div>
            )}

            {syncMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                syncMessage.startsWith('Succès') 
                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' 
                  : 'bg-rose-950 border border-rose-800 text-rose-300'
              }`}>
                {syncMessage}
              </div>
            )}

            {/* SQL Script to execute in Supabase Editor */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">
                    Script SQL d'Initialisation (Tables & Sécurité)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Copiez ce script et collez-le dans le <strong>Supabase SQL Editor</strong> de votre projet pour créer les tables <code className="text-orange-400 font-mono">vouchers</code>, <code className="text-orange-400 font-mono">settings</code> et <code className="text-orange-400 font-mono">users</code>.
                  </p>
                </div>

                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Script Copié !' : 'Copier le Script SQL'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72">
                {SUPABASE_SQL_CREATION_SCRIPT}
              </pre>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: TABLES EXPLORER */}
        {activeSubTab === 'tables' && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {data?.tables?.map((table: any) => (
                <button
                  key={table.name}
                  onClick={() => {
                    setSelectedTable(table.name);
                    setSelectedRowDetail(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedTable === table.name
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {table.name} ({table.rows?.length || table.count || 0})
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-400 mb-2" />
                <p className="text-xs">Chargement des données...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800">
                <p className="text-sm font-semibold">Aucune ligne trouvée dans la table {selectedTable}</p>
                {isConfigured && (
                  <button
                    onClick={handleSyncToSupabase}
                    className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    Synchroniser les données locales vers Supabase
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Tracking</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Expéditeur</th>
                      <th className="py-3 px-4">Destinataire</th>
                      <th className="py-3 px-4">Trajet</th>
                      <th className="py-3 px-4">Colis / Poids</th>
                      <th className="py-3 px-4 text-right">Prix</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50 font-mono">
                    {filteredRows.map((row: any, idx: number) => (
                      <tr 
                        key={row.id || idx} 
                        className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                        onClick={() => setSelectedRowDetail(row)}
                      >
                        <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-orange-400">
                          {row.tracking_number || row.trackingNumber || row.id}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {row.date || row.createdAt?.substring(0, 10)}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-200">
                          {typeof row.sender === 'object' ? row.sender?.name : row.sender_name}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-200">
                          {typeof row.recipient === 'object' ? row.recipient?.name : row.recipient_name}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          {row.departure_city || row.departureCity} ➔ {row.destination_city || row.recipient?.destination || row.destinationCity}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {row.total_colis || row.totalColis} col. ({row.total_weight_kg || row.totalWeightKg} kg)
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-100">
                          {row.total_price || row.totalPrice} DH
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {row.status || 'EN_ATTENTE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyJson(row);
                            }}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                            title="Copier JSON"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Row Detail Drawer Modal */}
            {selectedRowDetail && (
              <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-orange-400 uppercase font-mono">
                    Détails bruts de l'enregistrement ({selectedRowDetail.tracking_number || selectedRowDetail.trackingNumber || selectedRowDetail.id})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyJson(selectedRowDetail)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copié' : 'Copier JSON'}</span>
                    </button>
                    <button
                      onClick={() => setSelectedRowDetail(null)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs font-bold"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
                <pre className="text-[11px] font-mono bg-slate-900 p-3 rounded-lg text-emerald-400 overflow-x-auto max-h-64">
                  {JSON.stringify(selectedRowDetail, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 3: SQL CONSOLE */}
        {activeSubTab === 'sql' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase">
                Requête SQL à exécuter :
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Exemples rapides :</span>
                {PRESET_QUERIES.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCustomSql(p.sql);
                      runCustomSql(p.sql);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded text-xs font-mono cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={customSql}
                onChange={e => setCustomSql(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 text-emerald-400 p-3 rounded-xl text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
              <button
                onClick={() => runCustomSql()}
                disabled={sqlLoading}
                className="absolute right-3 bottom-3 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Terminal className={`w-3.5 h-3.5 ${sqlLoading ? 'animate-spin' : ''}`} />
                <span>{sqlLoading ? 'Exécution...' : 'Exécuter SQL'}</span>
              </button>
            </div>

            {sqlError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono">
                {sqlError}
              </div>
            )}

            {sqlResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Résultat de la requête ({sqlResult.rows?.length || 0} lignes)</span>
                  <button
                    onClick={() => handleCopyJson(sqlResult)}
                    className="flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier JSON</span>
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-80">
                  <pre className="p-4 bg-slate-950 text-emerald-400 text-xs font-mono overflow-x-auto">
                    {JSON.stringify(sqlResult.rows || sqlResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
