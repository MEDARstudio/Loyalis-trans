import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus,
  PlusCircle, 
  Search, 
  FileSpreadsheet, 
  Settings, 
  BarChart3, 
  Truck, 
  RefreshCw,
  Menu, 
  X, 
  History, 
  Phone, 
  ChevronRight, 
  ChevronDown, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  Layers
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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  // Close desktop agent dropdown when clicking outside
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

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP & TABLET HEADER (Hidden on mobile < 768px)                     */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 w-full bg-slate-900 border-b border-slate-800 text-white shadow-md">
        
        {/* Desktop Top Micro-Bar for Status & Info */}
        <div className="hidden md:block bg-slate-950 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex items-center gap-1.5 text-orange-400 font-bold uppercase tracking-wider text-[11px] truncate">
                <Truck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{settings.tagline || 'Transport & Messagerie Express'}</span>
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1 text-slate-300 text-[11px] truncate">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">Tél : <strong className="text-white font-mono">{settings.phone1}</strong>{settings.phone2 ? ` / ${settings.phone2}` : ''}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Live Cloud DB Sync Indicator */}
              <button 
                id="btn-header-db-status"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-orange-500/50 text-slate-300 transition-all cursor-pointer text-[10px] font-bold"
                title="Statut de connexion - Ouvrir les paramètres"
              >
                {syncStatus === 'synced' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                    <span className="text-emerald-400">Supabase Connecté</span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 text-orange-400 animate-spin shrink-0" />
                    <span className="text-orange-400">Synchronisation...</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="text-amber-400">Mode Local</span>
                  </>
                )}
              </button>

              {/* Refresh Button */}
              <button
                id="btn-header-refresh"
                onClick={handleManualRefresh}
                title="Actualiser les données"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Actualiser"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' || isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Main Navigation Bar */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div 
            id="header-brand-logo"
            className="flex items-center gap-3 cursor-pointer select-none shrink-0" 
            onClick={() => handleTabSelect('list')}
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 flex items-center justify-center p-0.5 shrink-0">
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
              <h1 className="text-xl lg:text-2xl font-black tracking-tight uppercase text-white leading-none truncate">
                Loyalis <span className="text-orange-500">Trans</span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">
                Gestion des expéditions & fret
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              id="nav-tab-vouchers"
              onClick={() => handleTabSelect('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Relevés</span>
            </button>
          </nav>

          {/* Desktop Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Desktop Agent Profile Switcher */}
            <div className="relative" ref={agentMenuRef}>
              <button
                id="btn-agent-profile-switcher"
                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
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
                <div className="text-left">
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

              {/* Agent Menu Dropdown Popup */}
              {isAgentMenuOpen && (
                <div 
                  id="agent-dropdown-menu"
                  className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 text-slate-200"
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
                            ? 'bg-orange-500 text-white' 
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

            {/* Desktop Export Excel */}
            <button
              id="btn-header-export-excel"
              onClick={onOpenExcelExport}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer"
              title="Exporter en Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export</span>
            </button>

            {/* Desktop Settings */}
            <button
              id="btn-header-settings"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer"
              title="Paramètres de l'entreprise"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Paramètres</span>
            </button>

            {/* Desktop Nouveau Bon Button */}
            <button
              id="btn-header-new-voucher"
              onClick={onOpenNewVoucher}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm uppercase tracking-wider transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Nouveau Bon</span>
            </button>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* 2. ULTRA-CLEAN MOBILE HEADER & INTEGRATED SEGMENTED CONTROL               */}
        {/* ========================================================================= */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          
          {/* Top Row: Brand, Quick Status, + Nouveau Bon & Menu Trigger */}
          <div className="px-3.5 h-14 flex items-center justify-between gap-2 border-b border-slate-800/60">
            
            {/* Brand Logo & Name */}
            <div 
              id="mobile-header-brand"
              className="flex items-center gap-2.5 cursor-pointer select-none min-w-0" 
              onClick={() => handleTabSelect('list')}
            >
              <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 flex items-center justify-center p-0.5 shrink-0 shadow-xs">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerHTML = '<span class="font-black text-orange-500 text-xs">LT</span>';
                    }
                  }}
                />
              </div>
              
              <div className="min-w-0">
                <div className="text-sm font-black uppercase text-white tracking-tight leading-tight flex items-center gap-1.5">
                  <span>Loyalis <span className="text-orange-500">Trans</span></span>
                </div>
                {/* Live connection indicator */}
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                  {syncStatus === 'synced' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-emerald-400 font-bold">En ligne</span>
                    </>
                  ) : syncStatus === 'syncing' || isRefreshing ? (
                    <>
                      <RefreshCw className="w-2.5 h-2.5 text-orange-400 animate-spin" />
                      <span className="text-orange-400 font-bold">Sync...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span className="text-amber-400 font-bold">Local</span>
                    </>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 font-mono">{currentAgent.name}</span>
                </div>
              </div>
            </div>

            {/* Right Action Icons: Refresh + Nouveau + Menu */}
            <div className="flex items-center gap-1.5 shrink-0">
              
              {/* Refresh Button */}
              <button
                id="mobile-btn-header-refresh"
                type="button"
                onClick={handleManualRefresh}
                title="Actualiser les données"
                className="p-2 rounded-xl text-slate-400 hover:text-white active:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' || isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              </button>

              {/* + Nouveau Button (Vibrant & Compact) */}
              <button
                id="mobile-btn-header-new-voucher"
                type="button"
                onClick={onOpenNewVoucher}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 active:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                aria-label="Nouveau bon"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nouveau</span>
              </button>

              {/* Drawer Menu Trigger Button */}
              <button
                id="mobile-btn-header-menu"
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-200 active:bg-slate-750 transition-colors cursor-pointer flex items-center justify-center"
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-5 h-5 text-slate-200" />
              </button>

            </div>

          </div>

          {/* Row 2: Clean Segmented View Control (Zero bottom obstruction) */}
          <div className="px-2.5 py-1.5 bg-slate-950/70 border-t border-slate-850">
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80">
              
              {/* Tab 1: Bons */}
              <button
                id="mobile-tab-vouchers"
                type="button"
                onClick={() => handleTabSelect('list')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'list'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Package className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Bons</span>
                {vouchersCount > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full leading-tight ${
                    activeTab === 'list' ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {vouchersCount}
                  </span>
                )}
              </button>

              {/* Tab 2: Suivi */}
              <button
                id="mobile-tab-tracking"
                type="button"
                onClick={() => handleTabSelect('tracking')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'tracking'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Suivi</span>
              </button>

              {/* Tab 3: Stats */}
              <button
                id="mobile-tab-stats"
                type="button"
                onClick={() => handleTabSelect('stats')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'stats'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Stats</span>
              </button>

              {/* Tab 4: Relevés */}
              <button
                id="mobile-tab-history"
                type="button"
                onClick={() => handleTabSelect('history')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'history'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Relevés</span>
              </button>

            </div>
          </div>

        </div>

      </header>

      {/* ========================================================================= */}
      {/* 3. LATERAL SLIDE-OUT OFF-CANVAS DRAWER MENU (Clean, Modern & Complete)    */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end animate-fadeIn">
          
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Lateral Drawer Panel (Slides from Right) */}
          <div className="relative w-80 max-w-[85vw] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between z-10 animate-slideLeft overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center p-0.5 shrink-0">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<span class="font-black text-orange-500 text-xs">LT</span>';
                      }
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase text-white tracking-wide leading-tight">
                    Loyalis <span className="text-orange-500">Trans</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">Menu & Profil</p>
                </div>
              </div>

              <button
                id="btn-close-lateral-menu"
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white active:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Agent Profile & Quick Switch Card */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Utilisateur
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                    currentAgent?.role === 'ADMIN' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  }`}>
                    {currentAgent?.role === 'ADMIN' ? 'Admin' : 'Agent'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shrink-0 shadow-sm ${
                    currentAgent?.role === 'ADMIN' ? 'bg-orange-500' : 'bg-blue-600'
                  }`}>
                    {currentAgent?.name?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-white">{currentAgent?.name}</div>
                    <div className="text-xs text-slate-300">Agence : {currentAgent?.agencyCity}</div>
                    <div className="text-[10px] text-orange-400 font-medium">
                      {currentAgent?.role === 'ADMIN' ? 'Accès complet & Suppression' : 'Saisie & Consultation'}
                    </div>
                  </div>
                </div>

                {/* 1-Tap Agent Switch Buttons */}
                <div className="pt-2.5 border-t border-slate-700/80 grid grid-cols-2 gap-1.5">
                  {DEFAULT_AGENTS.map(agent => {
                    const isActive = currentAgent?.id === agent.id;
                    return (
                      <button
                        key={agent.id}
                        id={`drawer-switch-agent-${agent.id}`}
                        type="button"
                        onClick={() => onSelectAgent(agent)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isActive
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-750 border border-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${agent.role === 'ADMIN' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                        <span>{agent.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Action Button: Nouveau Bon */}
              <button
                id="drawer-btn-new-voucher"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenNewVoucher();
                }}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-sm uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nouveau Bon d'Expédition</span>
              </button>

              {/* Navigation Modules Links */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Modules Principaux
                </div>
                <div className="space-y-1">
                  <button
                    id="drawer-nav-list"
                    type="button"
                    onClick={() => handleTabSelect('list')}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'list'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4" />
                      <span>Bons d'Expédition</span>
                    </div>
                    {vouchersCount > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                        activeTab === 'list' ? 'bg-orange-700 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {vouchersCount}
                      </span>
                    )}
                  </button>

                  <button
                    id="drawer-nav-tracking"
                    type="button"
                    onClick={() => handleTabSelect('tracking')}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'tracking'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Search className="w-4 h-4" />
                      <span>Suivi & Recherche</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    id="drawer-nav-stats"
                    type="button"
                    onClick={() => handleTabSelect('stats')}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'stats'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4" />
                      <span>Statistiques & CA</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button
                    id="drawer-nav-history"
                    type="button"
                    onClick={() => handleTabSelect('history')}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <History className="w-4 h-4" />
                      <span>Historique & Relevés</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>
              </div>

              {/* Tools & Export */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Outils & Données
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="drawer-btn-excel"
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenExcelExport();
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-left transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 mb-1" />
                    <div className="text-xs font-bold text-white">Export Excel</div>
                    <div className="text-[10px] text-slate-400">Rapports .xlsx</div>
                  </button>

                  <button
                    id="drawer-btn-settings"
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-left transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400 mb-1" />
                    <div className="text-xs font-bold text-white">Paramètres</div>
                    <div className="text-[10px] text-slate-400">Tarifs & Agences</div>
                  </button>
                </div>
              </div>

              {/* Database Live Status & Refresh */}
              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    {syncStatus === 'synced' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Supabase Connecté</span>
                      </>
                    ) : syncStatus === 'syncing' || isRefreshing ? (
                      <>
                        <RefreshCw className="w-3 h-3 text-orange-400 animate-spin" />
                        <span className="text-orange-400">Synchronisation...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Mode Local</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {vouchersCount} bon(s) en mémoire
                  </div>
                </div>

                <button
                  id="drawer-btn-sync-refresh"
                  type="button"
                  onClick={handleManualRefresh}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  title="Actualiser les données"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
                </button>
              </div>

            </div>

            {/* Drawer Footer (Company Call & Info) */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950 text-center space-y-1">
              <div className="text-xs font-bold text-slate-300">
                {settings.companyName || 'Loyalis Trans SARL'}
              </div>
              {settings.phone1 && (
                <a
                  href={`tel:${settings.phone1.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>{settings.phone1}</span>
                </a>
              )}
            </div>

          </div>

        </div>
      )}
    </>
  );
};

