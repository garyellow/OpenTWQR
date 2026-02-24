import { useEffect, useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Link2, Image, Download, Check, Eye, EyeOff, Copy, Clipboard, Lock, Clock, Loader2 } from 'lucide-react';
import { formatCurrency, formatAmount, maskAccount, formatAccountDisplay } from '../utils/twqr';
import { buildShareUrl } from '../utils/share';
import type { ShareData, ExpiryOption } from '../types';

interface QRDisplayProps {
  value: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  note?: string;
  shareData: ShareData;
  onClose: () => void;
  /** When true (SharedPage), hide re-link options to prevent expiry bypass */
  isSharedView?: boolean;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, note, shareData, onClose, isSharedView = false }: QRDisplayProps) => {
  const [qrSize, setQrSize] = useState(240);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkAction, setLinkAction] = useState<'copy' | 'share' | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<ExpiryOption>(0);
  const [linkPassword, setLinkPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [accountRevealed, setAccountRevealed] = useState(false);
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

  const handleToggleReveal = useCallback(() => {
    setAccountRevealed((prev) => !prev);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else if (isEncrypting) { /* ignore while encrypting */ }
        else if (linkAction) setLinkAction(null);
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
  }, [onClose, isFullscreen, showShareMenu, linkAction, isEncrypting]);

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
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showFeedback('已複製連結');
    } catch {
      showFeedback('複製失敗');
    }
  };

  const shareViaSystem = async (url: string) => {
    const payload = {
      title: 'OpenTWQR 收款',
      text: `收款${amount && amount > 0 ? ` ${formatCurrency(amount)}` : ''}${bankName ? ` — ${bankName}` : ''}`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await copyToClipboard(url);
  };

  const handleCopyLink = async () => {
    setShowShareMenu(false);
    setLinkAction('copy');
    setLinkExpiry(0);
    setLinkPassword('');
  };

  const handleShareLink = () => {
    setShowShareMenu(false);
    setLinkAction('share');
    setLinkExpiry(0);
    setLinkPassword('');
  };

  const handleLinkConfirm = async () => {
    if (!linkAction) return;
    setIsEncrypting(true);
    try {
      const url = await buildShareUrl(shareData, { expiry: linkExpiry, password: linkPassword });
      if (linkAction === 'copy') {
        await copyToClipboard(url);
      } else {
        await shareViaSystem(url);
      }
    } catch {
      showFeedback('加密失敗');
    }
    setIsEncrypting(false);
    setLinkAction(null);
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
      showFeedback('已下載圖片');
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
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-xl font-semibold text-emerald-400">NT$</span>
              <span className="text-3xl font-bold text-white/90" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(amount)}
              </span>
            </div>
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
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
          <div className="space-y-2.5 w-full">
            {amount != null && amount > 0 ? (
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-semibold text-emerald-500 dark:text-emerald-400">NT$</span>
                <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(amount)}
                </span>
              </div>
            ) : (
              <div className="text-lg font-medium text-zinc-400 dark:text-zinc-500 text-center">
                金額由付款方輸入
              </div>
            )}
            <div className="w-full bg-white dark:bg-zinc-900/50 rounded-xl px-4 py-3 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {bankName && (
                    <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-0.5">{bankName}</p>
                  )}
                  {accountNumber && (
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-widest">
                      <span
                        key={accountRevealed ? 'revealed' : 'masked'}
                        className="animate-in fade-in duration-200"
                      >
                        {accountRevealed
                          ? formatAccountDisplay(accountNumber)
                          : maskAccount(accountNumber)}
                      </span>
                    </p>
                  )}
                </div>
                {accountNumber && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleReveal}
                      aria-label={accountRevealed ? '隱藏帳號' : '顯示帳號'}
                      aria-pressed={accountRevealed}
                      className="p-2.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                      <span key={accountRevealed ? 'eye-on' : 'eye-off'} className="block animate-in fade-in zoom-in-75 duration-150">
                        {accountRevealed
                          ? <Eye size={18} aria-hidden="true" />
                          : <EyeOff size={18} aria-hidden="true" />}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      aria-label="複製帳號"
                      className="p-2.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                      <Copy size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {note && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">備註：{note}</p>
            )}
            <p className="text-xs text-zinc-300 dark:text-zinc-600 text-center">請於銀行 App 核對帳號及戶名後再轉帳</p>
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

          {!isSharedView && (
            <button
              type="button"
              onClick={() => setShowShareMenu(true)}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <Share2 size={18} aria-hidden="true" />
              <span>分享</span>
            </button>
          )}
        </div>
      </div>

      {/* Share menu overlay — centered card */}
      {!isSharedView && showShareMenu && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center p-5 animate-in fade-in duration-150"
          onClick={() => setShowShareMenu(false)}
        >
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
          <div
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 pt-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Clipboard size={20} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">複製連結</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">複製收款頁面連結到剪貼簿</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleShareLink}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Link2 size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">分享連結</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">透過系統分享模組傳送連結</p>
                </div>
              </button>

              <div className="my-1 mx-2 border-t border-zinc-100 dark:border-zinc-800" />

              <button
                type="button"
                onClick={handleShareImage}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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

            <div className="p-2 pb-3">
              <button
                type="button"
                onClick={() => setShowShareMenu(false)}
                className="w-full py-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link settings dialog — expiry & password */}
      {!isSharedView && linkAction && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center p-5 animate-in fade-in duration-150"
          onClick={() => !isEncrypting && setLinkAction(null)}
        >
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-settings-title"
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200 p-6 overflow-y-auto max-h-[calc(100svh-2.5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 id="link-settings-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                分享連結設定
              </h3>
              <button
                type="button"
                onClick={() => setLinkAction(null)}
                disabled={isEncrypting}
                aria-label="關閉"
                className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Expiry options */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                <Clock size={16} aria-hidden="true" />
                連結到期時間
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  [0, '不限制'],
                  [600, '10 分鐘'],
                  [3600, '1 小時'],
                  [86400, '1 天'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLinkExpiry(val)}
                    disabled={isEncrypting}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      linkExpiry === val
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3" htmlFor="link-password-input">
                <Lock size={16} aria-hidden="true" />
                連結密碼
                <span className="font-normal text-zinc-400 dark:text-zinc-500">（選填）</span>
              </label>
              <input
                type="password"
                id="link-password-input"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isEncrypting) {
                    e.preventDefault();
                    handleLinkConfirm();
                  }
                }}
                disabled={isEncrypting}
                placeholder="不設定密碼則留空"
                autoComplete="new-password"
                className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm disabled:opacity-50"
              />
            </div>

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleLinkConfirm}
              disabled={isEncrypting}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              {isEncrypting ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  加密中…
                </>
              ) : (
                <>
                  {linkAction === 'copy' ? <Clipboard size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
                  {linkAction === 'copy' ? '複製連結' : '分享連結'}
                </>
              )}
            </button>
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
