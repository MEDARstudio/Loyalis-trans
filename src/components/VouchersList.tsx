import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Printer, 
  Share2, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  FileSpreadsheet, 
  ArrowUpDown, 
  Calendar, 
  MapPin, 
  Package, 
  Scale, 
  Phone, 
  User, 
  CheckCircle2, 
  Clock, 
  Truck, 
  MoreVertical,
  QrCode,
  CheckSquare,
  Square,
  ChevronDown,
  Eye,
  DollarSign,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Lock,
  AlertTriangle,
  CloudUpload
} from 'lucide-react';
import { CompanySettings, Voucher, VoucherStatus, AgentProfile } from '../types';
import { formatCurrency, formatDate, getPaymentMethodLabel, getPaymentStatusInfo, getStatusBadge } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';
import { VoucherPhotoViewerModal } from './VoucherPhotoViewerModal';

interface VouchersListProps {
  vouchers: Voucher[];
  settings: CompanySettings;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  destinationFilter: string;
  setDestinationFilter: (dest: string) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenCreate: () => void;
  onOpenDetail: (voucher: Voucher) => void;
  onOpenPrint: (voucher: Voucher) => void;
  onOpenShare: (voucher: Voucher) => void;
  onOpenEdit: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: VoucherStatus) => void;
  onBatchUpdateStatus: (ids: string[], status: VoucherStatus) => void;
  onBatchDelete: (ids: string[]) => void;
  onOpenExcelExport: () => void;
  currentAgent?: AgentProfile;
  onOpenValidation?: (voucher: Voucher) => void;
  onDirectValidate?: (voucherId: string) => void;
  onBatchValidate?: (voucherIds: string[]) => void;
}

export const VouchersList: React.FC<VouchersListProps> = ({
  vouchers,
  settings,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  destinationFilter,
  setDestinationFilter,
  selectedIds,
  setSelectedIds,
  onOpenCreate,
  onOpenDetail,
  onOpenPrint,
  onOpenShare,
  onOpenEdit,
  onDeleteVoucher,
  onUpdateStatus,
  onBatchUpdateStatus,
  onBatchDelete,
  onOpenExcelExport,
  currentAgent,
  onOpenValidation,
  onDirectValidate,
  onBatchValidate
}) => {
  const currency = settings.currency || 'DH';
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id?: string; trackingNumber?: string; isBatch?: boolean; count?: number } | null>(null);
  const [selectedPhotoVoucher, setSelectedPhotoVoucher] = useState<Voucher | null>(null);

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.length === vouchers.length && vouchers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vouchers.map(v => v.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const isAllSelected = vouchers.length > 0 && selectedIds.length === vouchers.length;

  return (
    <div className="space-y-4">
      
      {/* Top Header & Action Bar in Bold Typography Theme */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        
        {/* Title Bar matching design HTML */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase text-slate-900 dark:text-white leading-none tracking-tight">
              Bons de Bagages
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1">
              Gestion et suivi des expéditions en temps réel • Loyalis Trans
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Quick Export Excel */}
            <button 
              onClick={onOpenExcelExport}
              className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden xs:inline">Export</span> <span>Excel</span>
            </button>

            {/* New Voucher Button */}
            <button
              onClick={onOpenCreate}
              className="px-3.5 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nouveau Bon</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par N° de suivi, expéditeur, destinataire, ville..."
              className="w-full pl-10 pr-16 py-2 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-orange-400 font-bold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-400 cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="EN_TRANSIT">En transit</option>
              <option value="ARRIVE_AGENCE">Arrivé en agence</option>
              <option value="LIVRE">Livré</option>
              <option value="ANNULE">Annulé</option>
            </select>

            {/* Destination Filter */}
            <select
              value={destinationFilter}
              onChange={e => setDestinationFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-400 cursor-pointer"
            >
              <option value="ALL">Toutes destinations</option>
              {settings.defaultAgencies?.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Operations Bar (shown when items are selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-200 dark:border-orange-900 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-900 dark:text-orange-200">
              <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-black">
                {selectedIds.length}
              </span>
              <span>bon(s) sélectionné(s)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Batch Change Status */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold">Statut :</span>
                {(['EN_ATTENTE', 'EN_TRANSIT', 'ARRIVE_AGENCE', 'LIVRE'] as VoucherStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => onBatchUpdateStatus(selectedIds, st)}
                    className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider hover:border-orange-400 transition-colors"
                  >
                    {getStatusBadge(st).label}
                  </button>
                ))}
              </div>

              {/* Batch Direct Validate (Amine) */}
              {currentAgent?.name === 'Amine' && onBatchValidate && (
                <button
                  type="button"
                  onClick={() => onBatchValidate(selectedIds)}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Valider directement tous les bons sélectionnés sans avoir à ouvrir le bon réel"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Valider Direct ({selectedIds.length})</span>
                </button>
              )}

              {/* Batch Export Excel */}
              <button
                onClick={onOpenExcelExport}
                className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exporter ({selectedIds.length})</span>
              </button>

              {/* Batch Delete */}
              <button
                id="btn-batch-delete"
                onClick={() => {
                  setDeleteTarget({ isBatch: true, count: selectedIds.length });
                }}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:underline px-1"
              >
                Désélectionner
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Vouchers Table (Desktop) & Cards (Mobile) */}
      {vouchers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-inner">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Aucun bon de bagages trouvé</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 font-medium">
              {searchQuery || statusFilter !== 'ALL' || destinationFilter !== 'ALL'
                ? 'Aucun résultat ne correspond à vos filtres de recherche. Essayez de réinitialiser vos critères.'
                : 'Commencez par créer votre premier bon de transport pour générer le code de suivi et le QR code.'}
            </p>
          </div>
          <button
            onClick={onOpenCreate}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-orange-500/30 inline-flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Créer un Nouveau Bon</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          {/* 1. MOBILE CARDS VIEW (Visible only on smartphones < md) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {/* Mobile Select All Header */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 font-black uppercase text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-orange-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'} ({vouchers.length})</span>
              </button>
              <span className="text-[11px] font-bold text-slate-500">
                {selectedIds.length > 0 ? `${selectedIds.length} sélectionné(s)` : `${vouchers.length} bons`}
              </span>
            </div>

            {/* Mobile Cards List */}
            {vouchers.map(v => {
              const statusInfo = getStatusBadge(v.status);
              const paymentInfo = getPaymentStatusInfo(
                v.paymentStatus || v.paymentMethod,
                v.advanceAmount || 0,
                v.totalPrice,
                v.remainingAmount
              );
              const isSelected = selectedIds.includes(v.id);
              const photoCount = (v.bonReelPhoto ? 1 : 0) + (v.casePhotos ? v.casePhotos.length : 0);

              return (
                <div 
                  key={v.id}
                  className={`p-4 transition-colors ${
                    isSelected ? 'bg-orange-50/60 dark:bg-orange-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-850'
                  }`}
                >
                  {/* Card Header: Checkbox + Tracking # + Status + Validation + Photo Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectOne(v.id);
                        }}
                        className="text-slate-400 hover:text-orange-600 p-1 -ml-1 cursor-pointer"
                        aria-label="Sélectionner"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => onOpenDetail(v)}
                        className="font-mono text-lg font-black text-orange-600 dark:text-orange-400 hover:underline tracking-tight text-left cursor-pointer"
                      >
                        #{v.trackingNumber}
                      </button>

                      {v.isOfflinePending && (
                        <span 
                          className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                          title="Créé hors-ligne. En attente de synchronisation réseau."
                        >
                          <CloudUpload className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                          <span>Hors-ligne</span>
                        </span>
                      )}

                      {photoCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhotoVoucher(v);
                          }}
                          className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1 text-[10px] font-black border border-amber-300 dark:border-amber-700 shadow-xs cursor-pointer"
                          title="Voir les photos du bon"
                        >
                          <Camera className="w-3 h-3 text-amber-600" />
                          <span>{photoCount}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Validation Status Badge / Action */}
                      {(v.isValidated || v.createdByAgent?.toLowerCase().includes('amine')) ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-300 dark:border-emerald-800" title={v.createdByAgent?.toLowerCase().includes('amine') ? "Créé par l'Admin (Amine) - Validé d'office sans besoin d'audit" : `Validé par ${v.validatedByAgent || v.validatedBy || 'Amine'}`}>
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Validé</span>
                        </span>
                      ) : (
                        currentAgent?.name === 'Amine' ? (
                          <div className="flex items-center gap-1">
                            {onDirectValidate && (
                              <button
                                type="button"
                                onClick={() => onDirectValidate(v.id)}
                                className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Valider directement ce bon"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Valider</span>
                              </button>
                            )}
                            {onOpenValidation && (
                              <button
                                type="button"
                                onClick={() => onOpenValidation(v)}
                                className="px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 hover:bg-orange-200 border border-orange-300 dark:border-orange-800 font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Auditer avec la photo du bon réel"
                              >
                                <ShieldCheck className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>À valider</span>
                          </span>
                        )
                      )}

                      {/* Status Dropdown Mobile */}
                      <select
                        value={v.status}
                        onChange={e => onUpdateStatus(v.id, e.target.value as VoucherStatus)}
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border cursor-pointer ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                      >
                        <option value="EN_ATTENTE">En attente</option>
                        <option value="EN_TRANSIT">En transit</option>
                        <option value="ARRIVE_AGENCE">Arrivé agence</option>
                        <option value="LIVRE">Livré</option>
                        <option value="ANNULE">Annulé</option>
                      </select>
                    </div>
                  </div>

                  {/* Route & Date Banner */}
                  <div 
                    onClick={() => onOpenDetail(v)} 
                    className="cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl mb-2.5 flex items-center justify-between text-xs min-w-0 overflow-hidden"
                  >
                    <div className="flex items-center gap-1 font-black text-slate-900 dark:text-white min-w-0 truncate">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{v.departureCity || 'Casablanca'}</span>
                      <span className="text-orange-500 shrink-0">➔</span>
                      <span className="text-orange-600 dark:text-orange-400 truncate">{v.recipient.destination || v.destinationCity}</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 pl-1">
                      {formatDate(v.date)}
                    </div>
                  </div>

                  {/* Sender & Recipient details with Tap-to-Call */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2.5 text-xs min-w-0" onClick={() => onOpenDetail(v)}>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 min-w-0 overflow-hidden">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 block truncate">Expéditeur</span>
                      <strong className="text-slate-900 dark:text-white truncate block font-bold text-[11px] sm:text-xs">{v.sender.name}</strong>
                      <a 
                        href={`tel:${v.sender.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-orange-600 dark:text-orange-400 font-mono text-[10px] sm:text-[11px] font-bold flex items-center gap-1 mt-0.5 hover:underline truncate"
                      >
                        <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                        <span className="truncate">{v.sender.phone}</span>
                      </a>
                    </div>

                    <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 min-w-0 overflow-hidden">
                      <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 block truncate">Destinataire</span>
                      <strong className="text-slate-900 dark:text-white truncate block font-bold text-[11px] sm:text-xs">{v.recipient.name}</strong>
                      <a 
                        href={`tel:${v.recipient.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] sm:text-[11px] font-bold flex items-center gap-1 mt-0.5 hover:underline truncate"
                      >
                        <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                        <span className="truncate">{v.recipient.phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Pricing, Weight & Payment Status */}
                  <div className="flex items-center justify-between bg-slate-100/70 dark:bg-slate-800/80 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl mb-2.5 text-xs min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                        <strong className="font-black text-slate-900 dark:text-white">{v.totalColis}</strong> colis
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px] sm:text-xs">
                        <strong className="font-black text-slate-900 dark:text-white">{v.totalWeightKg}</strong> kg
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        {formatCurrency(v.totalPrice, currency)}
                      </div>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${paymentInfo.badgeBg} ${paymentInfo.badgeText}`}>
                        {paymentInfo.type === 'PAYE' && 'Payé'}
                        {paymentInfo.type === 'NON_PAYE' && 'Non payé'}
                        {paymentInfo.type === 'AVANCE' && `Avance ${paymentInfo.advance} DH`}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Touch Buttons Mobile */}
                  <div className="grid grid-cols-5 gap-1 pt-0.5 w-full">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(v)}
                      className="py-2 px-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[8px] xs:text-[9px] sm:text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-slate-200 cursor-pointer min-w-0"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate w-full text-center">Détails</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPrint(v)}
                      className="py-2 px-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-[8px] xs:text-[9px] sm:text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-orange-100 cursor-pointer min-w-0"
                    >
                      <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate w-full text-center">Imprimer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenShare(v)}
                      className="py-2 px-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[8px] xs:text-[9px] sm:text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-emerald-100 cursor-pointer min-w-0"
                    >
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate w-full text-center">WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEdit(v)}
                      className="py-2 px-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[8px] xs:text-[9px] sm:text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-slate-200 cursor-pointer min-w-0"
                    >
                      <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate w-full text-center">Modifier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentAgent && !currentAgent.canDelete) {
                          alert("Action restreinte : Seul l'administrateur (Amine) a le droit de supprimer des bons.");
                          return;
                        }
                        setDeleteTarget({ id: v.id, trackingNumber: v.trackingNumber });
                      }}
                      className={`py-2 px-0.5 rounded-lg font-bold text-[8px] xs:text-[9px] sm:text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all min-w-0 ${
                        currentAgent && !currentAgent.canDelete
                          ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 cursor-pointer'
                      }`}
                      title={currentAgent && !currentAgent.canDelete ? "Suppression réservée à Amine (Admin)" : "Supprimer"}
                    >
                      {currentAgent && !currentAgent.canDelete ? <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> : <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      <span className="truncate w-full text-center">{currentAgent && !currentAgent.canDelete ? 'Bloqué' : 'Suppr.'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
                  <th className="py-3.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-orange-600"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider">
                    Tracking No.
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider">
                    Date & Agent
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider">
                    Expéditeur
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider">
                    Destination & Trajet
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider text-center">
                    Colis / Poids
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider text-right">
                    Prix & Paiement
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider text-center">
                    Statut Colis
                  </th>
                  <th className="pb-3 pt-3.5 px-3 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider text-center">
                    Audit Bon Réel
                  </th>
                  <th className="pb-3 pt-3.5 px-4 font-black uppercase text-[10px] text-slate-400 dark:text-slate-400 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                {vouchers.map(v => {
                  const statusInfo = getStatusBadge(v.status);
                  const paymentInfo = getPaymentStatusInfo(
                    v.paymentStatus || v.paymentMethod,
                    v.advanceAmount || 0,
                    v.totalPrice,
                    v.remainingAmount
                  );
                  const isSelected = selectedIds.includes(v.id);
                  const photoCount = (v.bonReelPhoto ? 1 : 0) + (v.casePhotos ? v.casePhotos.length : 0);

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-orange-50/70 dark:hover:bg-orange-950/20 transition-colors cursor-pointer ${
                        isSelected ? 'bg-orange-50/50 dark:bg-orange-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(v.id)}
                          className="text-slate-400 hover:text-orange-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Tracking Number */}
                      <td className="py-4 px-3" onClick={() => onOpenDetail(v)}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            className="font-mono text-orange-600 dark:text-orange-400 font-black hover:underline text-base tracking-tight"
                          >
                            #{v.trackingNumber}
                          </span>

                          {v.isOfflinePending && (
                            <span 
                              className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                              title="Créé hors-ligne. En attente de synchronisation réseau."
                            >
                              <CloudUpload className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                              <span>Hors-ligne</span>
                            </span>
                          )}
                          
                          {/* Photo badge if photo exists */}
                          {photoCount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhotoVoucher(v);
                              }}
                              className="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 flex items-center gap-1 text-[10px] font-black border border-amber-300 dark:border-amber-700/80 transition-all shadow-xs"
                              title={`Voir la photo du bon réel (${v.bonReelPhoto ? 'Bon papier' : ''}${v.bonReelPhoto && v.casePhotos?.length ? ' + ' : ''}${v.casePhotos?.length ? `${v.casePhotos.length} colis` : ''})`}
                            >
                              <Camera className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{photoCount}</span>
                            </button>
                          )}

                          <span className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title="Voir détails">
                            <Eye className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>

                      {/* Date & Agent */}
                      <td className="py-4 px-3 text-slate-500 dark:text-slate-400 text-xs" onClick={() => onOpenDetail(v)}>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">{formatDate(v.date)}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {v.time && <span className="text-[11px] text-slate-400">{v.time}</span>}
                          {v.createdByAgent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {v.createdByAgent}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="py-4 px-3" onClick={() => onOpenDetail(v)}>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {v.sender.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <span>{v.sender.phone}</span>
                          {v.sender.cin && <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px] text-slate-600 dark:text-slate-300 font-bold">[{v.sender.cin}]</span>}
                        </div>
                      </td>

                      {/* Recipient & Route */}
                      <td className="py-4 px-3" onClick={() => onOpenDetail(v)}>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {v.recipient.name}
                        </div>
                        <div className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{v.departureCity || 'Casablanca'} ➔ {v.recipient.destination}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{v.recipient.phone}</div>
                      </td>

                      {/* Colis & Weight */}
                      <td className="py-4 px-3 text-center" onClick={() => onOpenDetail(v)}>
                        <div className="inline-flex flex-col items-center">
                          <span className="font-black text-slate-900 dark:text-white text-sm">
                            {v.totalColis} <span className="text-xs font-normal text-slate-400">colis</span>
                          </span>
                          <span className="text-xs font-black text-slate-600 dark:text-slate-300 font-mono">
                            {v.totalWeightKg} kg
                          </span>
                        </div>
                      </td>

                      {/* Price & Payment Status */}
                      <td className="py-4 px-3 text-right" onClick={() => onOpenDetail(v)}>
                        <div className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                          {formatCurrency(v.totalPrice, currency)}
                        </div>
                        <div className="mt-0.5 flex justify-end">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${paymentInfo.badgeBg} ${paymentInfo.badgeText} ${paymentInfo.badgeBorder}`}>
                            {paymentInfo.type === 'PAYE' && 'Payé'}
                            {paymentInfo.type === 'NON_PAYE' && 'Non payé'}
                            {paymentInfo.type === 'AVANCE' && `Avance (${paymentInfo.advance} DH)`}
                          </span>
                        </div>
                        {paymentInfo.type === 'AVANCE' && paymentInfo.remaining > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                            Reste : {formatCurrency(paymentInfo.remaining, currency)}
                          </span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <select
                          value={v.status}
                          onChange={e => onUpdateStatus(v.id, e.target.value as VoucherStatus)}
                          className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          <option value="EN_ATTENTE">En attente</option>
                          <option value="EN_TRANSIT">En transit</option>
                          <option value="ARRIVE_AGENCE">Arrivé en agence</option>
                          <option value="LIVRE">Livré</option>
                          <option value="ANNULE">Annulé</option>
                        </select>
                      </td>

                      {/* Audit Bon Réel / Validation Column */}
                      <td className="py-4 px-3 text-center" onClick={e => e.stopPropagation()}>
                        {(v.isValidated || v.createdByAgent?.toLowerCase().includes('amine')) ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shadow-xs"
                            title={v.createdByAgent?.toLowerCase().includes('amine') ? "Bon créé par l'administrateur (Amine) - Validé d'office" : `Bon vérifié et validé par ${v.validatedByAgent || v.validatedBy || 'Amine'}${v.validatedAt ? ` le ${formatDate(v.validatedAt)}` : ''}`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Validé</span>
                          </span>
                        ) : currentAgent?.name === 'Amine' ? (
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            {onDirectValidate && (
                              <button
                                type="button"
                                onClick={() => onDirectValidate(v.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                                title="Valider immédiatement ce bon"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Valider</span>
                              </button>
                            )}
                            {onOpenValidation && (
                              <button
                                type="button"
                                onClick={() => onOpenValidation(v)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 text-slate-700 dark:text-slate-300 hover:text-orange-600 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                                title="Comparer avec la photo du bon réel manuscrit"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                                <span>Photo</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            title="En attente de vérification par l'administrateur (Amine)"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>En attente</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* View Detail */}
                          <button
                            onClick={() => onOpenDetail(v)}
                            title="Consulter tous les détails du bon"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Photos (Bon Réel / Colis) */}
                          <button
                            onClick={() => setSelectedPhotoVoucher(v)}
                            title={photoCount > 0 ? `Voir la photo du bon réel et ${photoCount} image(s)` : "Consulter / Voir les photos"}
                            className={`p-1.5 rounded-lg transition-colors relative ${
                              photoCount > 0
                                ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                          >
                            <Camera className="w-4 h-4" />
                            {photoCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
                                {photoCount}
                              </span>
                            )}
                          </button>

                          {/* Print / View */}
                          <button
                            onClick={() => onOpenPrint(v)}
                            title="Imprimer / Télécharger le bon (PDF/Image)"
                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Share (WhatsApp, etc.) */}
                          <button
                            onClick={() => onOpenShare(v)}
                            title="Partager par WhatsApp, SMS, Email"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onOpenEdit(v)}
                            title="Modifier ce bon"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {currentAgent && !currentAgent.canDelete ? (
                            <button
                              type="button"
                              onClick={() => {
                                alert("Action restreinte : Seul l'administrateur (Amine) est autorisé à supprimer des bons. Sofiane (Agent) ne peut pas supprimer.");
                              }}
                              title="Suppression bloquée (Seul Amine peut supprimer)"
                              className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-400 transition-colors cursor-not-allowed"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              id={`btn-delete-${v.id}`}
                              onClick={() => {
                                setDeleteTarget({ id: v.id, trackingNumber: v.trackingNumber });
                              }}
                              title="Supprimer ce bon"
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-3">
            <div className="font-bold uppercase tracking-wider text-[11px]">
              Affichage de <strong className="text-slate-900 dark:text-white font-black">{vouchers.length}</strong> bon(s) de bagages
            </div>
            <div className="flex items-center gap-4 font-bold uppercase tracking-wider text-[11px]">
              <span>Total Colis : <strong className="text-slate-900 dark:text-white font-black">{vouchers.reduce((s, v) => s + v.totalColis, 0)}</strong></span>
              <span>Poids Total : <strong className="text-slate-900 dark:text-white font-black">{Math.round(vouchers.reduce((s, v) => s + v.totalWeightKg, 0) * 100) / 100} kg</strong></span>
              <span>Montant : <strong className="text-orange-600 dark:text-orange-400 font-mono text-sm font-black">{formatCurrency(vouchers.reduce((s, v) => s + v.totalPrice, 0), currency)}</strong></span>
            </div>
          </div>

        </div>
      )}

      {/* Confirmation Modal for Single and Batch Deletions */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={deleteTarget?.isBatch ? 'Supprimer les bons sélectionnés' : 'Supprimer le bon de bagages'}
        message={
          deleteTarget?.isBatch
            ? `Êtes-vous sûr de vouloir supprimer définitivement les ${deleteTarget.count} bons sélectionnés ? Cette action est irréversible.`
            : `Êtes-vous sûr de vouloir supprimer définitivement le bon N° ${deleteTarget?.trackingNumber || ''} ? Toutes les données associées seront supprimées.`
        }
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTarget?.isBatch) {
            onBatchDelete(selectedIds);
          } else if (deleteTarget?.id) {
            onDeleteVoucher(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {/* High-Definition Photo Viewer Modal from List */}
      {selectedPhotoVoucher && (
        <VoucherPhotoViewerModal
          isOpen={selectedPhotoVoucher !== null}
          onClose={() => setSelectedPhotoVoucher(null)}
          voucher={selectedPhotoVoucher}
          initialTab={selectedPhotoVoucher.bonReelPhoto ? 'BON_REEL' : 'PARCEL_CASE'}
        />
      )}
    </div>
  );
};
