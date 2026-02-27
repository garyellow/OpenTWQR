import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useDelayedClose } from '../../hooks/useDelayedClose';
import { useAnimatedToggle } from '../../hooks/useAnimatedToggle';
import { X, Share2, Check, Eye, EyeOff, Copy } from 'lucide-react';
import { formatCurrency, formatAmount, maskAccount, formatAccountDisplay } from '../../utils/twqr';
import { buildShareUrl } from '../../utils/share';
import { svgToBlob, downloadBlob } from '../../utils/qrImage';
import { haptic } from '../../utils/haptics';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { QRFullscreen } from './QRFullscreen';
import { ShareMenu } from '../share/ShareMenu';
import { LinkSettingsDialog } from '../share/LinkSettingsDialog';
import type { ShareData, ExpiryOption } from '../../types';
import { QR_CENTER_IMAGE } from '../../utils/qrLabel';

/** Memoised QR Code to avoid re-rendering when parent state changes. */
const MemoQRCode = memo(QRCodeSVG);

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
  const shareMenu = useAnimatedToggle();
  const linkSettingsToggle = useAnimatedToggle();
  const [linkAction, setLinkAction] = useState<'copy' | 'share'>('copy');
  const [linkExpiry, setLinkExpiry] = useState<ExpiryOption>(0);
  const [linkPassword, setLinkPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [accountRevealed, setAccountRevealed] = useState(false);
  const feedbackTimerRef = useRef<number | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { isClosing, requestClose, onAnimationEnd } = useDelayedClose(onClose);

  /** `navigator.share` is only available in secure contexts (HTTPS / PWA). */
  const supportsNativeShare = typeof navigator.share === 'function';

  // Focus trap: active only when no sub-overlay is on top
  useFocusTrap(modalRef, !shareMenu.isOpen && !linkSettingsToggle.isOpen && !isFullscreen);
  useScrollLock(true);

  const showFeedback = useCallback((msg: string) => {
    haptic();
    setFeedback(msg);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 2000);
  }, []);

  // Cleanup feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Escape handler — closes the topmost active layer
  const shareMenuIsOpen = shareMenu.isOpen;
  const shareMenuClose = shareMenu.close;
  const linkSettingsIsOpen = linkSettingsToggle.isOpen;
  const linkSettingsClose = linkSettingsToggle.close;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isFullscreen) return; // QRFullscreen has its own Escape handler
      if (isEncrypting) return;
      if (linkSettingsIsOpen) { linkSettingsClose(); return; }
      if (shareMenuIsOpen) { shareMenuClose(); return; }
      requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestClose, isFullscreen, shareMenuIsOpen, shareMenuClose, linkSettingsIsOpen, linkSettingsClose, isEncrypting]);

  // Responsive QR size for the modal view
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      setQrSize(Math.max(180, Math.min(260, Math.floor(vw * 0.55))));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* --- Account actions --- */

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

  /* --- Share helpers --- */

  const copyToClipboard = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showFeedback('已複製連結');
    } catch {
      showFeedback('複製失敗');
    }
  }, [showFeedback]);

  const shareViaSystem = useCallback(async (url: string) => {
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
  }, [amount, bankName, copyToClipboard]);

  /* --- Share menu actions --- */

  const handleCopyLink = useCallback(() => {
    shareMenu.close(() => {
      setLinkAction('copy');
      setLinkExpiry(0);
      setLinkPassword('');
      linkSettingsToggle.open();
    });
  }, [shareMenu, linkSettingsToggle]);

  const handleShareLink = useCallback(() => {
    shareMenu.close(() => {
      setLinkAction('share');
      setLinkExpiry(0);
      setLinkPassword('');
      linkSettingsToggle.open();
    });
  }, [shareMenu, linkSettingsToggle]);

  const handleShareImage = useCallback(async () => {
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      if (!svgEl) return;

      const pngBlob = await svgToBlob(svgEl, qrSize);
      const file = new File([pngBlob], 'opentwqr.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'OpenTWQR 收款碼' });
        shareMenu.close();
        return;
      }

      downloadBlob(pngBlob, 'opentwqr.png');
      showFeedback('已下載圖片');
      shareMenu.close();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showFeedback('分享失敗');
      shareMenu.close();
    }
  }, [qrSize, shareMenu, showFeedback]);

  const handleDownloadImage = useCallback(async () => {
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      if (!svgEl) return;

      const pngBlob = await svgToBlob(svgEl, qrSize);
      downloadBlob(pngBlob, 'opentwqr.png');
      showFeedback('已下載圖片');
    } catch {
      showFeedback('下載失敗');
    }
    shareMenu.close();
  }, [qrSize, shareMenu, showFeedback]);

  /* --- Link settings actions --- */

  const handleLinkConfirm = useCallback(async () => {
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
    linkSettingsToggle.close();
  }, [shareData, linkExpiry, linkPassword, linkAction, copyToClipboard, shareViaSystem, showFeedback, linkSettingsToggle]);

  /* --- Main modal --- */
  return (
    <>
    <div ref={modalRef} className="fixed inset-0 z-80">
      {/* Backdrop — animated independently; clicks close the modal */}
      <div
        className={`absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm motion-reduce:animate-none ${
          isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'
        }`}
        onClick={requestClose}
        aria-hidden="true"
      />

      {/* Card centering — pointer-events-none lets clicks fall through to backdrop */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className={`pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-900 rounded-4xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden motion-reduce:animate-none ${isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'}`}
        onAnimationEnd={onAnimationEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 id="qr-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            收款 QR Code
          </h2>
          <button
            type="button"
            onClick={requestClose}
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
            className="bg-white p-5 rounded-2xl shadow-xs border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow active:scale-98 cursor-zoom-in"
          >
            <div ref={qrRef}>
              <MemoQRCode
                value={value}
                size={qrSize}
                level="Q"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#000000"
                imageSettings={QR_CENTER_IMAGE}
              />
            </div>
          </button>

          {/* Amount & account info */}
          <div className="space-y-2.5 w-full">
            {amount != null && amount > 0 ? (
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">NT$</span>
                <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(amount)}
                </span>
              </div>
            ) : (
              <div className="text-lg font-medium text-zinc-400 dark:text-zinc-500 text-center">
                金額由付款方輸入
              </div>
            )}
            <div className="w-full bg-white dark:bg-zinc-900/50 rounded-xl px-4 py-3 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {bankName && (
                    <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-0.5">{bankName}</p>
                  )}
                  {accountNumber && (
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-widest">
                      {accountRevealed
                        ? formatAccountDisplay(accountNumber)
                        : maskAccount(accountNumber)}
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
                      title={accountRevealed ? '隱藏帳號' : '顯示帳號'}
                      className="p-2.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-500"
                    >
                      {accountRevealed
                        ? <Eye size={18} aria-hidden="true" />
                        : <EyeOff size={18} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      aria-label="複製帳號"
                      title="複製帳號"
                      className="p-2.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-500"
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
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">請於銀行 App 核對帳號及戶名後再轉帳</p>
          </div>
        </div>

        {/* Footer — Share button */}
        <div className="p-5 pt-5 relative">
          {/* Feedback toast */}
          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium shadow-lg animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
            >
              <Check size={14} aria-hidden="true" />
              {feedback}
            </div>
          )}

          {!isSharedView && (
            <button
              type="button"
              onClick={() => shareMenu.open()}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 transition-all shadow-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <Share2 size={18} aria-hidden="true" />
              <span>分享</span>
            </button>
          )}
        </div>
      </div>
      </div>
    </div>

    {/* Sub-overlays — rendered outside the main modal to prevent
        animationend events from bubbling into the QR card handler */}

    {/* Share menu overlay */}
    {!isSharedView && shareMenu.isOpen && (
      <ShareMenu
        isClosing={shareMenu.isClosing}
        onClose={() => shareMenu.close()}
        onAnimationEnd={shareMenu.onAnimationEnd}
        onCopyLink={handleCopyLink}
        onShareLink={handleShareLink}
        onShareImage={handleShareImage}
        onDownloadImage={handleDownloadImage}
        supportsNativeShare={supportsNativeShare}
      />
    )}

    {/* Link settings dialog */}
    {!isSharedView && linkSettingsToggle.isOpen && (
      <LinkSettingsDialog
        isClosing={linkSettingsToggle.isClosing}
        onClose={() => !isEncrypting && linkSettingsToggle.close()}
        onAnimationEnd={linkSettingsToggle.onAnimationEnd}
        action={linkAction}
        expiry={linkExpiry}
        setExpiry={setLinkExpiry}
        password={linkPassword}
        setPassword={setLinkPassword}
        isEncrypting={isEncrypting}
        onConfirm={handleLinkConfirm}
      />
    )}

    {/* Fullscreen QR view */}
    {isFullscreen && (
      <QRFullscreen
        value={value}
        amount={amount}
        bankName={bankName}
        note={note}
        onExit={() => setIsFullscreen(false)}
      />
    )}
    </>
  );
};
