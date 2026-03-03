import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useDelayedClose } from '../../hooks/useDelayedClose';
import { useAnimatedToggle } from '../../hooks/useAnimatedToggle';
import { X, Share2, Check, Eye, EyeOff, Copy, ExternalLink, ScanLine, Pencil } from 'lucide-react';
import { formatCurrency, formatAmount, maskAccount, formatAccountDisplay } from '../../utils/twqr';
import { buildShareUrl } from '../../utils/share';
import { canvasToBlob, downloadBlob } from '../../utils/qrImage';
import { haptic } from '../../utils/haptics';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { QRFullscreen } from './QRFullscreen';
import { ShareMenu } from '../share/ShareMenu';
import { LinkSettingsDialog } from '../share/LinkSettingsDialog';
import type { ShareData, ExpiryOption } from '../../types';
import { QR_CENTER_IMAGE_VERTICAL } from '../../utils/qrLabel';
import { StyledQRCode, type StyledQRCodeHandle, type StyledQRCodeCenterImage } from './StyledQRCode';

interface QRDisplayProps {
  value: string;
  amount?: number;
  bankName?: string;
  accountNumber?: string;
  bankCode?: string;
  note?: string;
  shareData: ShareData;
  onClose: () => void;
  /** When true (SharedPage), hide re-link options to prevent expiry bypass */
  isSharedView?: boolean;
  /** Bank favicon / icon URL for centre logo when logo type is 'bank'. */
  bankIconUrl?: string;
  /** URL scheme / Universal Link for the payer's bank app (scan result context). */
  bankUrl?: string;
  /** When provided, a "重新掃描" button is shown and the modal acts as a scan result view. */
  onRescan?: () => void;
  /** Override the modal header title (defaults to t.qr.title). */
  title?: string;
  /** When true, hides the X close button and disables backdrop-click-to-close.
   *  Used when QRDisplay is the primary scan result view (no underlying content). */
  hideClose?: boolean;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, bankCode, note, shareData, onClose, isSharedView = false, bankIconUrl, bankUrl, onRescan, title, hideClose = false }: QRDisplayProps) => {
  const t = useLocaleStore((s) => s.t);
  const storedLogoType = useQRSettingsStore((s) => s.logoType);
  const storedShowAccount = useQRSettingsStore((s) => s.showAccount);
  const storedShowBankName = useQRSettingsStore((s) => s.showBankName);
  const storedCustomName = useQRSettingsStore((s) => s.customName);
  const storedDotStyle = useQRSettingsStore((s) => s.dotStyle);
  const storedEyeStyle = useQRSettingsStore((s) => s.eyeStyle);
  const storedErrorLevel = useQRSettingsStore((s) => s.errorLevel);

  // Shared view always uses defaults — viewer's personal settings must not leak.
  const logoType = isSharedView ? 'opentwqr' as const : storedLogoType;
  const showAccountSetting = isSharedView ? false : storedShowAccount;
  const showBankNameSetting = isSharedView ? false : storedShowBankName;
  const customName = isSharedView ? '' : storedCustomName;
  const dotStyle = isSharedView ? 'square' as const : storedDotStyle;
  const eyeStyle = isSharedView ? 'square' as const : storedEyeStyle;
  const errorLevel = isSharedView ? 'Q' as const : storedErrorLevel;

  /** Whether any bank label will be shown BELOW the QR code. */
  const hasBankLabel = showBankNameSetting && Boolean(bankName) && Boolean(bankCode);

  /**
   * Bank icon info — dimensions + optional data URI for export-safe SVG.
   * Stores the URL it was loaded from so stale data is never used.
   */
  const [bankIconInfo, setBankIconInfo] = useState<{
    url: string;
    width: number;
    height: number;
    dataUri?: string;
  } | null>(null);

  useEffect(() => {
    if (logoType !== 'bank' || !bankIconUrl) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const MAX_W = 56;
      const MAX_H = 36;
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = MAX_W;
      let h = w / ratio;
      if (h > MAX_H) {
        h = MAX_H;
        w = h * ratio;
      }
      const info = { url: bankIconUrl, width: Math.round(w), height: Math.round(h) };
      setBankIconInfo(info);
      // Convert to data URI so the SVG <image> uses an inline source,
      // making PNG export reliable (external URLs are blocked in blob SVGs).
      fetch(bankIconUrl)
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            }),
        )
        .then((uri) => {
          if (!cancelled) setBankIconInfo({ ...info, dataUri: uri });
        })
        .catch(() => {
          /* CORS blocked — centerImageForQR will be undefined; QR renders without bank icon */
        });
    };
    img.onerror = () => {
      if (!cancelled) setBankIconInfo(null);
    };
    img.src = bankIconUrl;
    return () => {
      cancelled = true;
    };
  }, [logoType, bankIconUrl]);

  /**
   * QR center image passed to StyledQRCode.
   *
   * Bank icon: only shown once the data URI is available (avoids canvas
   * taint from external URLs, which would break PNG export).
   * OpenTWQR logo: always available as a data URI.
   */
  const centerImageForQR = useMemo((): StyledQRCodeCenterImage | undefined => {
    if (logoType === 'bank') {
      if (bankIconUrl && bankIconInfo?.url === bankIconUrl && bankIconInfo?.dataUri) {
        return { src: bankIconInfo.dataUri, width: bankIconInfo.width, height: bankIconInfo.height };
      }
      return undefined; // not yet loaded or CORS blocked
    }
    const logo = QR_CENTER_IMAGE_VERTICAL;
    return { src: logo.src, width: logo.width, height: logo.height };
  }, [logoType, bankIconUrl, bankIconInfo]);

  const [qrSize, setQrSize] = useState(240);
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** Local per-session custom name — seeded from store but editable without persisting. */
  const [localCustomName, setLocalCustomName] = useState(customName);
  const [isEditingName, setIsEditingName] = useState(false);
  const shareMenu = useAnimatedToggle();
  const linkSettingsToggle = useAnimatedToggle();
  const [linkAction, setLinkAction] = useState<'copy' | 'share'>('copy');
  const [linkExpiry, setLinkExpiry] = useState<ExpiryOption>(0);
  const [linkPassword, setLinkPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackClosing, setFeedbackClosing] = useState(false);
  /**
   * Reveal state — seeded from showAccountSetting so the initial visibility
   * matches the user's QR preference. Once the modal is open, the eye icon
   * toggles this independently of the setting; showAccountSetting is NOT
   * re-consulted after initialisation.
   *
   * Both masked and revealed strings always have the same character count
   * (same padding algorithm), so swapping content never causes layout shifts.
   */
  const [accountRevealed, setAccountRevealed] = useState(showAccountSetting);
  const feedbackShowTimerRef = useRef<number | null>(null);
  const feedbackHideTimerRef = useRef<number | null>(null);
  const qrRef = useRef<StyledQRCodeHandle>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * Returns the underlying QR canvas element for PNG export.
   * StyledQRCode always uses data URIs for the centre logo, so the canvas
   * is never tainted by cross-origin resources.
   */
  const getExportCanvas = useCallback((): HTMLCanvasElement | null => {
    return qrRef.current?.getCanvas() ?? null;
  }, []);

  /**
   * Labels to include in exported PNG images.
   * Order: customName above QR, bankLine + accountLine below QR.
   */
  const exportLabels = useMemo(() => ({
    customName: localCustomName.trim() || undefined,
    bankLine: showBankNameSetting && bankName && bankCode
      ? `（${bankCode}） ${bankName}`
      : undefined,
    accountLine: accountRevealed && accountNumber
      ? formatAccountDisplay(accountNumber)
      : undefined,
  }), [accountRevealed, accountNumber, showBankNameSetting, bankName, bankCode, localCustomName]);

  const { isClosing, requestClose, onAnimationEnd } = useDelayedClose(onClose);

  /** `navigator.share` is only available in secure contexts (HTTPS / PWA). */
  const supportsNativeShare = typeof navigator.share === 'function';

  /** `ClipboardItem` + `navigator.clipboard.write` for copying images. */
  const supportsClipboardWrite = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';

  // Focus trap: active only when no sub-overlay is on top
  useFocusTrap(modalRef, !shareMenu.isOpen && !linkSettingsToggle.isOpen && !isFullscreen);
  useScrollLock(true);

  const showFeedback = useCallback((msg: string) => {
    haptic();
    // Cancel any in-flight timers
    if (feedbackShowTimerRef.current) window.clearTimeout(feedbackShowTimerRef.current);
    if (feedbackHideTimerRef.current) window.clearTimeout(feedbackHideTimerRef.current);
    // Show immediately (restart)
    setFeedbackClosing(false);
    setFeedback(msg);
    // Begin closing animation at 2 300 ms—toast disappears at 2 500 ms total
    feedbackShowTimerRef.current = window.setTimeout(() => {
      setFeedbackClosing(true);
      feedbackHideTimerRef.current = window.setTimeout(() => {
        setFeedback(null);
        setFeedbackClosing(false);
      }, 200);
    }, 2300);
  }, []);

  // Cleanup both feedback timers on unmount
  useEffect(() => {
    return () => {
      if (feedbackShowTimerRef.current) window.clearTimeout(feedbackShowTimerRef.current);
      if (feedbackHideTimerRef.current) window.clearTimeout(feedbackHideTimerRef.current);
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
      setQrSize(Math.max(180, Math.min(280, Math.floor(vw * 0.58))));
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
      showFeedback(t.qr.copiedAccount);
    } catch {
      showFeedback(t.qr.copyFailed);
    }
  }, [accountNumber, showFeedback, t]);

  const handleToggleReveal = useCallback(() => {
    setAccountRevealed((prev) => !prev);
  }, []);

  /* --- Share helpers --- */

  const copyToClipboard = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showFeedback(t.share.copiedLink);
    } catch {
      showFeedback(t.qr.copyFailed);
    }
  }, [showFeedback, t]);

  const shareViaSystem = useCallback(async (url: string) => {
    const payload = {
      title: t.qr.shareTitle,
      text: t.qr.shareText(amount && amount > 0 ? formatCurrency(amount) : '', bankName || ''),
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
  }, [amount, bankName, copyToClipboard, t]);

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
      const qrCanvas = getExportCanvas();
      if (!qrCanvas) return;

      const pngBlob = await canvasToBlob(qrCanvas, qrSize, 32, exportLabels);
      const file = new File([pngBlob], 'opentwqr.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t.qr.shareImageTitle });
        shareMenu.close();
        return;
      }

      downloadBlob(pngBlob, 'opentwqr.png');
      showFeedback(t.share.downloadedImage);
      shareMenu.close();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showFeedback(t.share.shareFailed);
      shareMenu.close();
    }
  }, [getExportCanvas, qrSize, exportLabels, shareMenu, showFeedback, t]);

  const handleDownloadImage = useCallback(async () => {
    try {
      const qrCanvas = getExportCanvas();
      if (!qrCanvas) return;

      const pngBlob = await canvasToBlob(qrCanvas, qrSize, 32, exportLabels);
      downloadBlob(pngBlob, 'opentwqr.png');
      showFeedback(t.share.downloadedImage);
    } catch {
      showFeedback(t.share.downloadFailed);
    }
    shareMenu.close();
  }, [getExportCanvas, qrSize, exportLabels, shareMenu, showFeedback, t]);

  const handleCopyImage = useCallback(async () => {
    try {
      const qrCanvas = getExportCanvas();
      if (!qrCanvas) return;

      const pngBlob = await canvasToBlob(qrCanvas, qrSize, 32, exportLabels);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);
      showFeedback(t.share.copiedImage);
    } catch {
      showFeedback(t.qr.copyFailed);
    }
    shareMenu.close();
  }, [getExportCanvas, qrSize, exportLabels, shareMenu, showFeedback, t]);

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
      showFeedback(t.linkSettings.createFailed);
    }
    setIsEncrypting(false);
    linkSettingsToggle.close();
  }, [shareData, linkExpiry, linkPassword, linkAction, copyToClipboard, shareViaSystem, showFeedback, linkSettingsToggle, t]);

  /* --- Main modal --- */
  return (
    <>
    <div ref={modalRef} className="fixed inset-0 z-80">
      {/* Backdrop — animated independently; clicks close the modal */}
      <div
        className={`absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm motion-reduce:animate-none ${
          isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'
        }`}
        onClick={hideClose ? undefined : requestClose}
        aria-hidden="true"
      />

      {/* Card centering — pointer-events-none lets clicks fall through to backdrop */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className={`pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden motion-reduce:animate-none ${isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'}`}
        onAnimationEnd={onAnimationEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 id="qr-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title ?? t.qr.title}
          </h2>
          {!hideClose && (
            <button
              type="button"
              onClick={requestClose}
              aria-label={t.common.close}
              className="p-2.5 min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* QR Code section */}
        <div className="flex flex-col items-center justify-center px-6 gap-4">

          {/* Custom name — editable per session (only in own QR view) */}
          {!isSharedView && (
            <div className="w-full flex items-center justify-center min-h-8">
              {isEditingName ? (
                <input
                  type="text"
                  value={localCustomName}
                  onChange={(e) => setLocalCustomName(e.target.value.slice(0, 50))}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  placeholder={t.qr.customNamePlaceholder}
                  aria-label={t.qr.editCustomName}
                  className="w-full text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-zinc-300 dark:border-zinc-600 focus-visible:outline-none focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 pb-0.5 placeholder-zinc-400 dark:placeholder-zinc-500"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  aria-label={t.qr.editCustomName}
                  className="group flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-lg py-1 px-2"
                >
                  {localCustomName.trim() ? (
                    <>
                      <span>{localCustomName.trim()}</span>
                      <Pencil size={12} className="text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
                    </>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 font-normal">{t.qr.addCustomName}</span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* QR Code — tappable for fullscreen */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label={t.qr.enlargeQR}
            className="bg-white p-5 rounded-xl shadow-xs border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow active:scale-98 cursor-zoom-in"
          >
            <StyledQRCode
              ref={qrRef}
              value={value}
              size={qrSize}
              dotStyle={dotStyle}
              eyeStyle={eyeStyle}
              errorLevel={errorLevel}
              centerImage={centerImageForQR}
            />
            {/* Bank name + code below QR */}
            {hasBankLabel && (
              <p className="text-xs text-zinc-400 text-center mt-1.5 leading-tight">
                （{bankCode}） {bankName}
              </p>
            )}
          </button>

          {/* Amount & account info */}
          <div className="space-y-2.5 w-full">
            {amount != null && amount > 0 ? (
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-semibold" style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }}>NT$</span>
                <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(amount)}
                </span>
              </div>
            ) : (
              <div className="text-lg font-medium text-zinc-500 dark:text-zinc-400 text-center">
                {t.amount.payerEnter}
              </div>
            )}
            <div className="w-full bg-white dark:bg-zinc-900/50 rounded-xl px-4 py-3 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {bankName && bankCode && (
                    <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-0.5">
                      （{bankCode}） {bankName}
                    </p>
                  )}
                  {accountNumber && (
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-wider">
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
                      aria-label={accountRevealed ? t.qr.hideAccount : t.qr.revealAccount}
                      aria-pressed={accountRevealed}
                      title={accountRevealed ? t.qr.hideAccount : t.qr.revealAccount}
                      className="p-2.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 action-transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                    >
                      {accountRevealed
                        ? <Eye size={18} aria-hidden="true" />
                        : <EyeOff size={18} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      aria-label={t.qr.copyAccount}
                      title={t.qr.copyAccount}
                      className="p-2.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 action-transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                    >
                      <Copy size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {note && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">{t.qr.notePrefix}{note}</p>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">{t.qr.safetyReminder}</p>
          </div>
        </div>

        {/* Footer — action buttons */}
        <div className="p-5 pt-5 relative space-y-3">
          {/* Feedback toast */}
          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className={`absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium shadow-lg motion-reduce:animate-none ${
                feedbackClosing
                  ? 'animate-out fade-out zoom-out-95 duration-200'
                  : 'animate-in fade-in zoom-in-95 duration-200'
              }`}
            >
              <Check size={14} aria-hidden="true" />
              {feedback}
            </div>
          )}

          {/* Bank app button — primary action in scan context */}
          {bankUrl && (
            <a
              href={bankUrl}
              onClick={() => haptic()}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl btn-accent active:scale-98 action-transition shadow-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <ExternalLink size={18} aria-hidden="true" />
              {t.scan.openBankApp}
            </a>
          )}

          {/* Share button — accent when standalone, secondary when bank button is present */}
          {!isSharedView && (
            <button
              type="button"
              onClick={() => shareMenu.open()}
              className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl active:scale-98 action-transition font-semibold focus-visible:outline-hidden focus-visible:ring-2 ${
                bankUrl
                  ? 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100'
                  : 'btn-accent shadow-xs focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950'
              }`}
            >
              <Share2 size={18} aria-hidden="true" />
              <span>{t.qr.share}</span>
            </button>
          )}

          {/* Rescan button — only in scan result context */}
          {onRescan && (
            <button
              type="button"
              onClick={() => { haptic(); onRescan(); }}
              className="w-full flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors py-2 text-sm font-medium rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
            >
              <ScanLine size={16} aria-hidden="true" />
              {t.scan.rescan}
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
        onCopyImage={supportsClipboardWrite ? handleCopyImage : undefined}
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
        qrCenterImage={centerImageForQR}
        customName={localCustomName.trim() || undefined}
        showBankName={showBankNameSetting}
        accountNumber={accountNumber}
        bankCode={bankCode}
        showAccount={accountRevealed}
        dotStyle={dotStyle}
        eyeStyle={eyeStyle}
        errorLevel={errorLevel}
      />
    )}
    </>
  );
};
