import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { VouchersList } from './components/VouchersList';
import { VoucherDetailModal } from './components/VoucherDetailModal';
import { VoucherFormModal } from './components/VoucherFormModal';
import { VoucherPrintView } from './components/VoucherPrintView';
import { VoucherShareModal } from './components/VoucherShareModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { SettingsModal } from './components/SettingsModal';
import { DatabaseExplorerModal } from './components/DatabaseExplorerModal';
import { DatabaseView } from './components/DatabaseView';
import { TrackingLookup } from './components/TrackingLookup';
import { StatsDashboard } from './components/StatsDashboard';
import { HistoryStatementsView } from './components/HistoryStatementsView';
import { VoucherValidationModal } from './components/VoucherValidationModal';
import { CompanySettings, Voucher, VoucherStats, VoucherStatus, AgentProfile, DEFAULT_AGENTS } from './types';
import { api } from './services/api';
import { PlusCircle, Search, RefreshCw, AlertCircle, Sparkles, Package, BarChart3, History, Database, Plus } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'list' | 'tracking' | 'stats' | 'history' | 'database'>('list');
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
  const [isDatabaseExplorerOpen, setIsDatabaseExplorerOpen] = useState<boolean>(false);
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

  // Filter Vouchers Client-Side for instant snappiness
  const filteredVouchers = vouchers.filter(v => {
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
    try {
      await api.updateVoucher(id, { status: newStatus });
      showToast('Statut mis à jour');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleBatchUpdateStatus = async (ids: string[], newStatus: VoucherStatus) => {
    try {
      await api.batchUpdateStatus(ids, newStatus);
      showToast(`${ids.length} bon(s) mis à jour vers "${newStatus}"`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour par lot');
    }
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
    try {
      await api.validateVoucher(voucherId, { 
        isValidated, 
        validatedBy: currentAgent.name,
        validationNotes: notes 
      });
      showToast(`Bon validé avec succès par ${currentAgent.name} !`);
      await loadData();
      setIsValidationModalOpen(false);
      setValidationVoucher(null);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation du bon');
    }
  };

  const handleDirectValidate = async (voucherId: string) => {
    try {
      await api.validateVoucher(voucherId, {
        isValidated: true,
        validatedBy: currentAgent.name,
        validationNotes: 'Validé directement sans bon réel'
      });
      showToast(`Bon validé directement par ${currentAgent.name} !`);
      await loadData();
      if (detailVoucher && detailVoucher.id === voucherId) {
        setDetailVoucher(prev => prev ? {
          ...prev,
          isValidated: true,
          validatedBy: currentAgent.name,
          validatedByAgent: currentAgent.name,
          validatedAt: new Date().toISOString()
        } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation directe');
    }
  };

  const handleBatchValidate = async (voucherIds: string[]) => {
    try {
      await api.batchValidate(voucherIds, currentAgent.name);
      showToast(`${voucherIds.length} bon(s) validé(s) directement avec succès !`);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation groupée');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-orange-500/40 flex items-center gap-3 animate-slideUp text-sm font-semibold">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewVoucher={handleOpenCreateModal}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenExcelExport={() => setIsExcelModalOpen(true)}
        onOpenDatabaseExplorer={() => setIsDatabaseExplorerOpen(true)}
        settings={settings}
        syncStatus={syncStatus}
        onRefreshData={() => loadData()}
        vouchersCount={vouchers.length}
        currentAgent={currentAgent}
        onSelectAgent={setCurrentAgent}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8">
        
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

        {activeTab === 'database' && (
          <DatabaseView />
        )}

      </main>

      {/* Modern Mobile Bottom Navigation Bar (Fixed for thumb access on mobile & tablet < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'list' ? 'text-orange-500 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5" />
            {vouchers.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {vouchers.length > 99 ? '99+' : vouchers.length}
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase font-bold mt-1 tracking-wider">Bons</span>
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'tracking' ? 'text-orange-500 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold mt-1 tracking-wider">Suivi</span>
        </button>

        {/* Central Prominent Add Action */}
        <button
          onClick={handleOpenCreateModal}
          className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white p-3 rounded-full shadow-lg shadow-orange-500/40 active:scale-95 transition-all cursor-pointer"
          title="Créer un nouveau bon"
          aria-label="Nouveau bon"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'stats' ? 'text-orange-500 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold mt-1 tracking-wider">Stats</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'history' ? 'text-orange-500 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold mt-1 tracking-wider">Relevés</span>
        </button>
      </nav>

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
        onSaveSettings={handleSaveSettings}
        onResetDemo={handleResetDemo}
      />

      {/* 6. Database Explorer Modal (PostgreSQL Cloud SQL Viewer & Backup) */}
      <DatabaseExplorerModal
        isOpen={isDatabaseExplorerOpen}
        onClose={() => setIsDatabaseExplorerOpen(false)}
      />

    </div>
  );
}
