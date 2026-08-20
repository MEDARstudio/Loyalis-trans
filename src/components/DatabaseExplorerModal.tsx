import React, { useState, useEffect } from 'react';
import { 
  Database, 
  X, 
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
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

interface DatabaseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_QUERIES = [
  { label: 'Tous les bons de bagages (vouchers)', sql: 'SELECT * FROM vouchers ORDER BY created_at DESC;' },
  { label: 'Synthèse des bons & paiements', sql: 'SELECT tracking_number, date, sender_name, recipient_name, departure_city, destination_city, total_colis, total_weight_kg, total_price, payment_status, status FROM vouchers ORDER BY created_at DESC;' },
  { label: 'Paramètres entreprise (settings)', sql: 'SELECT * FROM settings;' },
  { label: 'Utilisateurs & Agents (users)', sql: 'SELECT * FROM users;' },
];

export const DatabaseExplorerModal: React.FC<DatabaseExplorerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'sql'>('tables');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('vouchers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);

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
      // Run initial SQL query as well so both tabs have data
      runCustomSql('SELECT * FROM vouchers ORDER BY created_at DESC;');
    } catch (err: any) {
      console.error('Error fetching explorer data:', err);
    } finally {
      setLoading(false);
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
    if (isOpen) {
      fetchExplorerData();
      setSelectedRowDetail(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleDownloadBackup = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `loyalis-cloudsql-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-wider text-white">
                  Base de Données PostgreSQL (Cloud SQL)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connectée & Opérationnelle
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualisez et inspectez directement toutes les tables et données en direct
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchExplorerData}
              title="Rafraîchir les données"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading || sqlLoading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Info Banner */}
        <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-orange-400" />
              Instance : <strong className="text-slate-200 font-mono">ai-studio-4e315ef0</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              Moteur : <strong className="text-slate-200 font-mono">PostgreSQL (europe-west1)</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Projet : <strong className="text-slate-200 font-mono">smurfy-iris-lzp7b</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sauvegarder JSON</span>
            </button>

            <a
              href="https://console.cloud.google.com/sql/instances/ai-studio-4e315ef0/overview?project=smurfy-iris-lzp7b"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-semibold hover:underline"
            >
              <span>Console Google Cloud</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* View Switcher: Tables vs SQL Terminal */}
        <div className="bg-slate-900 px-6 py-2 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'tables'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Explorateur de Tables</span>
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'sql'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console Requêtes SQL</span>
            </button>
          </div>

          {activeTab === 'tables' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-44"
                />
              </div>
              <button
                onClick={() => handleCopyJson(filteredRows)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          
          {/* TAB 1: TABLES EXPLORER */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              {/* Table Buttons */}
              <div className="flex items-center gap-2">
                {data?.tables?.map((table: any) => (
                  <button
                    key={table.name}
                    onClick={() => {
                      setSelectedTable(table.name);
                      setSelectedRowDetail(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedTable === table.name
                        ? 'bg-slate-800 text-orange-400 border border-orange-500/50'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span className="font-mono">{table.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-950 text-slate-300">
                      {table.rowCount} lignes
                    </span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-sm font-semibold">Lecture des données PostgreSQL en cours...</p>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Info className="w-8 h-8" />
                  <p className="text-sm">Aucun enregistrement dans cette table.</p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow">
                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="sticky top-0 bg-slate-800 text-slate-300 font-bold uppercase border-b border-slate-700">
                        <tr>
                          <th className="p-3">#</th>
                          {Object.keys(filteredRows[0] || {}).map((col) => (
                            <th key={col} className="p-3 whitespace-nowrap text-slate-300">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredRows.map((row: any, idx: number) => (
                          <tr 
                            key={row.id || idx} 
                            onClick={() => setSelectedRowDetail(row)}
                            className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                          >
                            <td className="p-3 text-slate-500">{idx + 1}</td>
                            {Object.entries(row).map(([col, val]: [string, any]) => (
                              <td key={col} className="p-3 whitespace-nowrap text-slate-300 max-w-xs truncate">
                                {typeof val === 'object' && val !== null ? (
                                  <span className="text-amber-400 font-semibold">[JSON {Array.isArray(val) ? `(${val.length} items)` : 'Object'}]</span>
                                ) : col === 'trackingNumber' || col === 'tracking_number' ? (
                                  <span className="font-bold text-orange-400">{String(val)}</span>
                                ) : col.toLowerCase().includes('price') || col.toLowerCase().includes('amount') ? (
                                  <span className="font-bold text-emerald-400">{String(val)} DH</span>
                                ) : col === 'paymentStatus' || col === 'payment_status' ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    val === 'PAYE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {String(val)}
                                  </span>
                                ) : (
                                  <span>{val !== null && val !== undefined ? String(val) : '—'}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Row Detailed JSON Inspector */}
              {selectedRowDetail && (
                <div className="p-4 rounded-xl bg-slate-900 border border-orange-500/40 animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                      <Code className="w-4 h-4" />
                      <span>Détail complet de l'enregistrement sélectionné</span>
                    </div>
                    <button
                      onClick={() => setSelectedRowDetail(null)}
                      className="text-slate-400 hover:text-white text-xs font-bold"
                    >
                      Fermer
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-emerald-300 bg-slate-950 p-3 rounded-lg overflow-auto max-h-56">
                    {JSON.stringify(selectedRowDetail, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE SQL QUERY RUNNER */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              {/* Presets */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Requêtes SQL rapides :
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_QUERIES.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCustomSql(preset.sql);
                        runCustomSql(preset.sql);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SQL Input Area */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-orange-400 font-mono flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Requête SQL PostgreSQL :</span>
                  </span>
                  <button
                    onClick={() => runCustomSql()}
                    disabled={sqlLoading}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow transition-colors"
                  >
                    <Play className={`w-3.5 h-3.5 ${sqlLoading ? 'animate-spin' : ''}`} />
                    <span>{sqlLoading ? 'Exécution...' : 'Exécuter la requête'}</span>
                  </button>
                </div>
                <textarea
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-orange-500"
                  placeholder="SELECT * FROM vouchers WHERE status = 'EN_TRANSIT';"
                />
              </div>

              {/* SQL Error */}
              {sqlError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{sqlError}</span>
                </div>
              )}

              {/* SQL Result Table */}
              {sqlResult && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow">
                  <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{sqlResult.rowCount} résultat(s) retourné(s)</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">Temps : {sqlResult.durationMs} ms</span>
                    </div>
                    <button
                      onClick={() => handleCopyJson(sqlResult.rows)}
                      className="text-orange-400 hover:underline font-semibold"
                    >
                      Copier le résultat JSON
                    </button>
                  </div>

                  {sqlResult.rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Aucune ligne retournée pour cette requête.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[45vh]">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead className="sticky top-0 bg-slate-800 text-slate-300 font-bold uppercase border-b border-slate-700">
                          <tr>
                            <th className="p-3">#</th>
                            {sqlResult.columns.map((col: string) => (
                              <th key={col} className="p-3 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {sqlResult.rows.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/50">
                              <td className="p-3 text-slate-500">{idx + 1}</td>
                              {sqlResult.columns.map((col: string) => {
                                const val = row[col];
                                return (
                                  <td key={col} className="p-3 whitespace-nowrap text-slate-200">
                                    {typeof val === 'object' && val !== null ? (
                                      <span className="text-amber-400">{JSON.stringify(val)}</span>
                                    ) : col === 'tracking_number' || col === 'trackingNumber' ? (
                                      <span className="font-bold text-orange-400">{String(val)}</span>
                                    ) : (
                                      <span>{val !== null && val !== undefined ? String(val) : '—'}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Toutes les données sont stockées de façon sécurisée et permanente dans Cloud SQL.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
