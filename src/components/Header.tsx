import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  PlusCircle, 
  Search, 
  FileSpreadsheet, 
  Settings, 
  BarChart3, 
  Truck, 
  RefreshCw,
  Database,
  Menu,
  X,
  History,
  Phone,
  ChevronRight,
  ChevronDown,
  User,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { CompanySettings, AgentProfile, DEFAULT_AGENTS } from '../types';

interface HeaderProps {
  activeTab: 'list' | 'tracking' | 'stats' | 'history';
  setActiveTab: (tab: 'list' | 'tracking' | 'stats' | 'history') => void;
  onOpenNewVoucher: () => void;
  onOpenSettings: () => void;
  onOpenExcelExport: () => void;
  settings: CompanySettings;
  syncStatus: 'synced' | 'syncing' | 'error';
  onRefreshData: () => void;
  vouchersCount: number;
  currentAgent: AgentProfile;
  onSelectAgent: (agent: AgentProfile) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewVoucher,
  onOpenSettings,
  onOpenExcelExport,
  settings,
  syncStatus,
  onRefreshData,
  vouchersCount,
  currentAgent,
  onSelectAgent
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState<boolean>(false);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  // Close agent dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
        setIsAgentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleTabSelect = (tab: 'list' | 'tracking' | 'stats' | 'history') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-slate-900 border-b border-slate-800 text-white shadow-lg">
        {/* Top Micro-Bar for Status & Info */}
        <div className="bg-slate-950 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className="flex items-center gap-1 text-orange-400 font-bold uppercase tracking-wider text-[10px] sm:text-[11px] truncate">
                <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{settings.tagline || 'Transport & Messagerie Express'}</span>
              </span>
              <span className="hidden md:inline text-slate-700">|</span>
              <span className="hidden md:flex items-center gap-1 text-slate-300 text-[11px] truncate">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">Tél : <strong className="text-white font-mono">{settings.phone1}</strong>{settings.phone2 ? ` / ${settings.phone2}` : ''}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Live Cloud DB Sync Indicator (Opens settings) */}
              <button 
                id="btn-header-db-status"
                onClick={onOpenSettings}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-orange-500/50 text-slate-300 transition-all cursor-pointer text-[9px] sm:text-[10px] font-bold"
                title="Statut de connexion - Ouvrir les paramètres"
              >
                {syncStatus === 'synced' && (
                  <>
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400">Supabase Connecté</span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 text-orange-400 animate-spin shrink-0" />
                    <span className="text-[9px] sm:text-[10px] font-bold text-orange-400">Sync...</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-400">Local (Non connecté)</span>
                  </>
                )}
              </button>

              {/* Refresh Button */}
              <button
                id="btn-header-refresh"
                onClick={onRefreshData}
                title="Actualiser les données"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Actualiser"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Navigation Header */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-1.5 sm:gap-3">
          
          {/* Brand Logo & Title */}
          <div 
            id="header-brand-logo"
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none shrink-0" 
            onClick={() => handleTabSelect('list')}
          >
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 flex items-center justify-center p-0.5 shrink-0">
              <img 
                src="/logo.png" 
                alt="Loyalis Trans Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = '<span class="font-black text-orange-500 text-base">LT</span>';
                  }
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black tracking-tight uppercase text-white leading-none truncate">
                Loyalis <span className="text-orange-500">Trans</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 hidden sm:block mt-0.5 truncate">
                Gestion des expéditions & fret
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation Tabs (Visible on screens >= 768px) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              id="nav-tab-vouchers"
              onClick={() => handleTabSelect('list')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Bons</span>
              {vouchersCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  activeTab === 'list' ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {vouchersCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-tracking"
              onClick={() => handleTabSelect('tracking')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'tracking'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Suivi</span>
            </button>

            <button
              id="nav-tab-stats"
              onClick={() => handleTabSelect('stats')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => handleTabSelect('history')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Relevés</span>
            </button>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Agent Profile Selector Dropdown */}
            <div className="relative" ref={agentMenuRef}>
              <button
                id="btn-agent-profile-switcher"
                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer ${
                  currentAgent?.role === 'ADMIN'
                    ? 'bg-orange-950/40 border-orange-600/60 text-orange-200 hover:bg-orange-950/70'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
                title="Changer de profil d'agent"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  currentAgent?.role === 'ADMIN' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {currentAgent?.name?.charAt(0) || 'A'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold leading-tight flex items-center gap-1">
                    <span>{currentAgent?.name || 'Amine'}</span>
                    <span className={`text-[9px] font-black px-1 rounded uppercase ${
                      currentAgent?.role === 'ADMIN' ? 'bg-orange-500/30 text-orange-300' : 'bg-blue-500/30 text-blue-300'
                    }`}>
                      {currentAgent?.role === 'ADMIN' ? 'Admin' : 'Agent'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {currentAgent?.agencyCity || 'Agence'}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {/* Agent Menu Popup */}
              {isAgentMenuOpen && (
                <div 
                  id="agent-dropdown-menu"
                  className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 text-slate-200"
                >
                  <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Sélectionner un Profil Utilisateur
                  </div>
                  {DEFAULT_AGENTS.map(agent => {
                    const isActive = currentAgent?.id === agent.id;
                    return (
                      <button
                        key={agent.id}
                        id={`agent-option-${agent.id}`}
                        type="button"
                        onClick={() => {
                          onSelectAgent(agent);
                          setIsAgentMenuOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl flex items-start gap-2.5 transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-orange-500 text-white shadow-md' 
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          isActive ? 'bg-white text-orange-600' : agent.role === 'ADMIN' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {agent.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs">{agent.name}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                              isActive 
                                ? 'bg-orange-700 text-white' 
                                : agent.role === 'ADMIN' ? 'bg-orange-950 text-orange-300' : 'bg-blue-950 text-blue-300'
                            }`}>
                              {agent.role === 'ADMIN' ? 'Admin' : 'Agent'}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-orange-100' : 'text-slate-400'}`}>
                            {agent.name === 'Amine' 
                              ? 'Admin (Validation & Suppression)' 
                              : 'Agence Casa (Saisie des bons)'}
                          </p>
                          <div className={`text-[10px] mt-0.5 font-bold ${isActive ? 'text-white' : 'text-orange-400'}`}>
                            Ville : {agent.agencyCity}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Quick Action Buttons */}
            <button
              id="btn-header-export-excel"
              onClick={onOpenExcelExport}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer"
              title="Exporter en Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline">Export</span>
            </button>

            <button
              id="btn-header-settings"
              onClick={onOpenSettings}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer"
              title="Paramètres de l'entreprise"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="hidden xl:inline">Paramètres</span>
            </button>

            {/* Primary Action Button "+ Nouveau Bon" */}
            <button
              id="btn-header-new-voucher"
              onClick={onOpenNewVoucher}
              className="flex items-center gap-1 px-2.5 sm:px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Nouveau Bon</span>
              <span className="sm:hidden">Nouveau</span>
            </button>

            {/* Mobile Menu Button for Settings & Extra Options */}
            <button
              id="btn-header-mobile-menu"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white active:bg-slate-750 transition-colors cursor-pointer flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 shrink-0"
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

          </div>

        </div>

        {/* Mobile Sub-Header Navigation Bar (Top-integrated, non-obtrusive, leaves bottom 100% free) */}
        <div className="md:hidden border-t border-slate-800/80 bg-slate-950/80 px-2 py-1.5 flex items-center justify-around gap-1">
          <button
            id="mobile-nav-vouchers"
            onClick={() => handleTabSelect('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Bons</span>
            {vouchersCount > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                activeTab === 'list' ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {vouchersCount}
              </span>
            )}
          </button>

          <button
            id="mobile-nav-tracking"
            onClick={() => handleTabSelect('tracking')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Suivi</span>
          </button>

          <button
            id="mobile-nav-stats"
            onClick={() => handleTabSelect('stats')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Stats</span>
          </button>

          <button
            id="mobile-nav-history"
            onClick={() => handleTabSelect('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Relevés</span>
          </button>
        </div>
      </header>

      {/* Structured Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/80 animate-fadeIn">
          {/* Backdrop dismiss */}
          <div 
            className="flex-1 w-full"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Box */}
          <div className="bg-slate-900 border-t-2 border-orange-500 rounded-t-3xl shadow-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-slideUp">
            
            {/* Drawer Top Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center p-0.5 shrink-0">
                  <img 
                    src="/logo.png" 
                    alt="Loyalis Trans Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<span class="font-black text-orange-500 text-sm">LT</span>';
                      }
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase text-white tracking-wide">
                    Loyalis <span className="text-orange-500">Trans</span>
                  </h2>
                  <p className="text-xs text-slate-400">Menu Principal & Modules</p>
                </div>
              </div>

              <button
                id="btn-close-mobile-menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white active:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation List */}
            <div className="p-4 overflow-y-auto space-y-4">
              
              {/* Navigation Items */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Modules
                </p>

                <div className="space-y-1.5">
                  <button
                    id="mobile-nav-vouchers"
                    onClick={() => handleTabSelect('list')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      activeTab === 'list'
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${activeTab === 'list' ? 'bg-orange-600' : 'bg-slate-900 text-orange-400'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Bons d'Expédition</div>
                        <div className={`text-xs ${activeTab === 'list' ? 'text-orange-100' : 'text-slate-400'}`}>
                          Registre et suivi des colis
                        </div>
                      </div>
                    </div>
                    {vouchersCount > 0 && (
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        activeTab === 'list' ? 'bg-orange-700 text-white' : 'bg-slate-900 text-orange-400'
                      }`}>
                        {vouchersCount}
                      </span>
                    )}
                  </button>

                  <button
                    id="mobile-nav-tracking"
                    onClick={() => handleTabSelect('tracking')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      activeTab === 'tracking'
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${activeTab === 'tracking' ? 'bg-orange-600' : 'bg-slate-900 text-orange-400'}`}>
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Suivi Rapide</div>
                        <div className={`text-xs ${activeTab === 'tracking' ? 'text-orange-100' : 'text-slate-400'}`}>
                          Recherche par N° de bon ou destinataire
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    id="mobile-nav-stats"
                    onClick={() => handleTabSelect('stats')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      activeTab === 'stats'
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${activeTab === 'stats' ? 'bg-orange-600' : 'bg-slate-900 text-orange-400'}`}>
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Statistiques & Analyse</div>
                        <div className={`text-xs ${activeTab === 'stats' ? 'text-orange-100' : 'text-slate-400'}`}>
                          Chiffre d'affaires, poids et volumes
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    id="mobile-nav-history"
                    onClick={() => handleTabSelect('history')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-orange-500 text-white font-bold'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${activeTab === 'history' ? 'bg-orange-600' : 'bg-slate-900 text-orange-400'}`}>
                        <History className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Historique & Relevés</div>
                        <div className={`text-xs ${activeTab === 'history' ? 'text-orange-100' : 'text-slate-400'}`}>
                          Rapports mensuels & sous-traitance
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Secondary Options */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Actions & Paramètres
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="mobile-action-excel"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenExcelExport();
                    }}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 mb-1.5" />
                    <div className="text-xs font-bold text-white">Export Excel</div>
                    <div className="text-[10px] text-slate-400">Télécharger .xlsx</div>
                  </button>

                  <button
                    id="mobile-action-settings"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400 mb-1.5" />
                    <div className="text-xs font-bold text-white">Paramètres</div>
                    <div className="text-[10px] text-slate-400">Numérotation & agences</div>
                  </button>
                </div>
              </div>

              {/* Create New Voucher Button */}
              <button
                id="mobile-drawer-new-voucher"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenNewVoucher();
                }}
                className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-sm uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Nouveau Bon d'Expédition</span>
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
};
