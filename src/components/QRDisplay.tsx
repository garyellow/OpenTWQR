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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 sm:p-6 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 id="qr-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Payment QR
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* QR Code — always black-on-white for maximum scan contrast */}
        <div className="flex flex-col items-center justify-center px-8 gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <QRCodeSVG
              value={value}
              size={qrSize}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* Amount & account info */}
          <div className="text-center space-y-3 w-full">
            {amount != null && amount > 0 && (
              <div className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(amount)}
              </div>
            )}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800/50">
              {bankName && (
                <p className="text-zinc-900 dark:text-white font-semibold text-base mb-1">{bankName}</p>
              )}
              {accountNumber && (
                <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400 tracking-widest">
                  {accountNumber.replace(/(.{4})/g, '$1 ').trim()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-8">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-sm font-semibold"
          >
            {copyState === 'success' ? (
              <Check size={20} className="text-emerald-400 dark:text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy size={20} aria-hidden="true" />
            )}
            <span>
              {copyState === 'success' ? 'Copied to Clipboard' : 'Copy QR Text'}
            </span>
          </button>
          <span className="sr-only" aria-live="polite">
            {copyState === 'success' ? 'QR text copied' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
