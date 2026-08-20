import React, { useState } from 'react';
import { 
  X, 
  Download, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Camera, 
  FileText, 
  Package, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Info,
  ExternalLink,
  Eye
} from 'lucide-react';
import { Voucher, VoucherPhoto } from '../types';
import { downloadPhoto, formatPhotoSize } from '../utils/imageCompressor';
import { formatDateTime } from '../utils/formatters';

interface VoucherPhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: Voucher | null;
  initialTab?: 'BON_REEL' | 'PARCEL_CASE';
  initialPhotoIndex?: number;
}

export const VoucherPhotoViewerModal: React.FC<VoucherPhotoViewerModalProps> = ({
  isOpen,
  onClose,
  voucher,
  initialTab = 'BON_REEL',
  initialPhotoIndex = 0
}) => {
  const [activeTab, setActiveTab] = useState<'BON_REEL' | 'PARCEL_CASE'>(initialTab);
  const [activeCaseIndex, setActiveCaseIndex] = useState<number>(initialPhotoIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync tab if initial changes
  React.useEffect(() => {
    if (isOpen && voucher) {
      if (initialTab === 'BON_REEL' && !voucher.bonReelPhoto && voucher.casePhotos && voucher.casePhotos.length > 0) {
        setActiveTab('PARCEL_CASE');
      } else if (initialTab === 'PARCEL_CASE' && (!voucher.casePhotos || voucher.casePhotos.length === 0) && voucher.bonReelPhoto) {
        setActiveTab('BON_REEL');
      } else {
        setActiveTab(initialTab);
      }
      setActiveCaseIndex(initialPhotoIndex);
      setZoomLevel(1);
      setRotationAngle(0);
    }
  }, [isOpen, voucher, initialTab, initialPhotoIndex]);

  if (!isOpen || !voucher) return null;

  const hasBonReel = !!voucher.bonReelPhoto;
  const casePhotos = voucher.casePhotos || [];
  const hasCasePhotos = casePhotos.length > 0;

  // Resolve current active photo
  let currentPhoto: VoucherPhoto | null = null;
  if (activeTab === 'BON_REEL') {
    currentPhoto = voucher.bonReelPhoto || null;
  } else {
    currentPhoto = casePhotos[activeCaseIndex] || null;
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotationAngle(0);
  };
  const handleRotate = () => setRotationAngle(prev => (prev + 90) % 360);

  const handlePrevPhoto = () => {
    if (casePhotos.length <= 1) return;
    setActiveCaseIndex(prev => (prev > 0 ? prev - 1 : casePhotos.length - 1));
    handleResetZoom();
  };

  const handleNextPhoto = () => {
    if (casePhotos.length <= 1) return;
    setActiveCaseIndex(prev => (prev < casePhotos.length - 1 ? prev + 1 : 0));
    handleResetZoom();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/95 overflow-hidden ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`relative w-full max-w-5xl bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col ${isFullscreen ? 'h-full max-h-full rounded-none border-0' : 'h-[90vh] max-h-[850px]'}`}>
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Galerie & Documents Photographiques</h3>
                <span className="font-mono text-xs px-2 py-0.5 bg-orange-950/80 border border-orange-700/60 text-orange-400 rounded-md font-bold">
                  #{voucher.trackingNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {voucher.sender.name} ➔ {voucher.recipient.name} ({voucher.recipient.destination})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Quitter le plein écran' : 'Mode Plein Écran'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('BON_REEL');
                handleResetZoom();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'BON_REEL'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Bon Réel Manuscrit</span>
              {hasBonReel ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ) : (
                <span className="text-[10px] text-slate-500 font-normal">(Non joint)</span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('PARCEL_CASE');
                handleResetZoom();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'PARCEL_CASE'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Photos des Cas & Colis</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                casePhotos.length > 0 ? 'bg-orange-950 border border-orange-500/50 text-orange-300' : 'bg-slate-700 text-slate-400'
              }`}>
                {casePhotos.length}
              </span>
            </button>
          </div>

          {/* Controls: Zoom, Rotate, Download */}
          {currentPhoto && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleZoomOut}
                title="Dézoomer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                title="Zoomer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRotate}
                title="Faire pivoter de 90°"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => downloadPhoto(currentPhoto!, voucher.trackingNumber)}
                title="Télécharger l'image"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Télécharger</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Photo Display Area */}
        <div className="flex-1 bg-slate-950/80 relative overflow-hidden flex items-center justify-center p-4 select-none">
          {currentPhoto ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto relative">
              <img
                src={currentPhoto.dataUrl}
                alt={currentPhoto.name || 'Photo Bon'}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                  transition: 'transform 0.15s ease-out',
                  maxWidth: zoomLevel > 1 ? 'none' : '100%',
                  maxHeight: zoomLevel > 1 ? 'none' : '100%',
                }}
                className="object-contain rounded-lg shadow-2xl"
              />

              {/* Navigation arrows for case photos */}
              {activeTab === 'PARCEL_CASE' && casePhotos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/90 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 text-white shadow-sm transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/90 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 text-white shadow-sm transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-300">
                {activeTab === 'BON_REEL' ? 'Aucune photo du bon réel manuscrit' : 'Aucune photo de cas / colis enregistrée'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'BON_REEL' 
                  ? 'Vous pouvez prendre en photo le bon papier écrit sur place lors de la création ou la modification de ce bon.'
                  : 'Vous pouvez joindre des photos des colis pour documenter l\'état, l\'emballage ou un litige.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Thumbnail Filmstrip & Metadata info */}
        {currentPhoto && (
          <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
            {/* Photo metadata */}
            <div className="flex flex-wrap items-center gap-3 text-slate-400">
              <span className="font-mono text-white font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {currentPhoto.name}
              </span>
              {currentPhoto.sizeBytes && (
                <span>Taille : <strong className="text-slate-300">{formatPhotoSize(currentPhoto.sizeBytes)}</strong></span>
              )}
              {currentPhoto.capturedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateTime(currentPhoto.capturedAt)}</span>
                </span>
              )}
              {currentPhoto.caption && (
                <span className="text-amber-400 font-medium">
                  • {currentPhoto.caption}
                </span>
              )}
            </div>

            {/* Filmstrip thumbnails if multiple case photos */}
            {activeTab === 'PARCEL_CASE' && casePhotos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {casePhotos.map((photo, idx) => (
                  <button
                    key={photo.id || idx}
                    onClick={() => {
                      setActiveCaseIndex(idx);
                      handleResetZoom();
                    }}
                    className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      activeCaseIndex === idx
                        ? 'border-orange-500 ring-2 ring-orange-500/50 scale-105'
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo.dataUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] font-mono text-white px-1">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
