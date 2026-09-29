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
  ChevronDown, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  LogOut,
  MapPin,
  ExternalLink,
  QrCode,
  Sparkles,
  Building2,
  Database
} from 'lucide-react';
import { CompanySettings, AgentProfile } from '../types';
import { getStoredAgents } from '../services/agentAuth';

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
  onLogout?: () => void;
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
  onSelectAgent,
  onLogout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  const allAgents = getStoredAgents();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
        setIsAgentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile drawer is open
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
      <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-800 text-white shadow-lg">
        
        {/* ========================================================================= */}
        {/* 1. TOP SUB-STRIP: Status, Support Phone & Visitor Switch (Desktop)        */}
        {/* ========================================================================= */}
        <div className="hidden lg:block bg-slate-950/90 border-b border-slate-800/60 w-full">
          <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs text-slate-400 gap-4">
            
            {/* Left: Tagline & Hotline */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center gap-1.5 text-orange-400 font-bold uppercase tracking-wider text-[11px] truncate">
                <Truck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{settings.tagline || 'Transport & Messagerie Express • Réseau National'}</span>
              </span>

              {settings.phone1 && (
                <>
                  <span className="text-slate-700">|</span>
                  <a 
                    href={`tel:${settings.phone1.replace(/\s+/g, '')}`} 
                    className="flex items-center gap-1 text-slate-300 hover:text-white text-[11px] truncate transition-colors"
                  >
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Support : <strong className="text-white font-mono">{settings.phone1}</strong>
                      {settings.phone2 ? ` / ${settings.phone2}` : ''}
                    </span>
                  </a>
                </>
              )}
            </div>

            {/* Right: Cloud DB Status & Visitor Portal Link */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* PostgreSQL Sync Status */}
              <button 
                id="btn-header-db-status"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-orange-500/50 text-slate-300 transition-colors cursor-pointer text-[10px] font-bold"
                title="Statut base de données - Ouvrir les paramètres"
              >
                {syncStatus === 'synced' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <span className="text-emerald-400 font-medium">PostgreSQL Connecté</span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 text-orange-400 animate-spin shrink-0" />
                    <span className="text-orange-400 font-medium">Synchronisation...</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-amber-400 font-medium">Mode Local</span>
                  </>
                )}
              </button>

              {/* Quick Refresh */}
              <button
                id="btn-header-refresh"
                onClick={handleManualRefresh}
                title="Actualiser les données"
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Actualiser"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' || isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              </button>

              {/* Public Portal Switch */}
              {onLogout && (
                <>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-slate-400 hover:text-orange-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Se déconnecter et basculer vers le portail de suivi public"
                  >
                    <span>Portail Visiteurs</span>
                    <ExternalLink className="w-3 h-3 text-orange-400" />
                  </button>
                </>
              )}
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. DESKTOP MAIN NAVIGATION: PERFECTLY FRAMED INSIDE max-w-7xl             */}
        {/*    [LEFT: BRAND] ---------- [CENTER: MENU] ---------- [RIGHT: ACTIONS+PROFILE] */}
        {/* ========================================================================= */}
        <div className="hidden md:flex w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 items-center justify-between gap-2 lg:gap-4">
          
          {/* ======================================================================= */}
          {/* ZONE 1 (LEFT): BRAND IDENTITY                                           */}
          {/* ======================================================================= */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div 
              id="header-brand-title"
              className="flex items-center gap-2.5 cursor-pointer select-none group" 
              onClick={() => handleTabSelect('list')}
            >
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 group-hover:bg-orange-600 transition-colors">
                <Truck className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base lg:text-lg font-black tracking-tight uppercase text-white leading-none whitespace-nowrap">
                    Loyalis <span className="text-orange-500">Trans</span>
                  </h1>
                  {currentAgent?.agencyCity && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/80 leading-none hidden xl:inline-block">
                      {currentAgent.agencyCity}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 hidden xl:block whitespace-nowrap">
                  Gestion des expéditions & fret
                </p>
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* ZONE 2 (CENTER): MAIN NAVIGATION MENU TABS                              */}
          {/* ======================================================================= */}
          <div className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
            <nav className="flex items-center gap-0.5 lg:gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              
              {/* Tab 1: Bons de bagages */}
              <button
                id="nav-tab-vouchers"
                type="button"
                onClick={() => handleTabSelect('list')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>Bons</span>
                {vouchersCount > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    activeTab === 'list' ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {vouchersCount}
                  </span>
                )}
              </button>

              {/* Tab 2: Suivi QR */}
              <button
                id="nav-tab-tracking"
                type="button"
                onClick={() => handleTabSelect('tracking')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'tracking'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>Suivi</span>
              </button>

              {/* Tab 3: Statistiques */}
              <button
                id="nav-tab-stats"
                type="button"
                onClick={() => handleTabSelect('stats')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>Stats</span>
              </button>

              {/* Tab 4: Relevés & Historique */}
              <button
                id="nav-tab-history"
                type="button"
                onClick={() => handleTabSelect('history')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>Relevés</span>
              </button>

            </nav>
          </div>

          {/* ======================================================================= */}
          {/* ZONE 3 (RIGHT): ACTIONS & USER PROFILE (FIRMLY INSIDE THE SITE FRAME)    */}
          {/* ======================================================================= */}
          <div className="flex items-center justify-end gap-1.5 lg:gap-2 shrink-0">
            
            {/* Primary Action CTA: + Nouveau Bon */}
            <button
              id="btn-header-new-voucher"
              type="button"
              onClick={onOpenNewVoucher}
              className="flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 stroke-[2.5]" />
              <span className="hidden xl:inline">Nouveau Bon</span>
              <span className="xl:hidden">Nouveau</span>
            </button>

            {/* Quick Action: Export Excel */}
            <button
              id="btn-header-export-excel"
              type="button"
              onClick={onOpenExcelExport}
              className="p-1.5 lg:p-2 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Exporter tous les bons en fichier Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden 2xl:inline">Excel</span>
            </button>

            {/* Quick Action: Paramètres / Settings */}
            <button
              id="btn-header-settings"
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 lg:p-2 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Paramètres de l'entreprise & Configuration"
            >
              <Settings className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="hidden 2xl:inline">Config</span>
            </button>

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-slate-800 mx-0.5 shrink-0" />

            {/* USER PROFILE CARD - ANCHORED CLEANLY INSIDE CONTAINER */}
            <div className="relative shrink-0" ref={agentMenuRef}>
              <button
                id="btn-agent-profile-switcher"
                type="button"
                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                className={`flex items-center gap-1.5 lg:gap-2 pl-1.5 pr-2 py-1 rounded-xl border transition-colors cursor-pointer select-none ${
                  isAgentMenuOpen
                    ? 'bg-slate-800 border-orange-500 text-white'
                    : currentAgent?.role === 'ADMIN'
                    ? 'bg-slate-800/90 hover:bg-slate-800 border-orange-500/40 text-slate-200'
                    : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
                title="Mon profil & Changement d'utilisateur"
              >
                {/* Avatar with initial & online pulse */}
                <div className="relative shrink-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 ${
                    currentAgent?.role === 'ADMIN' ? 'bg-orange-500' : 'bg-blue-600'
                  }`}>
                    {currentAgent?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span className="text-white max-w-[70px] lg:max-w-[110px] truncate">{currentAgent?.name || 'Amine'}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                      currentAgent?.role === 'ADMIN' 
                        ? 'bg-orange-500/25 text-orange-300 border border-orange-500/30' 
                        : 'bg-blue-500/25 text-blue-300 border border-blue-500/30'
                    }`}>
                      {currentAgent?.role === 'ADMIN' ? 'Admin' : 'Agent'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight hidden xl:block truncate">
                    {currentAgent?.agencyCity || 'Agence'}
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isAgentMenuOpen ? 'rotate-180 text-orange-400' : ''}`} />
              </button>

              {/* Profile Dropdown Popup (Right-aligned, strictly inside container) */}
              {isAgentMenuOpen && (
                <div 
                  id="agent-dropdown-menu"
                  className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-3 text-slate-200"
                >
                  {/* Active Profile Info Header */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Session Active
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                        currentAgent?.role === 'ADMIN' 
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' 
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}>
                        {currentAgent?.role === 'ADMIN' ? 'Administrateur' : 'Agent Agence'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 ${
                        currentAgent?.role === 'ADMIN' ? 'bg-orange-500' : 'bg-blue-600'
                      }`}>
                        {currentAgent?.name?.charAt(0) || 'A'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm leading-tight truncate">{currentAgent?.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                          <span className="truncate">Agence : <strong className="text-slate-200">{currentAgent?.agencyCity || 'Principale'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Switch Agents List */}
                  <div>
                    <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Changer d'utilisateur</span>
                      <span className="text-[9px] text-slate-500">{allAgents.length} compte(s)</span>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {allAgents.map(agent => {
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
                            className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                              isActive 
                                ? 'bg-orange-500 text-white font-bold' 
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isActive 
                                  ? 'bg-white text-orange-600' 
                                  : agent.role === 'ADMIN' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {agent.name.charAt(0)}
                              </div>
                              <div className="truncate">
                                <span className="text-xs truncate block">{agent.name}</span>
                                <span className={`text-[10px] block ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                  {agent.agencyCity || 'Agence'}
                                </span>
                              </div>
                            </div>

                            {isActive && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Shortcuts */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAgentMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full p-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Paramètres de l'entreprise</span>
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAgentMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full p-2 rounded-xl text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Portail Visiteurs / Déconnexion</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* 3. MOBILE HEADER: STREAMLINED & PERFECTLY IN FRAME                        */}
        {/* ========================================================================= */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 w-full">
          
          {/* Top Bar on Mobile */}
          <div className="w-full max-w-7xl mx-auto px-3.5 h-14 flex items-center justify-between gap-2 border-b border-slate-800/80">
            
            {/* Brand on Mobile */}
            <div 
              id="mobile-header-brand"
              className="flex items-center gap-2 cursor-pointer select-none min-w-0" 
              onClick={() => handleTabSelect('list')}
            >
              <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black uppercase text-white tracking-tight leading-none truncate">
                  Loyalis <span className="text-orange-500">Trans</span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="font-bold text-slate-300 truncate">{currentAgent.agencyCity || 'Agence'}</span>
                </div>
              </div>
            </div>

            {/* Mobile Actions: Refresh + Nouveau + FAR RIGHT User Profile + Hamburger Drawer */}
            <div className="flex items-center gap-1.5 shrink-0">
              
              {/* Refresh */}
              <button
                id="mobile-btn-header-refresh"
                type="button"
                onClick={handleManualRefresh}
                title="Actualiser les données"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white active:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' || isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              </button>

              {/* + Nouveau */}
              <button
                id="mobile-btn-header-new-voucher"
                type="button"
                onClick={onOpenNewVoucher}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-500 active:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden xs:inline">Nouveau</span>
              </button>

              {/* FAR RIGHT PROFILE AVATAR (opens drawer / profile) */}
              <button
                id="mobile-btn-profile"
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="relative p-0.5 rounded-xl border border-slate-700/80 active:bg-slate-800 transition-colors cursor-pointer"
                title={`Profil de ${currentAgent.name}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                  currentAgent?.role === 'ADMIN' ? 'bg-orange-500' : 'bg-blue-600'
                }`}>
                  {currentAgent?.name?.charAt(0) || 'A'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
              </button>

              {/* Drawer Menu Button */}
              <button
                id="mobile-btn-header-menu"
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-200 transition-colors cursor-pointer"
                aria-label="Ouvrir le menu complet"
              >
                <Menu className="w-4 h-4" />
              </button>

            </div>

          </div>

          {/* Sub-Bar: Mobile Segmented Navigation Tabs */}
          <div className="w-full max-w-7xl mx-auto px-2.5 py-1.5 bg-slate-950/80">
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
              
              <button
                id="mobile-tab-vouchers"
                type="button"
                onClick={() => handleTabSelect('list')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'list'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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

              <button
                id="mobile-tab-tracking"
                type="button"
                onClick={() => handleTabSelect('tracking')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'tracking'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Suivi</span>
              </button>

              <button
                id="mobile-tab-stats"
                type="button"
                onClick={() => handleTabSelect('stats')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'stats'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Stats</span>
              </button>

              <button
                id="mobile-tab-history"
                type="button"
                onClick={() => handleTabSelect('history')}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'history'
                    ? 'bg-orange-500 text-white font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
      {/* 4. LATERAL SLIDE-OUT MOBILE DRAWER (Complete Menu & Profile Control)       */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end animate-fadeIn">
          
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/75 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between z-10 animate-slideLeft overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase text-white tracking-wide leading-tight">
                    Loyalis <span className="text-orange-500">Trans</span>
                  </h2>
                  <p className="text-[10px] text-slate-400">Navigation & Profils</p>
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

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* User Profile Card */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Utilisateur Actif
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                    currentAgent?.role === 'ADMIN' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  }`}>
                    {currentAgent?.role === 'ADMIN' ? 'Admin' : 'Agent'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shrink-0 ${
                    currentAgent?.role === 'ADMIN' ? 'bg-orange-500' : 'bg-blue-600'
                  }`}>
                    {currentAgent?.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{currentAgent?.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-400" />
                      <span>{currentAgent?.agencyCity || 'Casablanca'}</span>
                    </div>
                  </div>
                </div>

                {/* Profile switch list */}
                <div className="pt-2 border-t border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Changer de compte</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {allAgents.map(ag => (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => {
                          onSelectAgent(ag);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`p-2 rounded-xl text-left text-xs transition-colors cursor-pointer border ${
                          ag.id === currentAgent.id 
                            ? 'bg-orange-500 text-white font-bold border-orange-600' 
                            : 'bg-slate-900/60 hover:bg-slate-700/60 text-slate-300 border-slate-700/60'
                        }`}
                      >
                        <div className="font-bold truncate">{ag.name}</div>
                        <div className="text-[9px] opacity-80 truncate">{ag.agencyCity}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation Shortcuts */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Navigation</span>
                
                <button
                  type="button"
                  onClick={() => handleTabSelect('list')}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between ${
                    activeTab === 'list' ? 'bg-orange-500 text-white font-black' : 'bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>Tous les bons</span>
                  </div>
                  {vouchersCount > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-900/60 text-white">
                      {vouchersCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('tracking')}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${
                    activeTab === 'tracking' ? 'bg-orange-500 text-white font-black' : 'bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Suivi par QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('stats')}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${
                    activeTab === 'stats' ? 'bg-orange-500 text-white font-black' : 'bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Statistiques & CA</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('history')}
                  className={`w-full p-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${
                    activeTab === 'history' ? 'bg-orange-500 text-white font-black' : 'bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Relevés d'expédition</span>
                </button>
              </div>

              {/* Utility Tools */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Outils & Export</span>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenExcelExport();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Exporter en Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Paramètres de l'entreprise</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' || isRefreshing ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
                  <span>Synchroniser maintenant</span>
                </button>
              </div>

              {/* Support & Contacts */}
              {settings.phone1 && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Agence</span>
                  <a href={`tel:${settings.phone1.replace(/\s+/g, '')}`} className="text-xs font-mono font-bold text-orange-400 block">
                    {settings.phone1}
                  </a>
                </div>
              )}

            </div>

            {/* Drawer Footer with Logout */}
            <div className="p-4 border-t border-slate-800 bg-slate-950">
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Portail Visiteurs / Déconnexion</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};
