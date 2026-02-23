import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';
import { formatCurrency } from '../utils/twqr';

interface QRDisplayProps {
  value: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  onClose: () => void;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, onClose }: QRDisplayProps) => {
  const [copyState, setCopyState] = useState<'idle' | 'success'>('idle');
  const [qrSize, setQrSize] = useState(280);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [onClose]);

  useEffect(() => {
    const update = () => {
      setQrSize(Math.max(200, Math.min(300, Math.floor(window.innerWidth * 0.65))));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState('success');
    } catch {
      /* clipboard not available */
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950 px-safe overscroll-contain"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-safe">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={24} aria-hidden="true" />
        </button>
        <h2 id="qr-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-white">
          Payment QR Code
        </h2>
        <div className="w-11" aria-hidden="true" />
      </div>

      {/* QR Code — always black-on-white for maximum scan contrast */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <QRCodeSVG
            value={value}
            size={qrSize}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        {/* Amount & account info */}
        <div className="text-center space-y-2">
          {amount != null && amount > 0 && (
            <div className="text-4xl font-bold text-zinc-900 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(amount)}
            </div>
          )}
          {bankName && (
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">{bankName}</p>
          )}
          {accountNumber && (
            <p className="font-mono text-sm text-zinc-500 tracking-wider">
              {accountNumber.replace(/(.{4})/g, '$1 ').trim()}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pb-safe flex justify-center">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800"
        >
          {copyState === 'success' ? (
            <Check size={18} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy size={18} aria-hidden="true" />
          )}
          <span className="font-medium text-sm">
            {copyState === 'success' ? 'Copied' : 'Copy QR Text'}
          </span>
        </button>
        <span className="sr-only" aria-live="polite">
          {copyState === 'success' ? 'QR text copied' : ''}
        </span>
      </div>
    </div>
  );
};
