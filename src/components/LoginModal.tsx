import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  User, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { AgentProfile } from '../types';
import { authenticateAgent } from '../services/agentAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (agent: AgentProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = authenticateAgent(username, password);
      if (res.success && res.agent) {
        onLoginSuccess(res.agent);
        onClose();
      } else {
        setErrorMsg(res.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 text-white relative my-auto max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            Espace Agent & Gestion
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Connectez-vous avec vos identifiants pour accéder à l'administration des bons.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Identifiant */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Identifiant
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Votre identifiant..."
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border-2 border-slate-700 focus:border-orange-500 rounded-xl text-white font-mono text-sm placeholder-slate-500 font-bold focus:outline-none transition-colors"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Mot de passe
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Votre mot de passe..."
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-slate-950 border-2 border-slate-700 focus:border-orange-500 rounded-xl text-white font-mono text-sm placeholder-slate-500 font-bold focus:outline-none transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Connexion en cours...' : 'Se Connecter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-1 text-center">
          <p className="text-[11px] text-slate-500">
            Accès sécurisé réservé au personnel agréé Loyalis Trans.
          </p>
        </div>

      </div>
    </div>
  );
};
