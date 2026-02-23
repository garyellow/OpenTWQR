import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Link2, Image, Download, Check, Copy } from 'lucide-react';
import { formatCurrency } from '../utils/twqr';

interface QRDisplayProps {
  value: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  note?: string;
  shareUrl?: string;
  onClose: () => void;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, note, shareUrl, onClose }: QRDisplayProps) => {
  const [qrSize, setQrSize] = useState(240);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2000);
  }, []);

  const handleCopyAccount = useCallback(async () => {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      showFeedback('已複製帳號');
    } catch {
      showFeedback('複製失敗');
    }
  }, [accountNumber, showFeedback]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else if (showShareMenu) setShowShareMenu(false);
        else onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [onClose, isFullscreen, showShareMenu]);

  useEffect(() => {
    const update = () => {
      // Responsive QR size: fit well on 320px–430px viewports
      const vw = window.innerWidth;
      setQrSize(Math.max(180, Math.min(260, Math.floor(vw * 0.55))));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* --- Share actions --- */
  const handleShareLink = async () => {
    const url = shareUrl || window.location.href;
    const shareData = {
      title: 'OpenTWQR 收款',
      text: `收款${amount && amount > 0 ? ` ${formatCurrency(amount)}` : ''}${bankName ? ` — ${bankName}` : ''}`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShowShareMenu(false);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      showFeedback('已複製連結');
    } catch {
      showFeedback('複製失敗');
    }
    setShowShareMenu(false);
  };

  const handleShareImage = async () => {
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      if (!svgEl) return;

      const canvas = document.createElement('canvas');
      const padding = 32;
      const size = qrSize + padding * 2;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const img = new window.Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, padding, padding, qrSize, qrSize);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      const pngBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      );
      const file = new File([pngBlob], 'opentwqr.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'OpenTWQR 收款碼',
        });
        setShowShareMenu(false);
        return;
      }

      // Fallback to download
      downloadBlob(pngBlob, 'opentwqr.png');
      showFeedback('已下載 QR Code');
      setShowShareMenu(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showFeedback('分享失敗');
      setShowShareMenu(false);
    }
  };

  const handleDownloadImage = async () => {
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      if (!svgEl) return;

      const canvas = document.createElement('canvas');
      const padding = 32;
      const size = qrSize + padding * 2;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const img = new window.Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, padding, padding, qrSize, qrSize);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      const pngBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      );
      downloadBlob(pngBlob, 'opentwqr.png');
      showFeedback('已下載圖片');
    } catch {
      showFeedback('下載失敗');
    }
    setShowShareMenu(false);
  };

  /* --- Fullscreen QR view --- */
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[90] bg-black flex flex-col items-center justify-center cursor-pointer animate-in fade-in duration-200"
        onClick={() => setIsFullscreen(false)}
      >
        <div className="bg-white p-8 rounded-3xl shadow-[0_0_80px_rgba(255,255,255,0.08)]">
          <QRCodeSVG
            value={value}
            size={Math.min(320, Math.floor(window.innerWidth * 0.75))}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        {/* Info below QR */}
        <div className="mt-8 text-center space-y-2">
          {amount != null && amount > 0 ? (
            <p className="text-3xl font-bold text-white/90" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(amount)}
            </p>
          ) : (
            <p className="text-lg font-medium text-white/50">
              金額由付款方輸入
            </p>
          )}
          {bankName && <p className="text-white/60 text-sm">{bankName}</p>}
          {note && <p className="text-white/40 text-xs">{note}</p>}
        </div>

        <p className="mt-10 text-white/30 text-xs animate-pulse">點擊任意處返回</p>
      </div>
    );
  }

  /* --- Main modal --- */
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm p-4 sm:p-6 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 id="qr-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            收款 QR Code
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="p-2 -mr-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* QR Code — tappable for fullscreen */}
        <div className="flex flex-col items-center justify-center px-6 gap-5">
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label="放大 QR Code"
            className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow active:scale-[0.98] cursor-zoom-in"
          >
            <div ref={qrRef}>
              <QRCodeSVG
                value={value}
                size={qrSize}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </button>

          {/* Amount & account info */}
          <div className="text-center space-y-2.5 w-full">
            {amount != null && amount > 0 ? (
              <div className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(amount)}
              </div>
            ) : (
              <div className="text-lg font-medium text-zinc-400 dark:text-zinc-500">
                金額由付款方輸入
              </div>
            )}
            <button
              type="button"
              onClick={handleCopyAccount}
              disabled={!accountNumber}
              aria-label="點擊複製帳號"
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800/50 text-left group transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-default disabled:hover:bg-zinc-50 dark:disabled:hover:bg-zinc-800/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {bankName && (
                    <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-0.5">{bankName}</p>
                  )}
                  {accountNumber && (
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-widest">
                      {accountNumber.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                  )}
                </div>
                {accountNumber && (
                  <Copy
                    size={14}
                    className="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 transition-colors"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
            {note && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">備註：{note}</p>
            )}
            <p className="text-xs text-zinc-300 dark:text-zinc-600">請於銀行 App 核對帳號後再轉帳</p>
          </div>
        </div>

        {/* Footer — Share button */}
        <div className="p-5 pt-5 relative">
          {/* Feedback toast */}
          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium shadow-lg animate-in fade-in zoom-in-95 duration-150"
            >
              <Check size={14} aria-hidden="true" />
              {feedback}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowShareMenu(true)}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 active:scale-[0.98] transition-[transform,background-color,color,box-shadow] shadow-sm font-semibold"
          >
            <Share2 size={18} aria-hidden="true" />
            <span>分享</span>
          </button>
        </div>
      </div>

      {/* Share menu overlay */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center"
          onClick={() => setShowShareMenu(false)}
        >
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
          <div
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl border-t border-zinc-200/50 dark:border-zinc-800/50 sm:border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="p-2 pt-4 sm:pt-2">
              <button
                type="button"
                onClick={handleShareLink}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Link2 size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">分享連結</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">傳送收款頁面連結給對方</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleShareImage}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Image size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">分享圖片</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">將 QR Code 圖片傳送給對方</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Download size={20} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">下載圖片</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">儲存 QR Code 至裝置</p>
                </div>
              </button>
            </div>

            <div className="p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setShowShareMenu(false)}
                className="w-full py-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
