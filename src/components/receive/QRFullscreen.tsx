import { useEffect, useRef, useState } from 'react';
import { formatAmount } from '../../utils/twqr';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDelayedClose } from '../../hooks/useDelayedClose';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { StyledQRCode, type StyledQRCodeCenterImage } from './StyledQRCode';
import type { QRDotStyle, QREyeStyle } from '../../types';

interface QRFullscreenProps {
  value: string;
  amount?: number;
  bankName?: string;
  note?: string;
  onExit: () => void;
  /** Dynamic center image settings (passed from QRDisplay). */
  qrCenterImage: StyledQRCodeCenterImage | undefined;
  /** Custom display name from QR settings. */
  customName?: string;
  /** Whether to show bank name label from QR settings. */
  showBankName?: boolean;
  /** Masked account number to show above QR if showAccount is true. */
  accountNumber?: string;
  /** Bank code displayed alongside masked account. */
  bankCode?: string;
  /** Whether to show masked account number above QR. */
  showAccount?: boolean;
  /** Whether to show revealed (unmasked) account number. */
  accountRevealed?: boolean;
  /** QR dot shape — passed from QRDisplay to respect isSharedView defaults. */
  dotStyle?: QRDotStyle;
  /** QR finder-pattern shape. */
  eyeStyle?: QREyeStyle;
}

/**
 * Full-black QR Code view for in-store payments.
 * Includes Screen Wake Lock and landscape-aware sizing.
 */
export const QRFullscreen = ({ value, amount, bankName, note, onExit, qrCenterImage, customName, showBankName, accountNumber, bankCode, showAccount, accountRevealed = false, dotStyle = 'square', eyeStyle = 'square' }: QRFullscreenProps) => {
  const t = useLocaleStore((s) => s.t);
  const ref = useRef<HTMLDivElement>(null);
  const { isClosing, requestClose, onAnimationEnd } = useDelayedClose(onExit, { historyBack: true });
  const [qrSize, setQrSize] = useState(() =>
    Math.min(320, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.75)),
  );

  useFocusTrap(ref, true);

  // Landscape-aware responsive QR sizing
  useEffect(() => {
    const update = () => {
      setQrSize(Math.min(320, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.75)));
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Screen Wake Lock — keep display on while showing QR
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        /* not supported or permission denied — silent fail */
      }
    };

    request();

    // Re-request when tab regains focus (wake lock is released on visibility change)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      wakeLock?.release();
    };
  }, []);

  // Escape key exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t.qr.fullscreenLabel}
      className={`fixed inset-0 z-90 bg-black flex flex-col items-center justify-center cursor-pointer overscroll-contain motion-reduce:animate-none ${
        isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'
      }`}
      onClick={requestClose}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="flex flex-col items-center cursor-default" onClick={(event) => event.stopPropagation()}>
        <div className="bg-white p-8 rounded-2xl shadow-[0_0_80px_rgba(255,255,255,0.08)]">
          {/* Custom name inside white card, above QR */}
          {customName && (
            <p className="text-sm font-semibold text-zinc-800 text-center mb-4">{customName}</p>
          )}
          <StyledQRCode
            value={value}
            size={qrSize}
            dotStyle={dotStyle}
            eyeStyle={eyeStyle}
            centerImage={qrCenterImage}
          />
          {/* Bank name + code below QR inside white card */}
          {showBankName && bankName && bankCode && (
            <p className="text-xs text-zinc-400 text-center mt-1.5 leading-tight">
              ({bankCode}) {bankName}
            </p>
          )}
          {/* Account number — invisible when hidden to preserve height */}
          {showAccount && accountNumber && (
            <p className={`font-mono text-xs text-zinc-400 text-center mt-0.5 leading-tight${accountRevealed ? '' : ' invisible'}`}>
              {accountNumber}
            </p>
          )}
        </div>

        {/* Info below QR card */}
        <div className="mt-8 text-center space-y-2">
          {amount != null && amount > 0 ? (
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-xl font-semibold" style={{ color: 'var(--accent-dark)' }}>NT$</span>
              <span className="text-3xl font-bold text-white/90" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(amount)}
              </span>
            </div>
          ) : (
            <p className="text-lg font-medium text-white/50">{t.amount.payerEnter}</p>
          )}
          {note && <p className="text-white/50 text-xs">{t.qr.notePrefix}{note}</p>}
        </div>

        <button
          type="button"
          onClick={requestClose}
          aria-label={t.qr.fullscreenClose}
          className="mt-10 text-white/60 text-xs transition-opacity hover:text-white/80"
        >
          {t.qr.fullscreenHint}
        </button>
      </div>
    </div>
  );
};
