import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  CheckSquare, 
  Square, 
  Filter, 
  Calendar, 
  MapPin, 
  Check,
  Layers
} from 'lucide-react';
import { CompanySettings, Voucher } from '../types';
import { exportVouchersToExcel } from '../utils/excelExporter';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  selectedVoucherIds: string[];
  currentFilteredVouchers: Voucher[];
  settings: CompanySettings;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  vouchers,
  selectedVoucherIds,
  currentFilteredVouchers,
  settings
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [customDestination, setCustomDestination] = useState<string>('ALL');
  const [includeItemsBreakdown, setIncludeItemsBreakdown] = useState<boolean>(true);
  const [customFileName, setCustomFileName] = useState<string>(
    `LoyalisTrans_Bons_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Resolve vouchers to export according to scope
  const getVouchersToExport = (): Voucher[] => {
    switch (exportScope) {
      case 'selected':
        return vouchers.filter(v => selectedVoucherIds.includes(v.id) || selectedVoucherIds.includes(v.trackingNumber));
      case 'filtered':
        return currentFilteredVouchers;
      case 'custom': {
        let list = [...vouchers];
        if (customStartDate) list = list.filter(v => v.date >= customStartDate);
        if (customEndDate) list = list.filter(v => v.date <= customEndDate);
        if (customDestination && customDestination !== 'ALL') {
          list = list.filter(v =>
            v.destinationCity?.toLowerCase() === customDestination.toLowerCase() ||
            v.recipient.destination?.toLowerCase().includes(customDestination.toLowerCase())
          );
        }
        return list;
      }
      case 'all':
      default:
        return vouchers;
    }
  };

  const targetVouchers = getVouchersToExport();

  const handleExport = () => {
    if (targetVouchers.length === 0) {
      alert('Aucun bon à exporter selon la sélection choisie.');
      return;
    }

    setIsExporting(true);
    try {
      exportVouchersToExcel(targetVouchers, settings, {
        fileName: customFileName,
        includeItemsBreakdown
      });
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Export error:', err);
      alert('Erreur lors de l\'exportation Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shadow">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Exportation Excel (.xlsx)</h2>
              <p className="text-xs text-emerald-200">
                Créez et téléchargez votre base de données personnelle sur ordinateur
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-950 text-emerald-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-slate-800 dark:text-slate-100">
          
          {/* Export Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Sélection des bons à exporter
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* All */}
              <label
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  exportScope === 'all'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Tous les bons</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Totalité de la base ({vouchers.length} bons)</span>
                </div>
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                  className="accent-emerald-600"
                />
              </label>

              {/* Filtered */}
              <label
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  exportScope === 'filtered'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Liste filtrée actuelle</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Selon recherche ({currentFilteredVouchers.length} bons)</span>
                </div>
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'filtered'}
                  onChange={() => setExportScope('filtered')}
                  className="accent-emerald-600"
                />
              </label>

              {/* Selected with checkboxes */}
              <label
                onClick={() => setExportScope('selected')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  exportScope === 'selected'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Bons cochés uniquement</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedVoucherIds.length > 0 ? `${selectedVoucherIds.length} bon(s) sélectionné(s)` : 'Aucun coché'}
                  </span>
                </div>
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'selected'}
                  onChange={() => setExportScope('selected')}
                  className="accent-emerald-600"
                />
              </label>

              {/* Custom Date & Destination */}
              <label
                onClick={() => setExportScope('custom')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  exportScope === 'custom'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">Filtre personnalisé</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Par date ou destination</span>
                </div>
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'custom'}
                  onChange={() => setExportScope('custom')}
                  className="accent-emerald-600"
                />
              </label>

            </div>
          </div>

          {/* Custom Filter Fields (if scope === custom) */}
          {exportScope === 'custom' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Date Début
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Date Fin
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Destination / Ville
                </label>
                <select
                  value={customDestination}
                  onChange={e => setCustomDestination(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                >
                  <option value="ALL">Toutes les destinations</option>
                  {settings.defaultAgencies?.map(ag => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeItemsBreakdown}
                onChange={e => setIncludeItemsBreakdown(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inclure un 2ème onglet avec le détail ligne par ligne des colis & bagages
              </span>
            </label>

            {/* Custom Filename */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nom du fichier Excel
              </label>
              <input
                type="text"
                value={customFileName}
                onChange={e => setCustomFileName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Target Count Preview Badge */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center justify-between">
            <span className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
              Nombre de bons prêts à être exportés :
            </span>
            <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {targetVouchers.length} bon(s)
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
          >
            Fermer
          </button>

          <button
            type="button"
            disabled={isExporting || targetVouchers.length === 0}
            onClick={handleExport}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {exportSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Téléchargé !</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Génération...' : 'Télécharger le fichier Excel (.xlsx)'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
