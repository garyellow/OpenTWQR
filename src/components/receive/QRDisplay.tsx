import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useDelayedClose } from '../../hooks/useDelayedClose';
import { useAnimatedToggle } from '../../hooks/useAnimatedToggle';
import { useCardPager } from '../../hooks/useCardPager';
import { X, Share2, Check, Eye, EyeOff, Copy, ExternalLink, ScanLine, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatAmount, formatAccountDisplay, maskAccount } from '../../utils/twqr';
import { buildShareUrl } from '../../utils/share';
import { canvasToBlob, downloadBlob } from '../../utils/qrImage';
import { haptic } from '../../utils/haptics';
import { isIntentUrl } from '../../utils/urlScheme';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { QRFullscreen } from './QRFullscreen';
import { ShareMenu } from '../share/ShareMenu';
import { LinkSettingsDialog } from '../share/LinkSettingsDialog';
import type { ShareData, ExpiryOption } from '../../types';
import { QR_CENTER_IMAGE_VERTICAL } from '../../utils/qrLabel';
import { StyledQRCode, type StyledQRCodeHandle, type StyledQRCodeCenterImage } from './StyledQRCode';

/** Data for a pre-rendered adjacent card in the carousel. */
export interface AdjacentCard {
  value: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
}

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
  /** Callback to switch to the previous account (swipe right / left arrow). */
  onSwitchPrev?: () => void;
  /** Callback to switch to the next account (swipe left / right arrow). */
  onSwitchNext?: () => void;
  /** 1-based index of the currently displayed account in the sorted list. */
  accountIndex?: number;
  /** Total number of accounts. */
  accountTotal?: number;
  /** Pre-rendered adjacent card data for the carousel (prev panel). */
  prevCard?: AdjacentCard;
  /** Pre-rendered adjacent card data for the carousel (next panel). */
  nextCard?: AdjacentCard;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, bankCode, note, shareData, onClose, isSharedView = false, bankIconUrl, bankUrl, onRescan, title, hideClose = false, onSwitchPrev, onSwitchNext, accountIndex, accountTotal, prevCard, nextCard }: QRDisplayProps) => {
  const t = useLocaleStore((s) => s.t);
  const storedLogoType = useQRSettingsStore((s) => s.logoType);
  const storedShowAccount = useQRSettingsStore((s) => s.showAccount);
  const storedShowBankName = useQRSettingsStore((s) => s.showBankName);
  const storedCustomName = useQRSettingsStore((s) => s.customName);
  const storedDotStyle = useQRSettingsStore((s) => s.dotStyle);
  const storedEyeStyle = useQRSettingsStore((s) => s.eyeStyle);

  // Shared view always uses defaults — viewer's personal settings must not leak.
  const logoType = isSharedView ? 'opentwqr' as const : storedLogoType;
  const showAccountSetting = isSharedView ? false : storedShowAccount;
  const showBankNameSetting = isSharedView ? false : storedShowBankName;
  const customName = isSharedView ? '' : storedCustomName;
  const dotStyle = isSharedView ? 'square' as const : storedDotStyle;
  const eyeStyle = isSharedView ? 'square' as const : storedEyeStyle;


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

  const [qrSize, setQrSize] = useState(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    return Math.max(180, Math.min(280, Math.floor(vw * 0.58)));
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    customName: customName.trim() || undefined,
    bankLine: showBankNameSetting && bankName && bankCode
      ? `(${bankCode}) ${bankName}`
      : undefined,
    accountLine: accountNumber
      ? (accountRevealed ? accountNumber : '')
      : undefined,
  }), [accountRevealed, accountNumber, showBankNameSetting, bankName, bankCode, customName]);

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

  // Whether account paging is available.
  const canSwitch = Boolean(onSwitchPrev && onSwitchNext && accountTotal && accountTotal > 1);

  // One-time "peek" hint animation to teach the swipe gesture.
  const [showPeekHint, setShowPeekHint] = useState(false);
  useEffect(() => {
    if (!canSwitch) return;
    try { if (sessionStorage.getItem('otwqr-pager-peek')) return; } catch { /* noop */ }
    const id = setTimeout(() => {
      setShowPeekHint(true);
      try { sessionStorage.setItem('otwqr-pager-peek', '1'); } catch { /* noop */ }
    }, 600);
    return () => clearTimeout(id);
  }, [canSwitch]);

  // Card-pager gesture — fires after the carousel commit transition ends.
  const handlePagerCommit = useCallback((dir: 'prev' | 'next') => {
    if (dir === 'next') onSwitchNext?.();
    else onSwitchPrev?.();
  }, [onSwitchNext, onSwitchPrev]);

  const pager = useCardPager(canSwitch ? handlePagerCommit : undefined);

  // Left/Right arrow keys — switch accounts (desktop keyboard support)
  useEffect(() => {
    if (!canSwitch) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen || shareMenuIsOpen || linkSettingsIsOpen || isEncrypting) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); pager.commitTo('prev'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); pager.commitTo('next'); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- commitTo identity is stable
  }, [canSwitch, pager.commitTo, isFullscreen, shareMenuIsOpen, linkSettingsIsOpen, isEncrypting]);

  // Default center image for adjacent carousel panels (always OpenTWQR logo).
  const defaultCenterImage: StyledQRCodeCenterImage = useMemo(() => {
    const logo = QR_CENTER_IMAGE_VERTICAL;
    return { src: logo.src, width: logo.width, height: logo.height };
  }, []);

  // Strip transform — drives the 3-panel carousel position.
  // Uses translate3d for guaranteed GPU compositing, and keeps
  // will-change: transform at all times to avoid compositor-layer
  // creation/destruction flicker.
  const stripStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = { willChange: 'transform' };
    if (pager.isDragging) {
      return {
        ...base,
        transform: `translate3d(calc(-33.333% + ${pager.dragOffset}px),0px,0px)`,
      };
    }
    if (pager.commitDirection) {
      return {
        ...base,
        transform: pager.commitDirection === 'next'
          ? 'translate3d(-66.666%,0px,0px)'
          : 'translate3d(0%,0px,0px)',
        transition: 'transform 250ms ease-out',
      };
    }
    if (pager.phase === 'settling') {
      return {
        ...base,
        transform: 'translate3d(-33.333%,0px,0px)',
        transition: 'transform 200ms ease-out',
      };
    }
    return { ...base, transform: 'translate3d(-33.333%,0px,0px)' };
  }, [pager.isDragging, pager.dragOffset, pager.commitDirection, pager.phase]);

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

  /* --- Carousel panel renderer --- */

  const renderPanel = (position: 'prev' | 'current' | 'next') => {
    const isCurrent = position === 'current';
    const card = position === 'prev' ? prevCard : position === 'next' ? nextCard : undefined;
    const panelValue = isCurrent ? value : card!.value;
    const panelBankName = isCurrent ? bankName : card?.bankName;
    const panelBankCode = isCurrent ? bankCode : card?.bankCode;
    const panelAccountNumber = isCurrent ? accountNumber : card?.accountNumber;
    const panelCenterImage = isCurrent ? centerImageForQR : defaultCenterImage;
    const panelHasBankLabel = showBankNameSetting && Boolean(panelBankName) && Boolean(panelBankCode);

    return (
      <div className="h-full flex flex-col">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col items-center px-6 gap-4 py-4">

            {/* QR Code card */}
            <div className="bg-white p-5 rounded-xl shadow-xs border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow w-full flex flex-col items-center">
              {customName.trim() && (
                <p className="text-sm font-semibold text-zinc-800 text-center mb-3">{customName.trim()}</p>
              )}
              {isCurrent ? (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  aria-label={t.qr.enlargeQR}
                  className="block p-0 border-0 bg-transparent cursor-zoom-in active:scale-98 transition-transform leading-0"
                >
                  <StyledQRCode
                    ref={qrRef}
                    value={panelValue}
                    size={qrSize}
                    dotStyle={dotStyle}
                    eyeStyle={eyeStyle}
                    centerImage={panelCenterImage}
                  />
                </button>
              ) : (
                <div className="leading-0">
                  <StyledQRCode
                    value={panelValue}
                    size={qrSize}
                    dotStyle={dotStyle}
                    eyeStyle={eyeStyle}
                    centerImage={panelCenterImage}
                  />
                </div>
              )}
              {panelHasBankLabel && (
                <p className="text-xs text-zinc-400 text-center mt-1.5 leading-tight">
                  ({panelBankCode}) {panelBankName}
                </p>
              )}
              {panelAccountNumber && (
                <p className={`font-mono text-xs text-zinc-400 text-center mt-0.5 leading-tight${isCurrent && accountRevealed ? '' : ' invisible'}`}>
                  {panelAccountNumber}
                </p>
              )}
            </div>

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
                    {panelBankName && panelBankCode && (
                      <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-0.5">
                        ({panelBankCode}) {panelBankName}
                      </p>
                    )}
                    {panelAccountNumber && (
                      <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-wider">
                        {isCurrent && accountRevealed ? formatAccountDisplay(panelAccountNumber) : maskAccount(panelAccountNumber)}
                      </p>
                    )}
                  </div>
                  {isCurrent && panelAccountNumber && (
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
        </div>

        {/* Footer — action buttons */}
        <div className="shrink-0 p-5 pt-5 relative space-y-3">
          {isCurrent && feedback && (
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

          {isCurrent && bankUrl && (
            <a
              href={bankUrl}
              {...(isIntentUrl(bankUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}
              onClick={() => haptic()}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl btn-accent active:scale-98 action-transition shadow-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <ExternalLink size={18} aria-hidden="true" />
              {t.scan.openBankApp}
            </a>
          )}

          {!isSharedView && (
            <button
              type="button"
              onClick={isCurrent ? () => shareMenu.open() : undefined}
              tabIndex={isCurrent ? undefined : -1}
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

          {isCurrent && onRescan && (
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
    );
  };

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
        className={`pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100dvh-2rem)] motion-reduce:animate-none ${isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'}`}
        onAnimationEnd={onAnimationEnd}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-5 pb-3">
          <h2 id="qr-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title ?? t.qr.title}
          </h2>
          <div className="flex items-center gap-1">
            {canSwitch && accountIndex != null && accountTotal != null && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => pager.commitTo('prev')}
                  aria-label={t.qr.switchPrev}
                  className="p-1.5 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                {accountTotal <= 7 ? (
                  <div className="flex items-center gap-1 px-1.5">
                    {Array.from({ length: accountTotal }, (_, i) => (
                      <span
                        key={i}
                        className={`block rounded-full transition-all duration-200 ${
                          i + 1 === accountIndex
                            ? 'w-1.5 h-1.5 bg-zinc-600 dark:bg-zinc-300'
                            : 'w-1 h-1 bg-zinc-300 dark:bg-zinc-600'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums min-w-[3ch] text-center select-none">
                    {t.qr.accountPosition(accountIndex, accountTotal)}
                  </span>
                )}
                <span className="sr-only" aria-live="polite">
                  {t.qr.accountPosition(accountIndex, accountTotal)}
                </span>
                <button
                  type="button"
                  onClick={() => pager.commitTo('next')}
                  aria-label={t.qr.switchNext}
                  className="p-1.5 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
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
        </div>

        {/* Card viewport — clips horizontal overflow for the carousel strip */}
        <div
          className="flex-1 overflow-hidden min-h-0"
          style={canSwitch ? { touchAction: 'pan-y pinch-zoom' } : undefined}
          onTouchStart={canSwitch ? pager.handlers.onTouchStart : undefined}
          onTouchMove={canSwitch ? pager.handlers.onTouchMove : undefined}
          onTouchEnd={canSwitch ? pager.handlers.onTouchEnd : undefined}
        >
          {canSwitch ? (
            /* Three-panel carousel strip */
            <div
              className={`h-full flex w-[300%] motion-reduce:transition-none! ${showPeekHint ? 'pager-peek-hint' : ''}`}
              style={stripStyle}
              onTransitionEnd={pager.handleTransitionEnd}
              onAnimationEnd={() => setShowPeekHint(false)}
            >
              {/* Prev panel */}
              <div className="w-1/3 h-full" inert aria-hidden="true">
                {prevCard && renderPanel('prev')}
              </div>
              {/* Current panel */}
              <div className="w-1/3 h-full">
                {renderPanel('current')}
              </div>
              {/* Next panel */}
              <div className="w-1/3 h-full" inert aria-hidden="true">
                {nextCard && renderPanel('next')}
              </div>
            </div>
          ) : (
            /* Single panel — no carousel */
            renderPanel('current')
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
        customName={customName.trim() || undefined}
        showBankName={showBankNameSetting}
        accountNumber={accountNumber}
        bankCode={bankCode}
        showAccount={Boolean(accountNumber)}
        accountRevealed={accountRevealed}
        dotStyle={dotStyle}
        eyeStyle={eyeStyle}
      />
    )}
    </>
  );
};
