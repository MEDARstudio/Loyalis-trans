import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, AlertCircle, Upload, CheckCircle2, RefreshCw, QrCode } from 'lucide-react';
import jsQR from 'jsqr';
import { extractTrackingCode } from '../utils/qrGenerator';

interface VoucherQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (trackingNumber: string) => void;
}

export const VoucherQRScannerModal: React.FC<VoucherQRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'accès à la caméra n'est pas supporté par ce navigateur.");
      }

      // Try environment/back camera first, fallback to user camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        await videoRef.current.play();
        setCameraActive(true);
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setErrorMsg(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? "Permission refusée : Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur, ou téléchargez une photo du code QR."
          : "Impossible d'activer la caméra. Vous pouvez importer une photo de votre code QR ci-dessous."
      );
      setCameraActive(false);
    }
  };

  const handleDetectedCode = (rawCode: string) => {
    const trackingCode = extractTrackingCode(rawCode);
    if (!trackingCode) return;

    // Gentle tactile feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(100);
      } catch {
        // ignore
      }
    }

    stopCamera();
    onScanSuccess(trackingCode);
    onClose();
  };

  const tick = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data) {
      handleDetectedCode(code.data);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setErrorMsg("Erreur lors de la lecture de l'image.");
          setIsProcessingFile(false);
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        setIsProcessingFile(false);
        if (code && code.data) {
          handleDetectedCode(code.data);
        } else {
          setErrorMsg("Aucun code QR détecté sur cette image. Veuillez prendre une photo plus nette et bien éclairée du bon.");
        }
      };
      img.onerror = () => {
        setIsProcessingFile(false);
        setErrorMsg("Impossible de charger cette image.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                Scanner un Code QR
              </h3>
              <p className="text-[11px] text-slate-400">
                Pointez la caméra vers le code QR du bon
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
              {/* Target Aim Frame */}
              <div className="w-56 h-56 border-2 border-orange-500 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-orange-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-orange-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-orange-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-orange-400 rounded-br-xl" />

                {/* Laser scan animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-orange-400 shadow-[0_0_8px_#f97316] animate-pulse top-1/2 -translate-y-1/2" />
              </div>

              <span className="mt-4 text-[11px] font-bold text-white bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-xs">
                Alignez le code QR au centre
              </span>
            </div>
          )}

          {!cameraActive && (
            <div className="p-6 text-center space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {errorMsg || "Caméra en attente d'initialisation..."}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réessayer la caméra</span>
              </button>
            </div>
          )}
        </div>

        {/* Error notice if any */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border-t border-rose-900/60 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMsg}</p>
          </div>
        )}

        {/* Footer: Alternative upload photo */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
          <label className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
            <Upload className="w-4 h-4 text-orange-400" />
            <span>{isProcessingFile ? 'Analyse du fichier...' : 'Importer une photo du code QR'}</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isProcessingFile}
            />
          </label>
          <p className="text-[10px] text-slate-500 text-center">
            Fonctionne avec n'importe quel ticket, bon imprimé ou reçu Loyalis Trans.
          </p>
        </div>
      </div>
    </div>
  );
};
