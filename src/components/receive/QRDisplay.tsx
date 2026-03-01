import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
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
import { buildQRCenterImage, QR_CENTER_IMAGE, QR_CENTER_IMAGE_VERTICAL } from '../../utils/qrLabel';

/** Memoised QR Code to avoid re-rendering when parent state changes. */
const MemoQRCode = memo(QRCodeSVG);

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
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, bankCode, note, shareData, onClose, isSharedView = false, bankIconUrl }: QRDisplayProps) => {
  const t = useLocaleStore((s) => s.t);
  const storedLogoType = useQRSettingsStore((s) => s.logoType);
  const storedShowAccount = useQRSettingsStore((s) => s.showAccount);
  const storedShowBankName = useQRSettingsStore((s) => s.showBankName);
  const storedCustomName = useQRSettingsStore((s) => s.customName);

  // Shared view always uses defaults — viewer's personal settings must not leak.
  const logoType = isSharedView ? 'opentwqr' as const : storedLogoType;
  const showAccountSetting = isSharedView ? false : storedShowAccount;
  const showBankNameSetting = isSharedView ? false : storedShowBankName;
  const customName = isSharedView ? '' : storedCustomName;

  /** Whether any name/label info will be displayed BELOW the QR code. */
  const hasLabelInfo = Boolean(customName.trim()) || (showBankNameSetting && Boolean(bankName));
  /** Whether account number will be displayed ABOVE the QR code. */
  const showAccountAbove = showAccountSetting && Boolean(accountNumber) && Boolean(bankCode);

  /**
   * Natural dimensions of the bank icon — loaded via JS so imageSettings can
   * receive the correct proportional width/height rather than a forced square.
   */
  const [bankIconSize, setBankIconSize] = useState<{ width: number; height: number } | null>(null);

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
      setBankIconSize({ width: Math.round(w), height: Math.round(h) });
    };
    img.onerror = () => {
      if (!cancelled) setBankIconSize(null);
    };
    img.src = bankIconUrl;
    return () => { cancelled = true; };
  }, [logoType, bankIconUrl]);

  /**
   * QR center image — when logoType is 'bank' and the icon has loaded, embed
   * the bank favicon with proportional dimensions (not a forced square).
   */
  const qrCenterImage = useMemo(() => {
    if (logoType === 'bank' && bankIconUrl && bankIconSize) {
      return { src: bankIconUrl, width: bankIconSize.width, height: bankIconSize.height, excavate: true };
    }
    return buildQRCenterImage({ logoType, hasLabelInfo, bankIconUrl: undefined });
  }, [logoType, hasLabelInfo, bankIconUrl, bankIconSize]);

  const [qrSize, setQrSize] = useState(240);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shareMenu = useAnimatedToggle();
  const linkSettingsToggle = useAnimatedToggle();
  const [linkAction, setLinkAction] = useState<'copy' | 'share'>('copy');
  const [linkExpiry, setLinkExpiry] = useState<ExpiryOption>(0);
  const [linkPassword, setLinkPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackClosing, setFeedbackClosing] = useState(false);
  const [accountRevealed, setAccountRevealed] = useState(false);
  const feedbackShowTimerRef = useRef<number | null>(null);
  const feedbackHideTimerRef = useRef<number | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * Returns an export-safe SVG clone — replaces any external (https://) centre
   * image href with an embedded data-URI OpenTWQR logo so that exported PNGs
   * always render the logo.
   *
   * Background: browsers block external resources when an SVG is loaded via
   * `<img src="blob:...">` (the technique used by svgToBlob). Data-URI sources
   * are not affected, but bank favicon URLs (https://) go missing in exports.
   */
  const getExportSvgEl = useCallback((): SVGSVGElement | null => {
    const svgEl = qrRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return null;
    const imageEl = svgEl.querySelector('image');
    const href =
      imageEl?.getAttribute('href') ??
      imageEl?.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ??
      '';
    // data: URIs are embedded and safe — return the original element directly.
    if (!href.startsWith('https://')) return svgEl;
    // Clone and swap the external URL with the compact OpenTWQR data-URI logo.
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const cloneImg = clone.querySelector('image');
    if (cloneImg) {
      const fallback = hasLabelInfo ? QR_CENTER_IMAGE : QR_CENTER_IMAGE_VERTICAL;
      cloneImg.setAttribute('href', fallback.src);
      cloneImg.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
    }
    return clone;
  }, [hasLabelInfo]);

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
      const svgEl = getExportSvgEl();
      if (!svgEl) return;

      const pngBlob = await svgToBlob(svgEl, qrSize);
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
  }, [getExportSvgEl, qrSize, shareMenu, showFeedback, t]);

  const handleDownloadImage = useCallback(async () => {
    try {
      const svgEl = getExportSvgEl();
      if (!svgEl) return;

      const pngBlob = await svgToBlob(svgEl, qrSize);
      downloadBlob(pngBlob, 'opentwqr.png');
      showFeedback(t.share.downloadedImage);
    } catch {
      showFeedback(t.share.downloadFailed);
    }
    shareMenu.close();
  }, [getExportSvgEl, qrSize, shareMenu, showFeedback, t]);

  const handleCopyImage = useCallback(async () => {
    try {
      const svgEl = getExportSvgEl();
      if (!svgEl) return;

      const pngBlob = await svgToBlob(svgEl, qrSize);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);
      showFeedback(t.share.copiedImage);
    } catch {
      showFeedback(t.qr.copyFailed);
    }
    shareMenu.close();
  }, [getExportSvgEl, qrSize, shareMenu, showFeedback, t]);

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
      showFeedback(t.linkSettings.encryptFailed);
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
        onClick={requestClose}
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
            {t.qr.title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t.common.close}
            className="p-2.5 min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* QR Code — tappable for fullscreen */}
        <div className="flex flex-col items-center justify-center px-6 gap-5">
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label={t.qr.enlargeQR}
            className="bg-white p-5 rounded-xl shadow-xs border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow active:scale-98 cursor-zoom-in"
          >
            {/* Account number — bankCode.masked, single compact line */}
            {showAccountAbove && (
              <p className="text-center font-mono text-xs text-zinc-400 tracking-wider mb-3">
                {bankCode}.{maskAccount(accountNumber!)}
              </p>
            )}
            <div ref={qrRef}>
              <MemoQRCode
                value={value}
                size={qrSize}
                level="Q"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#000000"
                imageSettings={qrCenterImage}
              />
            </div>
            {/* Labels below QR: bank name (xs, light) then custom name (sm, semibold) */}
            {hasLabelInfo && (
              <div className="text-center mt-2 space-y-0.5">
                {showBankNameSetting && bankName && (
                  <p className="text-xs text-zinc-400 leading-tight">{bankName}</p>
                )}
                {customName.trim() && (
                  <p className="text-sm font-semibold text-zinc-700 leading-tight">{customName.trim()}</p>
                )}
              </div>
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
                  {bankName && (
                    <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-0.5">{bankName}</p>
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

        {/* Footer — Share button */}
        <div className="p-5 pt-5 relative">
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

          {!isSharedView && (
            <button
              type="button"
              onClick={() => shareMenu.open()}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl btn-accent active:scale-98 action-transition shadow-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <Share2 size={18} aria-hidden="true" />
              <span>{t.qr.share}</span>
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
        qrCenterImage={qrCenterImage}
        customName={customName.trim() || undefined}
        showBankName={showBankNameSetting}
        accountNumber={accountNumber}
        bankCode={bankCode}
        showAccount={showAccountSetting}
      />
    )}
    </>
  );
};
