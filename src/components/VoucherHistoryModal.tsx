import React from 'react';
import { 
  History, 
  X, 
  Calendar, 
  User, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  FileText, 
  AlertCircle,
  Truck,
  ShieldCheck
} from 'lucide-react';
import { Voucher, VoucherModificationHistory } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';

interface VoucherHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: Voucher | null;
}

export const VoucherHistoryModal: React.FC<VoucherHistoryModalProps> = ({
  isOpen,
  onClose,
  voucher
}) => {
  if (!isOpen || !voucher) return null;

  const history = voucher.history || [];

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'CREATION':
        return {
          label: 'Création initiale',
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: FileText
        };
      case 'STATUS_CHANGE':
        return {
          label: 'Statut acheminement',
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: Truck
        };
      case 'PAYMENT_CHANGE':
        return {
          label: 'Statut de paiement',
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: CreditCard
        };
      case 'VALIDATION':
        return {
          label: 'Validation Bon Réel',
          bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: ShieldCheck
        };
      case 'EXTERNAL_CARRIER':
        return {
          label: 'Sous-traitance',
          bg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
          icon: Truck
        };
      default:
        return {
          label: 'Modification',
          bg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
          icon: History
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white leading-tight">
                  Historique du Bon N° {voucher.trackingNumber}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {history.length} événement(s)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Créé le {formatDate(voucher.date)}</span>
                {voucher.createdByAgent && (
                  <span>• Par <strong className="text-slate-700 dark:text-slate-200 font-bold">{voucher.createdByAgent}</strong></span>
                )}
                <span>• Client: <strong className="text-slate-700 dark:text-slate-200 font-bold">{voucher.sender?.name}</strong></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline */}
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  État initial du bon
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Ce bon est dans son état original de création. Aucune modification ultérieure n'a été enregistrée à ce jour.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-slate-400">
                Créé le {formatDateTime(voucher.createdAt || voucher.date)} {voucher.createdByAgent ? `par ${voucher.createdByAgent}` : ''}
              </div>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {history.map((entry, index) => {
                const badge = getActionBadge(entry.actionType);
                const ActionIcon = badge.icon;
                const formattedTime = entry.dateFormatted || formatDateTime(entry.timestamp);

                return (
                  <div key={entry.id || index} className="relative group">
                    {/* Dot on timeline */}
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-orange-500 flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                    </div>

                    {/* Card */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 space-y-2 hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors">
                      {/* Top meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}>
                            <ActionIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {entry.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedTime}
                        </span>
                      </div>

                      {/* Author & Motif */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <User className="w-3 h-3" />
                          Auteur : <strong className="text-slate-900 dark:text-white font-bold">{entry.authorName || 'Agent'}</strong>
                        </span>
                        {entry.motif && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                            Motif : <em className="text-slate-700 dark:text-slate-300 font-medium">"{entry.motif}"</em>
                          </span>
                        )}
                      </div>

                      {/* Changed fields diff */}
                      {entry.changes && entry.changes.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Champs modifiés :
                          </span>
                          <div className="grid grid-cols-1 gap-1">
                            {entry.changes.map((c, cIdx) => (
                              <div 
                                key={cIdx} 
                                className="text-xs font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap"
                              >
                                <span className="font-sans font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                  {c.field} :
                                </span>
                                {c.oldValue !== undefined && (
                                  <span className="text-rose-600 dark:text-rose-400 line-through bg-rose-50 dark:bg-rose-950/40 px-1 rounded truncate max-w-[200px]">
                                    {String(c.oldValue)}
                                  </span>
                                )}
                                {c.oldValue !== undefined && (
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded truncate max-w-[220px]">
                                  {String(c.newValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {entry.notes && (
                        <p className="text-xs text-slate-500 italic mt-1">
                          Note : {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
