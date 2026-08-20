import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldCheck,
  User,
  Phone,
  CreditCard,
  MapPin,
  Package,
  Scale,
  DollarSign,
  FileCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { AgentProfile, CompanySettings, Voucher } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface VoucherValidationModalProps {
  voucher: Voucher | null;
  settings: CompanySettings;
  currentAgent: AgentProfile;
  isOpen: boolean;
  onClose: () => void;
  onValidate: (voucherId: string, isValidated: boolean, notes: string) => Promise<void>;
  onOpenPhotoViewer?: (voucher: Voucher) => void;
}

export const VoucherValidationModal: React.FC<VoucherValidationModalProps> = ({
  voucher,
  settings,
  currentAgent,
  isOpen,
  onClose,
  onValidate,
  onOpenPhotoViewer
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [validationNotes, setValidationNotes] = useState<string>(voucher?.validationNotes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Verification Checklist Checkboxes
  const [checkSender, setCheckSender] = useState<boolean>(true);
  const [checkItems, setCheckItems] = useState<boolean>(true);
  const [checkPrice, setCheckPrice] = useState<boolean>(true);

  if (!isOpen || !voucher) return null;

  const currency = settings.currency || 'DH';
  const hasBonReelPhoto = !!voucher.bonReelPhoto?.dataUrl;
  const createdBy = voucher.createdByAgent || voucher.agentName || 'Sofiane (Casa)';

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await onValidate(voucher.id, true, validationNotes || 'Bon réel vérifié et validé sans contrainte.');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeOrReject = async () => {
    try {
      setIsSubmitting(true);
      await onValidate(voucher.id, false, validationNotes || 'Validation révoquée / Rectification demandée.');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="voucher-validation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Audit & Validation du Bon Réel
                </h2>
                <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg text-xs font-black border border-emerald-800/60 shadow-xs">
                  N° {voucher.trackingNumber}
                </span>
                {voucher.isValidated ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Validé
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    En attente validation Amine
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Agent créateur : <strong className="text-white">{createdBy}</strong> • Vérificateur Admin : <strong className="text-orange-400">{currentAgent.name}</strong>
              </p>
            </div>
          </div>

          <button
            id="btn-close-validation-modal"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split: Left = Bon Réel Photo, Right = Digital Fields & Approval */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* LEFT COLUMN: Photo of the Real Paper Voucher (5 or 6 Cols) */}
          <div className="lg:col-span-6 p-4 sm:p-5 bg-slate-950 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-orange-400">
                <Camera className="w-4 h-4" />
                Photo du Bon Réel Manuscrit
              </span>
              
              {/* Photo Controls */}
              {hasBonReelPhoto && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Zoom arrière"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono px-1 text-slate-400">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Pivoter de 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  {onOpenPhotoViewer && (
                    <button
                      onClick={() => onOpenPhotoViewer(voucher)}
                      className="p-1 text-orange-400 hover:text-orange-300 hover:bg-slate-800 rounded transition-colors ml-1"
                      title="Ouvrir en grand écran"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Photo Canvas Area */}
            <div className="my-auto min-h-[300px] sm:min-h-[420px] bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center justify-center p-2 overflow-hidden relative">
              {hasBonReelPhoto ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto max-h-[460px]">
                  <img
                    src={voucher.bonReelPhoto!.dataUrl}
                    alt={`Bon réel N° ${voucher.trackingNumber}`}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out'
                    }}
                    className="max-h-[440px] w-auto object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="text-center p-6 space-y-3 max-w-sm">
                  <div className="w-14 h-14 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Aucune photo de bon réel jointe
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    La photo n'est pas obligatoire. L'administrateur peut valider ce bon directement sans avoir à consulter le bon réel.
                  </p>
                  {!voucher.isValidated && (
                    <button
                      type="button"
                      onClick={() => handleApprove()}
                      disabled={isSubmitting}
                      className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 mx-auto transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Valider directement ce bon</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between">
              <span>Date expédition : <strong className="text-white">{formatDate(voucher.date)}</strong></span>
              <span>{voucher.bonReelPhoto?.name || 'Photo non disponible'}</span>
            </div>
          </div>


          {/* RIGHT COLUMN: Digital Voucher Summary & Verification Checks */}
          <div className="lg:col-span-6 p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/60 space-y-4 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-4">
              
              {/* Departure & Arrival Trajet Summary */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Trajet & Point de Départ
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {voucher.time || '00:00'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span>{voucher.departureCity || 'Casablanca'}</span>
                  </div>
                  <span className="text-orange-500 font-black">➔</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>{voucher.destinationCity || voucher.recipient.destination}</span>
                  </div>
                </div>
              </div>

              {/* Sender & Recipient Comparison Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Sender */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1">
                    <User className="w-3.5 h-3.5 text-orange-500" />
                    <span className="truncate">Expéditeur : {voucher.sender.name}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">
                    Tél : {voucher.sender.phone}
                  </p>
                  {voucher.sender.cin && (
                    <p className="text-slate-500 dark:text-slate-400 font-mono">
                      CIN : {voucher.sender.cin}
                    </p>
                  )}
                </div>

                {/* Recipient */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="truncate">Destinataire : {voucher.recipient.name}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">
                    Tél : {voucher.recipient.phone}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 truncate">
                    Lieu : {voucher.recipient.destination}
                  </p>
                </div>

              </div>

              {/* Luggage Items & Totals */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-orange-500" />
                    Détail des Colis ({voucher.items.length})
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {voucher.totalColis} colis • {voucher.totalWeightKg} kg
                  </span>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs">
                  {voucher.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 text-slate-700 dark:text-slate-300">
                      <span>{it.quantity}x {it.nature} ({it.weightKg} kg)</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {it.price !== undefined ? formatCurrency(it.price, currency) : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary Line */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-black">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">TOTAL FACTURÉ</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(voucher.totalPrice, currency)}
                    </span>
                  </div>
                  {voucher.advanceAmount !== undefined && voucher.advanceAmount > 0 && (
                    <div className="text-right">
                      <span className="text-amber-500 block text-[10px]">AVANCE : {formatCurrency(voucher.advanceAmount, currency)}</span>
                      <span className="text-rose-500 text-xs">
                        Reste : {formatCurrency(voucher.remainingAmount || 0, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Checkbox Verification Checklist */}
              <div className="bg-orange-50/80 dark:bg-orange-950/30 p-3.5 rounded-2xl border border-orange-200 dark:border-orange-900/60 space-y-2">
                <span className="text-xs font-black text-orange-900 dark:text-orange-200 uppercase tracking-wider block">
                  Contrôle de conformité (Admin Amine)
                </span>
                
                <div className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checkSender}
                      onChange={e => setCheckSender(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Identité expéditeur & destinataire concordent</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checkItems}
                      onChange={e => setCheckItems(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Nombre de colis & poids déclarés correspondent au bon réel</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checkPrice}
                      onChange={e => setCheckPrice(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Prix total & encaissement (Avance/Reste) conformes</span>
                  </label>
                </div>
              </div>

              {/* Validation Notes Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Note d'audit / Remarques de validation :
                </label>
                <textarea
                  rows={2}
                  value={validationNotes}
                  onChange={e => setValidationNotes(e.target.value)}
                  placeholder="Ex: Bon papier vérifié conforme sans contrainte. / Colis bien emballés."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500"
                />
              </div>

            </div>

            {/* Validation Action Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              {voucher.isValidated && (
                <button
                  type="button"
                  onClick={handleRevokeOrReject}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Révoquer la validation
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  id="btn-confirm-validation"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{voucher.isValidated ? 'Mettre à jour la validation' : 'Valider & Approuver le Bon'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
