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
  ShieldCheck, 
  Server, 
  Layers, 
  HardDrive,
  Info,
  Code,
  Play,
  Terminal,
  AlertTriangle,
  FileSpreadsheet,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { 
  testSupabaseConnection, 
  SUPABASE_SQL_CREATION_SCRIPT, 
  supabaseApi,
  getStoredSupabaseConfig 
} from '../services/supabase';

const PRESET_QUERIES = [
  { label: 'Tous les bons (vouchers)', sql: 'SELECT * FROM vouchers ORDER BY created_at DESC;' },
  { label: 'Bons & Règlements', sql: 'SELECT tracking_number, date, sender_name, recipient_name, departure_city, destination_city, total_price, payment_status, status FROM vouchers ORDER BY created_at DESC;' },
  { label: 'Configuration (settings)', sql: 'SELECT * FROM settings;' },
];

export const DatabaseView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'sql' | 'supabase'>('tables');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('vouchers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);

  // Supabase state
  const [supabaseStatus, setSupabaseStatus] = useState<{ testing: boolean; ok?: boolean; message?: string }>({ testing: false });
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // SQL Runner state
  const [customSql, setCustomSql] = useState<string>('SELECT * FROM vouchers ORDER BY created_at DESC;');
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);
  const [sqlResult, setSqlResult] = useState<any | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

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

  const handleSyncToSupabase = async () => {
    setSyncingAll(true);
    setSyncMessage(null);
    try {
      const all = await api.getVouchers();
      const res = await supabaseApi.syncAllLocalVouchersToSupabase(all);
      if (res.error) {
        setSyncMessage(`Erreur: ${res.error}`);
      } else {
        setSyncMessage(`Succès ! ${res.count} bon(s) synchronisés directement dans Supabase.`);
        fetchExplorerData();
      }
    } catch (e: any) {
      setSyncMessage(`Erreur: ${e?.message}`);
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

  const supConfig = getStoredSupabaseConfig();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner with Server Stats & Status */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight">
                  Base de Données Supabase Cloud (PostgreSQL)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connectée en direct
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consultez, synchronisez et interrogez directement les tables, colonnes et enregistrements de votre instance de production
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchExplorerData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              <span>Actualiser</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger Backup JSON</span>
            </button>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-slate-700 hover:border-emerald-500/50 transition-all"
            >
              <span>Supabase Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Specs Pills */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-orange-400" />
            Hôte Supabase : <strong className="text-slate-200">{supConfig.url ? new URL(supConfig.url).hostname : 'nhvmbzhpcaaqfjgnkdrd.supabase.co'}</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            Moteur : <strong className="text-slate-200">PostgreSQL 15+</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Stockage Photos : <strong className="text-slate-200">Format JSONB natif</strong>
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Navigation Sub-Tabs */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
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
              onClick={() => setActiveSubTab('supabase')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'supabase'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Liaison Supabase & Script SQL</span>
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
              <span>Console Requêtes SQL</span>
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

        {/* SUB-TAB 1: TABLES EXPLORER */}
        {activeSubTab === 'tables' && (
          <div className="p-6">
            {/* Table selector buttons */}
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
                <p className="text-xs">Chargement des données de la base Supabase...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800">
                <p className="text-sm font-semibold">Aucune ligne trouvée dans la table {selectedTable}</p>
                <button
                  onClick={handleSyncToSupabase}
                  className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Synchroniser les données locales vers Supabase
                </button>
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

        {/* SUB-TAB 2: SUPABASE CONFIGURATION & SYNC */}
        {activeSubTab === 'supabase' && (
          <div className="p-6 space-y-6">
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-base font-black uppercase">Statut & Synchronisation Supabase</h3>
                </div>

                <button
                  onClick={checkSupabase}
                  disabled={supabaseStatus.testing}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus.testing ? 'animate-spin' : ''}`} />
                  <span>Tester la Connexion</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-slate-300">
                {supabaseStatus.testing ? (
                  <span className="text-amber-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Vérification de la connexion en cours...
                  </span>
                ) : supabaseStatus.ok ? (
                  <span className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {supabaseStatus.message || 'Connecté avec succès à Supabase !'}
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {supabaseStatus.message || 'Non connecté à Supabase'}
                  </span>
                )}
              </div>
            </div>

            {/* 1-Click Sync Button */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white uppercase">
                  Synchronisation Totale vers Supabase
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Si vos bons créés sur le site ne sont pas encore dans Supabase, cliquez sur ce bouton pour les y injecter tous en un clic.
                </p>
              </div>

              <button
                onClick={handleSyncToSupabase}
                disabled={syncingAll}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/30 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
                <span>{syncingAll ? 'Envoi en cours...' : 'Envoyer tous les Bons vers Supabase'}</span>
              </button>
            </div>

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
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">
                    Script SQL Complet de Création des Tables Supabase
                  </h4>
                  <p className="text-xs text-slate-400">
                    Copiez ce script et collez-le dans le <strong>Supabase SQL Editor</strong> de votre projet pour créer les tables <code className="text-orange-400 font-mono">vouchers</code> et <code className="text-orange-400 font-mono">settings</code> avec leurs index.
                  </p>
                </div>

                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
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
                <Play className={`w-3.5 h-3.5 ${sqlLoading ? 'animate-spin' : ''}`} />
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
