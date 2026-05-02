import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, CameraOff, ImagePlus, Zap, ZapOff } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';

interface QRScannerProps {
  onScan: (result: string) => void;
  active: boolean;
}

const SCAN_INTERVAL_MS = 120;

/**
 * Camera-based QR code scanner using the native BarcodeDetector API.
 * Falls back to image upload for unsupported browsers.
 */
export const QRScanner = ({ onScan, active }: QRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const t = useLocaleStore((s) => s.t);

  const hasBarcodeDetector = typeof BarcodeDetector !== 'undefined';

  const clearScheduledScan = useCallback(() => {
    if (scanTimerRef.current === null) return;
    window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
  }, []);

  /* ---------- Stop camera stream ---------- */
  const stopStream = useCallback(() => {
    scanningRef.current = false;
    clearScheduledScan();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [clearScheduledScan]);

  /* ---------- Camera lifecycle effect ---------- */
  useEffect(() => {
    if (!active || !hasBarcodeDetector) return;

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
        if (!cancelled) {
          setHasTorch(Boolean(caps && 'torch' in caps));
          setTorchOn(false);
        }

        // Start BarcodeDetector scan loop
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        scanningRef.current = true;

        const scan = async () => {
          if (!scanningRef.current || !videoRef.current || cancelled) return;

          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0 && results[0].rawValue) {
              scanningRef.current = false;
              onScan(results[0].rawValue);
              return;
            }
          } catch {
            // Frame not ready or detection error — continue scanning
          }

          if (!scanningRef.current || cancelled) return;

          scanTimerRef.current = window.setTimeout(() => {
            scanTimerRef.current = null;
            if (scanningRef.current && !cancelled) requestAnimationFrame(scan);
          }, SCAN_INTERVAL_MS);
        };

        requestAnimationFrame(scan);
      } catch (err) {
        if (cancelled) return;
        const e = err as Error;
        if (e.name === 'NotAllowedError') {
          setError('permission');
        } else if (e.name === 'NotFoundError' || e.name === 'NotReadableError') {
          setError('no-camera');
        } else {
          setError('unknown');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [active, hasBarcodeDetector, onScan, stopStream, retryCount]);

  /* ---------- Retry handler ---------- */
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  /* ---------- Toggle torch ---------- */
  const toggleTorch = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const newState = !torchOn;
    track.applyConstraints({
      advanced: [{ torch: newState } as MediaTrackConstraintSet],
    }).catch(() => { /* torch not supported */ });
    setTorchOn(newState);
  }, [torchOn]);

  /* ---------- File upload fallback ---------- */
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const bitmap = await createImageBitmap(file);

        try {
          if (typeof BarcodeDetector !== 'undefined') {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const results = await detector.detect(bitmap);
            if (results.length > 0 && results[0].rawValue) {
              onScan(results[0].rawValue);
              return;
            }
          }
          setError('no-qr-found');
        } finally {
          bitmap.close();
        }
      } catch {
        setError('decode-failed');
      }

      // Reset input for re-selection
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [onScan],
  );

  /* ---------- Error states ---------- */
  if (!hasBarcodeDetector || error === 'no-camera') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center border shadow-xs"
          style={{
            backgroundColor: 'var(--ca-10)',
            borderColor: 'var(--ca-15)',
          }}
        >
          <CameraOff
            size={36}
            style={{ color: 'var(--ca)' }}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {!hasBarcodeDetector ? t.scan.unsupportedTitle : t.scan.noCameraTitle}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            {!hasBarcodeDetector ? t.scan.unsupportedDesc : t.scan.noCameraDesc}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 px-6 py-3.5 btn-accent rounded-xl font-semibold cursor-pointer active:scale-98 action-transition shadow-xs focus-within:outline-hidden focus-within:ring-2 focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950">
          <ImagePlus size={20} aria-hidden="true" />
          {t.scan.uploadImage}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileUpload}
          />
        </label>
      </div>
    );
  }

  if (error === 'permission') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center border shadow-xs"
          style={{
            backgroundColor: 'var(--ca-10)',
            borderColor: 'var(--ca-15)',
          }}
        >
          <CameraOff
            size={36}
            style={{ color: 'var(--ca)' }}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {t.scan.permissionTitle}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            {t.scan.permissionDesc}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-3.5 btn-accent rounded-xl font-semibold active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {t.scan.retry}
          </button>
          <label className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-within:outline-hidden focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100 focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950">
            <ImagePlus size={20} aria-hidden="true" />
            {t.scan.uploadImage}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    );
  }

  if (error === 'unknown') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center border shadow-xs"
          style={{
            backgroundColor: 'var(--ca-10)',
            borderColor: 'var(--ca-15)',
          }}
        >
          <AlertCircle
            size={36}
            style={{ color: 'var(--ca)' }}
            aria-hidden="true"
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {t.scan.unknownErrorTitle}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            {t.scan.unknownErrorDesc}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-3.5 btn-accent rounded-xl font-semibold active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {t.scan.retry}
          </button>
          <label className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-within:outline-hidden focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100 focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950">
            <ImagePlus size={20} aria-hidden="true" />
            {t.scan.uploadImage}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    );
  }

  /* ---------- Camera view with viewfinder ---------- */
  return (
    <div className="relative flex-1 bg-black overflow-hidden">
      {/* Camera video stream */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Viewfinder overlay — dark mask with transparent center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div
          className="w-64 h-64 rounded-2xl relative"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
        >
          {/* Corner brackets */}
          <div
            className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-xl"
            style={{ borderColor: 'var(--ca)' }}
          />
          <div
            className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-xl"
            style={{ borderColor: 'var(--ca)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-xl"
            style={{ borderColor: 'var(--ca)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-xl"
            style={{ borderColor: 'var(--ca)' }}
          />

          {/* Animated scan line */}
          <div
            className="absolute inset-x-4 h-0.5 rounded-full animate-scan-line"
            style={{
              backgroundColor: 'var(--ca)',
              opacity: 0.8,
            }}
          />
        </div>
      </div>

      {/* Hint text — top offset respects safe-area so it clears the status bar in full-screen mode */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+2rem)] inset-x-0 text-center z-20 pointer-events-none">
        <p className="text-white/80 text-sm font-medium drop-shadow-lg px-4">
          {t.scan.hint}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-5 z-20">
        {hasTorch && (
          <button
            type="button"
            onClick={toggleTorch}
            className="p-3.5 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 active:scale-95 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label={torchOn ? t.scan.torchOff : t.scan.torchOn}
          >
            {torchOn ? <ZapOff size={22} aria-hidden="true" /> : <Zap size={22} aria-hidden="true" />}
          </button>
        )}
        <label className="p-3.5 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 cursor-pointer active:scale-95 action-transition focus-within:outline-hidden focus-within:ring-2 focus-within:ring-white/80">
          <ImagePlus size={22} aria-hidden="true" />
          <span className="sr-only">{t.scan.uploadImage}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* Error toasts for file upload failures */}
      {(error === 'no-qr-found' || error === 'decode-failed') && (
        <div className="absolute top-16 inset-x-4 flex justify-center z-30">
          <button
            type="button"
            onClick={() => setError(null)}
            className="bg-red-500/90 text-white px-4 py-2.5 rounded-xl text-sm font-medium backdrop-blur-sm shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/80"
          >
            {error === 'no-qr-found' ? t.scan.noQRFound : t.scan.decodeFailed}
          </button>
        </div>
      )}
    </div>
  );
};
