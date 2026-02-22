import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Sun, SunDim, Copy, Check } from 'lucide-react';
import { formatCurrency } from '../utils/twqr';

interface QRDisplayProps {
  value: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  onClose: () => void;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, onClose }: QRDisplayProps) => {
  const [isBright, setIsBright] = useState(true);
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const [qrSize, setQrSize] = useState(280);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const updateQrSize = () => {
      const nextSize = Math.max(220, Math.min(320, Math.floor(window.innerWidth * 0.68)));
      setQrSize(nextSize);
    };

    updateQrSize();
    window.addEventListener('resize', updateQrSize);

    return () => {
      window.removeEventListener('resize', updateQrSize);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }

    setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="qr-modal-title" className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 px-safe">
      <div className="flex items-center justify-between p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close QR screen"
          className="p-3 rounded-full bg-zinc-800/50 text-white hover:bg-zinc-700 transition-colors border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          <X size={24} />
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsBright(!isBright)}
            aria-label={isBright ? 'Switch to dim mode' : 'Switch to bright mode'}
            className={`p-3 rounded-full transition-[background-color,color,border-color,box-shadow] border focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              isBright
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'
            }`}
          >
            {isBright ? <Sun size={24} /> : <SunDim size={24} />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10">
        <h2 id="qr-modal-title" className="sr-only">QR code payment</h2>
        <div className={`relative p-6 rounded-[2.5rem] bg-white shadow-2xl transition-[transform,box-shadow] duration-500 transform ${
          isBright ? 'scale-105 shadow-[0_0_80px_rgba(255,255,255,0.25)]' : 'scale-100'
        }`}>
          <div className="absolute inset-0 border-[6px] border-emerald-500/10 rounded-[2.5rem] pointer-events-none"></div>
          <QRCodeSVG
            value={value}
            size={qrSize}
            level="H"
            includeMargin={true}
            className="rounded-2xl"
          />
          <div className="absolute -bottom-14 left-0 right-0 flex justify-center">
             <div className="bg-zinc-900 text-emerald-400 font-bold px-6 py-2.5 rounded-full border border-zinc-800 shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm tracking-wider font-medium text-white">TWQR PAY</span>
             </div>
          </div>
        </div>

        <div className="text-center space-y-3 mt-8">
          {amount != null && (
            <div className="flex flex-col items-center">
              <span className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Total Amount</span>
              <div className="text-5xl font-bold text-white tracking-tight">
                {formatCurrency(amount)}
              </div>
            </div>
          )}
          <div className="space-y-1 pt-2">
            <div className="text-zinc-300 font-medium text-lg">
              {bankName}
            </div>
            <div className="font-mono text-zinc-500 tracking-wider bg-zinc-900/50 px-3 py-1 rounded-lg inline-block border border-zinc-800/50">
              {accountNumber?.replace(/(.{4})/g, '$1 ').trim()}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 pb-12 flex justify-center">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-3 px-8 py-4 rounded-full bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-[background-color,color,transform] active:scale-95 border border-zinc-800 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          {copyState === 'success' ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
          <span className="font-medium text-base">
            {copyState === 'success' ? 'Copied QR Text' : 'Copy QR Text'}
          </span>
        </button>
        <span className="sr-only" aria-live="polite">
          {copyState === 'success' ? 'QR text copied' : copyState === 'error' ? 'Unable to copy QR text' : ''}
        </span>
      </div>
    </div>
  );
};
