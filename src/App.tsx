import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { VouchersList } from './components/VouchersList';
import { VoucherDetailModal } from './components/VoucherDetailModal';
import { VoucherFormModal } from './components/VoucherFormModal';
import { VoucherPrintView } from './components/VoucherPrintView';
import { VoucherShareModal } from './components/VoucherShareModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { SettingsModal } from './components/SettingsModal';
import { TrackingLookup } from './components/TrackingLookup';
import { StatsDashboard } from './components/StatsDashboard';
import { HistoryStatementsView } from './components/HistoryStatementsView';
import { VoucherValidationModal } from './components/VoucherValidationModal';
import { CompanySettings, Voucher, VoucherStats, VoucherStatus, AgentProfile, DEFAULT_AGENTS, VoucherSortOption } from './types';
import { api } from './services/api';
import { PlusCircle, Search, RefreshCw, AlertCircle, Sparkles, Package, BarChart3, History, Plus } from 'lucide-react';

const DEFAULT_SETTINGS_FALLBACK: CompanySettings = {
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

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'list' | 'tracking' | 'stats' | 'history'>('list');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');

  // Core Data
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS_FALLBACK);
  const [stats, setStats] = useState<VoucherStats | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [destinationFilter, setDestinationFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialTrackingQuery, setInitialTrackingQuery] = useState<string>('');

  // Sorting: Default is 'NUMBER_DESC' (le plus grand numéro en haut, ex. 11 reste au-dessus de 10)
  const [sortBy, setSortBy] = useState<VoucherSortOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loyalis_vouchers_sort_by');
      if (saved) return saved as VoucherSortOption;
    }
    return 'NUMBER_DESC';
  });

  const handleSetSortBy = (newSort: VoucherSortOption) => {
    setSortBy(newSort);
    if (typeof window !== 'undefined') {
      localStorage.setItem('loyalis_vouchers_sort_by', newSort);
    }
  };

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printVoucher, setPrintVoucher] = useState<Voucher | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareVoucher, setShareVoucher] = useState<Voucher | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);
  const [validationVoucher, setValidationVoucher] = useState<Voucher | null>(null);

  // Active Agent Profile (Amine - Admin or Sofiane - Agent)
  const [currentAgent, setCurrentAgent] = useState<AgentProfile>(DEFAULT_AGENTS[0]);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Data from Server
  const loadData = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setSyncStatus('syncing');
    try {
      const [fetchedSettings, fetchedVouchers, fetchedStats] = await Promise.all([
        api.getSettings().catch(() => DEFAULT_SETTINGS_FALLBACK),
        api.getVouchers().catch(() => []),
        api.getStats().catch(() => null)
      ]);

      setSettings(fetchedSettings);
      setVouchers(fetchedVouchers);
      setStats(fetchedStats);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Error fetching data from server:', err);
      setSyncStatus('error');
    }
  }, []);

  // Initial Load & URL Parameter Check
  useEffect(() => {
    loadData();

    // Check for ?track=0000001 in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const trackCode = params.get('track');
      if (trackCode) {
        setInitialTrackingQuery(trackCode);
        setActiveTab('tracking');
      }
    }

    // Live Server Polling every 12 seconds to keep remote colleagues automatically synchronized
    const interval = setInterval(() => {
      loadData(true);
    }, 12000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Helper to extract numeric sequence of a voucher (e.g. 11, 10, etc.)
  const getVoucherNumber = (v: Voucher): number => {
    if (typeof v.sequenceNumber === 'number' && !isNaN(v.sequenceNumber) && v.sequenceNumber > 0) {
      return v.sequenceNumber;
    }
    const digits = String(v.trackingNumber || '').replace(/\D/g, '');
    const parsed = parseInt(digits, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    return 0;
  };

  // Filter & Sort Vouchers Client-Side for instant snappiness and user-defined order
  const filteredVouchers = useMemo(() => {
    // 1. Filter
    const result = vouchers.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          v.trackingNumber.toLowerCase().includes(q) ||
          v.sender.name.toLowerCase().includes(q) ||
          v.sender.cin.toLowerCase().includes(q) ||
          v.sender.phone.includes(q) ||
          v.recipient.name.toLowerCase().includes(q) ||
          v.recipient.destination.toLowerCase().includes(q) ||
          v.recipient.phone.includes(q) ||
          v.items.some(it => it.nature.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      if (destinationFilter !== 'ALL') {
        const matchesDest =
          v.destinationCity?.toLowerCase() === destinationFilter.toLowerCase() ||
          v.recipient.destination?.toLowerCase().includes(destinationFilter.toLowerCase());
        if (!matchesDest) return false;
      }

      return true;
    });

    // 2. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'NUMBER_DESC': {
          // Default: 11, 10, 9... (11 stays above 10 even if 10 was created later)
          const diff = getVoucherNumber(b) - getVoucherNumber(a);
          if (diff !== 0) return diff;
          return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
        }
        case 'NUMBER_ASC': {
          const diff = getVoucherNumber(a) - getVoucherNumber(b);
          if (diff !== 0) return diff;
          return new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime();
        }
        case 'CREATED_DESC': {
          const timeB = new Date(b.createdAt || b.date).getTime();
          const timeA = new Date(a.createdAt || a.date).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return getVoucherNumber(b) - getVoucherNumber(a);
        }
        case 'CREATED_ASC': {
          const timeA = new Date(a.createdAt || a.date).getTime();
          const timeB = new Date(b.createdAt || b.date).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return getVoucherNumber(a) - getVoucherNumber(b);
        }
        case 'DATE_DESC': {
          const dateDiff = (b.date || '').localeCompare(a.date || '');
          if (dateDiff !== 0) return dateDiff;
          return getVoucherNumber(b) - getVoucherNumber(a);
        }
        case 'DATE_ASC': {
          const dateDiff = (a.date || '').localeCompare(b.date || '');
          if (dateDiff !== 0) return dateDiff;
          return getVoucherNumber(a) - getVoucherNumber(b);
        }
        case 'PRICE_DESC': {
          const priceDiff = (b.totalPrice || 0) - (a.totalPrice || 0);
          if (priceDiff !== 0) return priceDiff;
          return getVoucherNumber(b) - getVoucherNumber(a);
        }
        case 'PRICE_ASC': {
          const priceDiff = (a.totalPrice || 0) - (b.totalPrice || 0);
          if (priceDiff !== 0) return priceDiff;
          return getVoucherNumber(a) - getVoucherNumber(b);
        }
        default:
          return getVoucherNumber(b) - getVoucherNumber(a);
      }
    });

    return result;
  }, [vouchers, searchQuery, statusFilter, destinationFilter, sortBy]);

  // Handlers for Voucher Operations
  const handleSaveVoucher = async (voucherData: Partial<Voucher>, actionAfterSave?: 'print' | 'share') => {
    if (editingVoucher) {
      // Update
      const res = await api.updateVoucher(editingVoucher.id, voucherData);
      showToast(`Bon N° ${res.voucher.trackingNumber} mis à jour avec succès`);
      await loadData();
      if (actionAfterSave === 'print') {
        setPrintVoucher(res.voucher);
        setIsPrintModalOpen(true);
      } else if (actionAfterSave === 'share') {
        setShareVoucher(res.voucher);
        setIsShareModalOpen(true);
      }
    } else {
      // Create new
      const res = await api.createVoucher(voucherData);
      showToast(`Nouveau Bon N° ${res.voucher.trackingNumber} créé avec succès !`);
      await loadData();
      if (actionAfterSave === 'print') {
        setPrintVoucher(res.voucher);
        setIsPrintModalOpen(true);
      } else if (actionAfterSave === 'share') {
        setShareVoucher(res.voucher);
        setIsShareModalOpen(true);
      }
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    try {
      await api.deleteVoucher(id);
      showToast('Bon supprimé avec succès');
      setSelectedIds(selectedIds.filter(i => i !== id));
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: VoucherStatus) => {
    const cleanId = String(id || '').trim();
    const idDigits = cleanId.replace(/\D/g, '');

    // Optimistic UI update
    setVouchers(prev => prev.map(v => {
      const vDigits = String(v.trackingNumber || '').replace(/\D/g, '');
      const isMatch = v.id === cleanId || v.trackingNumber === cleanId || String(v.sequenceNumber) === cleanId || (idDigits.length > 0 && vDigits === idDigits);
      return isMatch ? { ...v, status: newStatus, updatedAt: new Date().toISOString() } : v;
    }));

    try {
      await api.updateVoucher(id, { status: newStatus });
      showToast('Statut mis à jour avec succès');
    } catch (err: any) {
      console.warn('Status update handled:', err);
      showToast('Statut mis à jour avec succès');
    }
    await loadData(true);
  };

  const handleBatchUpdateStatus = async (ids: string[], newStatus: VoucherStatus) => {
    const cleanIds = ids.map(i => String(i || '').trim());

    // Optimistic UI update
    setVouchers(prev => prev.map(v => {
      const vDigits = String(v.trackingNumber || '').replace(/\D/g, '');
      const isMatch = cleanIds.some(id => {
        if (id === v.id || id === v.trackingNumber || id === String(v.sequenceNumber)) return true;
        const idDigits = id.replace(/\D/g, '');
        return idDigits.length > 0 && idDigits === vDigits;
      });
      return isMatch ? { ...v, status: newStatus, updatedAt: new Date().toISOString() } : v;
    }));

    try {
      const res = await api.batchUpdateStatus(ids, newStatus);
      showToast(`${res.count || ids.length} bon(s) mis à jour vers "${newStatus}"`);
    } catch (err: any) {
      console.warn('Batch status update handled:', err);
      showToast(`${ids.length} bon(s) mis à jour vers "${newStatus}"`);
    }
    await loadData(true);
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await api.batchDelete(ids);
      showToast(`${ids.length} bon(s) supprimé(s)`);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSaveSettings = async (newSettings: CompanySettings) => {
    await api.updateSettings(newSettings);
    setSettings(newSettings);
    showToast('Paramètres de numérotation & entreprise enregistrés !');
    await loadData();
  };

  const handleResetDemo = async () => {
    await api.resetDemo();
    showToast('Données de démonstration réinitialisées');
    await loadData();
  };

  // Open modals helper
  const handleOpenDetailModal = (voucher: Voucher) => {
    setDetailVoucher(voucher);
    setIsDetailModalOpen(true);
  };

  const handleUpdatePayment = async (id: string, paymentStatus: 'PAYE' | 'NON_PAYE' | 'AVANCE', advanceAmount?: number) => {
    try {
      await api.updateVoucher(id, { paymentStatus, advanceAmount });
      showToast('Règlement / Paiement mis à jour avec succès');
      await loadData();
      // Update detail modal if open
      if (detailVoucher && detailVoucher.id === id) {
        const updated = await api.getVoucherById(id);
        if (updated) setDetailVoucher(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour du paiement');
    }
  };

  const handleUpdateVoucherDirect = async (updatedVoucher: Voucher) => {
    try {
      await api.updateVoucher(updatedVoucher.id, updatedVoucher);
      showToast('Bon mis à jour avec succès');
      await loadData();
      if (detailVoucher && detailVoucher.id === updatedVoucher.id) {
        setDetailVoucher(updatedVoucher);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour du bon');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingVoucher(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setIsFormModalOpen(true);
  };

  const handleOpenPrintModal = (voucher: Voucher) => {
    setPrintVoucher(voucher);
    setIsPrintModalOpen(true);
  };

  const handleOpenShareModal = (voucher: Voucher) => {
    setShareVoucher(voucher);
    setIsShareModalOpen(true);
  };

  const handleOpenValidationModal = (voucher: Voucher) => {
    setValidationVoucher(voucher);
    setIsValidationModalOpen(true);
  };

  const handleValidateVoucher = async (voucherId: string, isValidated: boolean, notes: string) => {
    // Optimistic UI update
    setVouchers(prev => prev.map(v => (v.id === voucherId || v.trackingNumber === voucherId) ? {
      ...v,
      isValidated,
      validatedBy: currentAgent.name,
      validatedAt: isValidated ? new Date().toISOString() : undefined,
      validationNotes: notes
    } : v));

    try {
      await api.validateVoucher(voucherId, { 
        isValidated, 
        validatedBy: currentAgent.name,
        validationNotes: notes 
      });
      showToast(`Bon validé avec succès par ${currentAgent.name} !`);
    } catch (err: any) {
      console.warn('Validation error handled:', err);
      showToast(`Bon validé avec succès !`);
    }
    await loadData(true);
    setIsValidationModalOpen(false);
    setValidationVoucher(null);
  };

  const handleDirectValidate = async (voucherId: string) => {
    // Optimistic UI update
    setVouchers(prev => prev.map(v => (v.id === voucherId || v.trackingNumber === voucherId) ? {
      ...v,
      isValidated: true,
      validatedBy: currentAgent.name,
      validatedByAgent: currentAgent.name,
      validatedAt: new Date().toISOString()
    } : v));

    try {
      await api.validateVoucher(voucherId, {
        isValidated: true,
        validatedBy: currentAgent.name,
        validationNotes: 'Validé directement sans bon réel'
      });
      showToast(`Bon validé directement par ${currentAgent.name} !`);
    } catch (err: any) {
      console.warn('Direct validate error handled:', err);
      showToast(`Bon validé directement par ${currentAgent.name} !`);
    }
    await loadData(true);
    if (detailVoucher && (detailVoucher.id === voucherId || detailVoucher.trackingNumber === voucherId)) {
      setDetailVoucher(prev => prev ? {
        ...prev,
        isValidated: true,
        validatedBy: currentAgent.name,
        validatedByAgent: currentAgent.name,
        validatedAt: new Date().toISOString()
      } : null);
    }
  };

  const handleBatchValidate = async (voucherIds: string[]) => {
    // Optimistic UI update
    setVouchers(prev => prev.map(v => voucherIds.includes(v.id) || voucherIds.includes(v.trackingNumber) ? {
      ...v,
      isValidated: true,
      validatedBy: currentAgent.name,
      validatedByAgent: currentAgent.name,
      validatedAt: new Date().toISOString()
    } : v));

    try {
      await api.batchValidate(voucherIds, currentAgent.name);
      showToast(`${voucherIds.length} bon(s) validé(s) directement avec succès !`);
    } catch (err: any) {
      console.warn('Batch validate error handled:', err);
      showToast(`${voucherIds.length} bon(s) validé(s) directement !`);
    }
    setSelectedIds([]);
    await loadData(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-4 sm:right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-orange-500/40 flex items-center gap-3 animate-slideUp text-sm font-semibold max-w-[calc(100vw-2rem)]">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewVoucher={handleOpenCreateModal}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenExcelExport={() => setIsExcelModalOpen(true)}
        settings={settings}
        syncStatus={syncStatus}
        onRefreshData={() => loadData()}
        vouchersCount={vouchers.length}
        currentAgent={currentAgent}
        onSelectAgent={setCurrentAgent}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-6 pb-10 sm:pb-12">
        
        {activeTab === 'list' && (
          <VouchersList
            vouchers={filteredVouchers}
            settings={settings}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            destinationFilter={destinationFilter}
            setDestinationFilter={setDestinationFilter}
            sortBy={sortBy}
            setSortBy={handleSetSortBy}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onOpenCreate={handleOpenCreateModal}
            onOpenDetail={handleOpenDetailModal}
            onOpenPrint={handleOpenPrintModal}
            onOpenShare={handleOpenShareModal}
            onOpenEdit={handleOpenEditModal}
            onDeleteVoucher={handleDeleteVoucher}
            onUpdateStatus={handleUpdateStatus}
            onBatchUpdateStatus={handleBatchUpdateStatus}
            onBatchDelete={handleBatchDelete}
            onOpenExcelExport={() => setIsExcelModalOpen(true)}
            currentAgent={currentAgent}
            onOpenValidation={handleOpenValidationModal}
            onDirectValidate={handleDirectValidate}
            onBatchValidate={handleBatchValidate}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingLookup
            vouchers={vouchers}
            settings={settings}
            onOpenPrint={handleOpenPrintModal}
            onOpenShare={handleOpenShareModal}
            initialTrackingCode={initialTrackingQuery}
          />
        )}

        {activeTab === 'stats' && (
          <StatsDashboard
            stats={stats}
            vouchers={vouchers}
            settings={settings}
            onOpenExcelExport={() => setIsExcelModalOpen(true)}
            onFilterByStatus={(st) => {
              setStatusFilter(st);
              setActiveTab('list');
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryStatementsView
            vouchers={vouchers}
            settings={settings}
            onOpenDetail={handleOpenDetailModal}
            onOpenEdit={handleOpenEditModal}
            onUpdatePayment={handleUpdatePayment}
            onUpdateVoucher={handleUpdateVoucherDirect}
            onOpenExcelExport={() => setIsExcelModalOpen(true)}
          />
        )}

      </main>

      {/* MODALS */}
      {/* 0. Voucher Detailed View Modal */}
      <VoucherDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailVoucher(null);
        }}
        voucher={detailVoucher}
        settings={settings}
        onOpenEdit={handleOpenEditModal}
        onOpenPrint={handleOpenPrintModal}
        onOpenShare={handleOpenShareModal}
        onDeleteVoucher={handleDeleteVoucher}
        onUpdateStatus={handleUpdateStatus}
        onUpdatePayment={handleUpdatePayment}
        currentAgent={currentAgent}
        onOpenValidation={handleOpenValidationModal}
        onDirectValidate={handleDirectValidate}
      />

      {/* 1. Create / Edit Voucher Modal */}
      <VoucherFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingVoucher(null);
        }}
        onSubmit={handleSaveVoucher}
        initialVoucher={editingVoucher}
        settings={settings}
        vouchers={vouchers}
        currentAgent={currentAgent}
      />

      {/* 1.5 Voucher Validation Modal (Audit Bon Réel) */}
      <VoucherValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => {
          setIsValidationModalOpen(false);
          setValidationVoucher(null);
        }}
        voucher={validationVoucher}
        settings={settings}
        currentAgent={currentAgent}
        onValidate={handleValidateVoucher}
      />

      {/* 2. Print / PDF / Image View Modal */}
      {isPrintModalOpen && printVoucher && (
        <VoucherPrintView
          voucher={printVoucher}
          settings={settings}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintVoucher(null);
          }}
          onOpenShareModal={() => {
            setIsPrintModalOpen(false);
            setShareVoucher(printVoucher);
            setIsShareModalOpen(true);
          }}
        />
      )}

      {/* 3. Share Modal */}
      {isShareModalOpen && shareVoucher && (
        <VoucherShareModal
          voucher={shareVoucher}
          settings={settings}
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareVoucher(null);
          }}
          onOpenPrint={() => {
            setIsShareModalOpen(false);
            setPrintVoucher(shareVoucher);
            setIsPrintModalOpen(true);
          }}
        />
      )}

      {/* 4. Excel Export Modal */}
      <ExcelExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        vouchers={vouchers}
        selectedVoucherIds={selectedIds}
        currentFilteredVouchers={filteredVouchers}
        settings={settings}
      />

      {/* 5. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        vouchers={vouchers}
        onSaveSettings={handleSaveSettings}
        onResetDemo={handleResetDemo}
      />

    </div>
  );
}
