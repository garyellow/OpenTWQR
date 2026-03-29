import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useDelayedClose } from '../../hooks/useDelayedClose';
import { useAnimatedToggle } from '../../hooks/useAnimatedToggle';
import { useCarouselGesture } from '../../hooks/useCarouselGesture';
import { X, Share2, Check, Eye, EyeOff, Copy, ExternalLink, ScanLine, ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
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

const SINGLE_SLOT_ID = 'slot-single' as const;
const CAROUSEL_SLOT_IDS = ['slot-a', 'slot-b', 'slot-c'] as const;
const STRIP_CENTER_TRANSFORM = 'translate3d(-33.333%,0px,0px)';

type CarouselSlotId = typeof CAROUSEL_SLOT_IDS[number];
type RenderSlotId = CarouselSlotId | typeof SINGLE_SLOT_ID;
type CarouselDirection = 'prev' | 'next';

interface CarouselSlot {
  slotId: CarouselSlotId;
  cardIndex: number;
}

interface CarouselState {
  activeIndex: number;
  slots: [CarouselSlot, CarouselSlot, CarouselSlot];
}

interface LoadedBankIcon {
  url: string;
  width: number;
  height: number;
  dataUri: string;
}

type BankIconCache = Record<string, LoadedBankIcon | null>;

/** Data for a renderable QR card in the carousel. */
export interface QRDisplayCard {
  id: string;
  value: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  bankIconUrl?: string;
  shareData?: ShareData;
}

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function findCardIndex(cards: QRDisplayCard[], cardId?: string) {
  if (cards.length === 0) return 0;
  if (!cardId) return 0;
  const found = cards.findIndex((card) => card.id === cardId);
  return found >= 0 ? found : 0;
}

function buildCarouselState(activeIndex: number, length: number): CarouselState {
  const safeActiveIndex = wrapIndex(activeIndex, length);
  return {
    activeIndex: safeActiveIndex,
    slots: [
      { slotId: CAROUSEL_SLOT_IDS[0], cardIndex: wrapIndex(safeActiveIndex - 1, length) },
      { slotId: CAROUSEL_SLOT_IDS[1], cardIndex: safeActiveIndex },
      { slotId: CAROUSEL_SLOT_IDS[2], cardIndex: wrapIndex(safeActiveIndex + 1, length) },
    ],
  };
}

function rotateCarouselState(state: CarouselState, direction: CarouselDirection, length: number): CarouselState {
  const [firstSlot, secondSlot, thirdSlot] = state.slots;

  if (direction === 'next') {
    const nextActiveIndex = wrapIndex(state.activeIndex + 1, length);
    return {
      activeIndex: nextActiveIndex,
      slots: [
        { ...secondSlot },
        { ...thirdSlot },
        { ...firstSlot, cardIndex: wrapIndex(nextActiveIndex + 1, length) },
      ],
    };
  }

  const nextActiveIndex = wrapIndex(state.activeIndex - 1, length);
  return {
    activeIndex: nextActiveIndex,
    slots: [
      { ...thirdSlot, cardIndex: wrapIndex(nextActiveIndex - 1, length) },
      { ...firstSlot },
      { ...secondSlot },
    ],
  };
}

function fitBankIconSize(naturalWidth: number, naturalHeight: number) {
  const MAX_W = 56;
  const MAX_H = 36;
  const ratio = naturalWidth / naturalHeight;

  let width = MAX_W;
  let height = width / ratio;

  if (height > MAX_H) {
    height = MAX_H;
    width = height * ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

function blobToDataUri(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to convert blob to data URI'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

function loadImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}

async function loadBankIcon(url: string): Promise<LoadedBankIcon | null> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch bank icon: ${response.status}`);

  const blob = await response.blob();
  const dataUri = await blobToDataUri(blob);
  const { width: naturalWidth, height: naturalHeight } = await loadImageDimensions(dataUri);
  const { width, height } = fitBankIconSize(naturalWidth, naturalHeight);

  return { url, width, height, dataUri };
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
  /** Optional full card list for a slot-rotation carousel. */
  cards?: QRDisplayCard[];
  /** Active card id used to seed / sync the visible carousel state. */
  activeCardId?: string;
  /** Called after a committed account switch so the parent can stay in sync. */
  onActiveCardChange?: (cardId: string) => void;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, bankCode, note, shareData, onClose, isSharedView = false, bankIconUrl, bankUrl, onRescan, title, hideClose = false, cards, activeCardId, onActiveCardChange }: QRDisplayProps) => {
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

  const allCards = useMemo<QRDisplayCard[]>(() => {
    if (cards && cards.length > 0) return cards;
    return [{
      id: SINGLE_SLOT_ID,
      value,
      bankName,
      bankCode,
      accountNumber,
      bankIconUrl,
      shareData,
    }];
  }, [cards, value, bankName, bankCode, accountNumber, bankIconUrl, shareData]);

  const cardIdsSignature = useMemo(
    () => allCards.map((card) => card.id).join('|'),
    [allCards],
  );

  const externalActiveIndex = useMemo(
    () => findCardIndex(allCards, activeCardId),
    [allCards, activeCardId],
  );

  const canSwitch = allCards.length > 1;
  const gesture = useCarouselGesture(canSwitch);
  const {
    commitDirection,
    commitTo,
    dragOffset,
    handlers,
    isDragging,
    phase,
    resetAfterTransition,
  } = gesture;

  const [carousel, setCarousel] = useState<CarouselState>(() => buildCarouselState(externalActiveIndex, allCards.length));
  const syncedCardIdsSignatureRef = useRef(cardIdsSignature);
  const pendingExternalActiveIndexRef = useRef<number | null>(null);

  /**
   * Cache of bank icons converted to data URIs for export-safe QR rendering.
   * All carousel cards can reuse the same cached asset without re-fetching.
   */
  const [bankIconCache, setBankIconCache] = useState<BankIconCache>({});
  const loadingBankIconUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (phase !== 'idle' || isDragging) return;

    if (pendingExternalActiveIndexRef.current != null) {
      if (externalActiveIndex === pendingExternalActiveIndexRef.current) {
        pendingExternalActiveIndexRef.current = null;
      } else {
        return;
      }
    }

    const cardsChanged = syncedCardIdsSignatureRef.current !== cardIdsSignature;
    if (!cardsChanged && carousel.activeIndex === externalActiveIndex) return;

    syncedCardIdsSignatureRef.current = cardIdsSignature;
    setCarousel(buildCarouselState(externalActiveIndex, allCards.length));
  }, [allCards.length, cardIdsSignature, carousel.activeIndex, externalActiveIndex, isDragging, phase]);

  const bankIconUrls = useMemo(() => {
    if (logoType !== 'bank') return [];
    return Array.from(new Set(
      allCards
        .map((card) => card.bankIconUrl)
        .filter((url): url is string => Boolean(url)),
    ));
  }, [allCards, logoType]);

  useEffect(() => {
    if (logoType !== 'bank' || bankIconUrls.length === 0) return;

    let cancelled = false;

    for (const url of bankIconUrls) {
      if (bankIconCache[url] !== undefined || loadingBankIconUrlsRef.current.has(url)) continue;

      loadingBankIconUrlsRef.current.add(url);
      loadBankIcon(url)
        .then((iconInfo) => {
          if (cancelled) return;
          setBankIconCache((prev) => (prev[url] !== undefined ? prev : { ...prev, [url]: iconInfo }));
        })
        .catch(() => {
          if (cancelled) return;
          setBankIconCache((prev) => (prev[url] !== undefined ? prev : { ...prev, [url]: null }));
        })
        .finally(() => {
          loadingBankIconUrlsRef.current.delete(url);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [bankIconCache, bankIconUrls, logoType]);

  /**
   * Default OpenTWQR centre image for non-bank-logo mode.
   */
  const defaultCenterImage: StyledQRCodeCenterImage = useMemo(() => {
    const logo = QR_CENTER_IMAGE_VERTICAL;
    return { src: logo.src, width: logo.width, height: logo.height };
  }, []);

  const getCardCenterImage = useCallback((card: QRDisplayCard): StyledQRCodeCenterImage | undefined => {
    if (logoType !== 'bank') return defaultCenterImage;
    if (!card.bankIconUrl) return undefined;
    const iconInfo = bankIconCache[card.bankIconUrl];
    return iconInfo && iconInfo.dataUri
      ? { src: iconInfo.dataUri, width: iconInfo.width, height: iconInfo.height }
      : undefined;
  }, [bankIconCache, defaultCenterImage, logoType]);

  const currentCard = allCards[carousel.activeIndex] ?? allCards[0];
  const currentValue = currentCard?.value ?? value;
  const currentBankName = currentCard?.bankName;
  const currentBankCode = currentCard?.bankCode;
  const currentAccountNumber = currentCard?.accountNumber;
  const currentShareData = currentCard?.shareData ?? shareData;
  const currentCenterImage = currentCard ? getCardCenterImage(currentCard) : defaultCenterImage;
  const currentPosition = carousel.activeIndex + 1;

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
  const qrHandleRef = useRef<Record<RenderSlotId, StyledQRCodeHandle | null>>({
    [SINGLE_SLOT_ID]: null,
    'slot-a': null,
    'slot-b': null,
    'slot-c': null,
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const [isTouchPrimaryInput, setIsTouchPrimaryInput] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  });

  const slotRefCallbacks = useMemo<Record<RenderSlotId, (handle: StyledQRCodeHandle | null) => void>>(() => ({
    [SINGLE_SLOT_ID]: (handle) => { qrHandleRef.current[SINGLE_SLOT_ID] = handle; },
    'slot-a': (handle) => { qrHandleRef.current['slot-a'] = handle; },
    'slot-b': (handle) => { qrHandleRef.current['slot-b'] = handle; },
    'slot-c': (handle) => { qrHandleRef.current['slot-c'] = handle; },
  }), []);

  const currentCenterSlotId: RenderSlotId = canSwitch
    ? (carousel.slots[1]?.slotId ?? SINGLE_SLOT_ID)
    : SINGLE_SLOT_ID;

  /**
   * Returns the underlying QR canvas element for PNG export.
   * StyledQRCode always uses data URIs for the centre logo, so the canvas
   * is never tainted by cross-origin resources.
   */
  const getExportCanvas = useCallback((): HTMLCanvasElement | null => {
    return qrHandleRef.current[currentCenterSlotId]?.getCanvas() ?? null;
  }, [currentCenterSlotId]);

  /**
   * Labels to include in exported PNG images.
   * Order: customName above QR, bankLine + accountLine below QR.
   */
  const exportLabels = useMemo(() => ({
    customName: customName.trim() || undefined,
    bankLine: showBankNameSetting && currentBankName && currentBankCode
      ? `(${currentBankCode}) ${currentBankName}`
      : undefined,
    accountLine: currentAccountNumber
      ? (accountRevealed ? currentAccountNumber : '')
      : undefined,
  }), [accountRevealed, currentAccountNumber, currentBankCode, currentBankName, customName, showBankNameSetting]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setIsTouchPrimaryInput(media.matches);

    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  // One-time "peek" hint animation to teach the swipe gesture.
  const [showPeekHint, setShowPeekHint] = useState(false);
  const shouldUsePeekHint = canSwitch && isTouchPrimaryInput;

  useEffect(() => {
    if (!shouldUsePeekHint) return;
    try { if (sessionStorage.getItem('otwqr-carousel-peek-v4')) return; } catch { /* noop */ }
    const id = setTimeout(() => {
      setShowPeekHint(true);
      try { sessionStorage.setItem('otwqr-carousel-peek-v4', '1'); } catch { /* noop */ }
    }, 600);
    return () => clearTimeout(id);
  }, [shouldUsePeekHint]);

  const lastCommitHapticRef = useRef<CarouselDirection | null>(null);
  useEffect(() => {
    if (phase !== 'committing' || !commitDirection) {
      lastCommitHapticRef.current = null;
      return;
    }
    if (lastCommitHapticRef.current === commitDirection) return;
    lastCommitHapticRef.current = commitDirection;
    haptic();
  }, [commitDirection, phase]);

  // Left/Right arrow keys — switch accounts (desktop keyboard support)
  useEffect(() => {
    if (!canSwitch) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen || shareMenuIsOpen || linkSettingsIsOpen || isEncrypting) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); commitTo('prev'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); commitTo('next'); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canSwitch, commitTo, isFullscreen, shareMenuIsOpen, linkSettingsIsOpen, isEncrypting]);

  // Strip transform — drives the 3-panel carousel position.
  // Uses translate3d so the browser keeps the strip on the compositor, while
  // stable slot rotation ensures the QR canvas that becomes the new centre was
  // already rendered off-screen before it is revealed.
  const stripStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = { willChange: 'transform' };
    if (isDragging) {
      return {
        ...base,
        transform: `translate3d(calc(-33.333% + ${dragOffset}px),0px,0px)`,
      };
    }
    if (commitDirection) {
      return {
        ...base,
        transform: commitDirection === 'next'
          ? 'translate3d(-66.666%,0px,0px)'
          : 'translate3d(0%,0px,0px)',
        transition: 'transform 250ms ease-out',
      };
    }
    if (phase === 'settling') {
      return {
        ...base,
        transform: STRIP_CENTER_TRANSFORM,
        transition: 'transform 200ms ease-out',
      };
    }
    return { ...base, transform: STRIP_CENTER_TRANSFORM };
  }, [commitDirection, dragOffset, isDragging, phase]);

  const accountActionShellClass =
    'flex items-center justify-center p-2.5 rounded-lg text-zinc-400 dark:text-zinc-500';
  const accountActionButtonClass =
    `${accountActionShellClass} hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 action-transition focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100`;
  const navButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-[transform,background-color,color] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100';
  const switchHintText = isTouchPrimaryInput ? t.qr.switchHintTouch : t.qr.switchHintDesktop;

  const handleStripTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;

    if (phase === 'settling') {
      flushSync(() => {
        resetAfterTransition();
      });
      return;
    }

    if (phase !== 'committing' || !commitDirection || allCards.length <= 1) return;

    const nextCarouselState = rotateCarouselState(carousel, commitDirection, allCards.length);
    const nextCardId = allCards[nextCarouselState.activeIndex]?.id;

    flushSync(() => {
      setCarousel(nextCarouselState);
      resetAfterTransition();
    });

    if (typeof nextCardId === 'string') {
      pendingExternalActiveIndexRef.current = nextCarouselState.activeIndex;
      onActiveCardChange?.(nextCardId);
    }
  }, [allCards, carousel, commitDirection, onActiveCardChange, phase, resetAfterTransition]);

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
    if (!currentAccountNumber) return;
    try {
      await navigator.clipboard.writeText(currentAccountNumber);
      showFeedback(t.qr.copiedAccount);
    } catch {
      showFeedback(t.qr.copyFailed);
    }
  }, [currentAccountNumber, showFeedback, t]);

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
      text: t.qr.shareText(amount && amount > 0 ? formatCurrency(amount) : '', currentBankName || ''),
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
  }, [amount, copyToClipboard, currentBankName, t]);

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
    if (!currentShareData) return;
    setIsEncrypting(true);
    try {
      const url = await buildShareUrl(currentShareData, { expiry: linkExpiry, password: linkPassword });
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
  }, [currentShareData, linkExpiry, linkPassword, linkAction, copyToClipboard, shareViaSystem, showFeedback, linkSettingsToggle, t]);

  /* --- Carousel panel renderer --- */

  const renderPanel = ({ card, slotId, isCurrent }: { card: QRDisplayCard; slotId: RenderSlotId; isCurrent: boolean; }) => {
    const panelHasBankLabel = showBankNameSetting && Boolean(card.bankName) && Boolean(card.bankCode);
    const panelCenterImage = getCardCenterImage(card);

    return (
      <div className="h-full overflow-y-auto min-h-0">
        <div className="flex flex-col items-center px-6 gap-4 py-4">
          <div className="bg-white p-5 rounded-xl shadow-xs border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow w-full flex flex-col items-center">
            {customName.trim() && (
              <p className="text-sm font-semibold text-zinc-800 text-center mb-3">{customName.trim()}</p>
            )}
            {isCurrent ? (
              <div className="relative leading-0">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  aria-label={t.qr.enlargeQR}
                  className="block p-0 border-0 bg-transparent cursor-zoom-in active:scale-98 transition-transform leading-0"
                >
                  <StyledQRCode
                    ref={slotRefCallbacks[slotId]}
                    value={card.value}
                    size={qrSize}
                    dotStyle={dotStyle}
                    eyeStyle={eyeStyle}
                    centerImage={panelCenterImage}
                  />
                </button>
              </div>
            ) : (
              <div className="leading-0">
                <StyledQRCode
                  ref={slotRefCallbacks[slotId]}
                  value={card.value}
                  size={qrSize}
                  dotStyle={dotStyle}
                  eyeStyle={eyeStyle}
                  centerImage={panelCenterImage}
                />
              </div>
            )}
            {panelHasBankLabel && (
              <p className="text-xs text-zinc-400 text-center mt-1.5 leading-tight">
                ({card.bankCode}) {card.bankName}
              </p>
            )}
            {card.accountNumber && (
              <p className={`font-mono text-xs text-zinc-400 text-center mt-0.5 leading-tight${isCurrent && accountRevealed ? '' : ' invisible'}`}>
                {card.accountNumber}
              </p>
            )}
          </div>

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
                  {card.bankName && card.bankCode && (
                    <p className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm mb-0.5">
                      ({card.bankCode}) {card.bankName}
                    </p>
                  )}
                  {card.accountNumber && (
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-wider">
                      {isCurrent && accountRevealed ? formatAccountDisplay(card.accountNumber) : maskAccount(card.accountNumber)}
                    </p>
                  )}
                </div>
                {card.accountNumber && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isCurrent ? (
                      <>
                        <button
                          type="button"
                          onClick={handleToggleReveal}
                          aria-label={accountRevealed ? t.qr.hideAccount : t.qr.revealAccount}
                          aria-pressed={accountRevealed}
                          title={accountRevealed ? t.qr.hideAccount : t.qr.revealAccount}
                          className={accountActionButtonClass}
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
                          className={accountActionButtonClass}
                        >
                          <Copy size={18} aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true" className={accountActionShellClass}>
                          {accountRevealed
                            ? <Eye size={18} aria-hidden="true" />
                            : <EyeOff size={18} aria-hidden="true" />}
                        </span>
                        <span aria-hidden="true" className={accountActionShellClass}>
                          <Copy size={18} aria-hidden="true" />
                        </span>
                      </>
                    )}
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
    );
  };

  const showStaticFooter = Boolean(bankUrl || !isSharedView || onRescan || feedback);

  const renderStaticFooter = () => {
    if (!showStaticFooter) return null;

    return (
      <div className="shrink-0 p-5 pt-5 relative space-y-3">
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

        {bankUrl && (
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
        aria-describedby={canSwitch ? 'qr-modal-switch-hint' : undefined}
        className={`pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100dvh-2rem)] motion-reduce:animate-none ${isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'}`}
        onAnimationEnd={onAnimationEnd}
      >
        <div
          className={`flex-1 flex flex-col min-h-0 ${canSwitch ? 'select-none' : ''}`}
          style={canSwitch ? { touchAction: 'pan-y pinch-zoom' } : undefined}
          onTouchStart={canSwitch ? handlers.onTouchStart : undefined}
          onTouchMove={canSwitch ? handlers.onTouchMove : undefined}
          onTouchEnd={canSwitch ? handlers.onTouchEnd : undefined}
          onTouchCancel={canSwitch ? handlers.onTouchCancel : undefined}
        >
          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-3">
            <div className="flex items-start justify-between gap-3">
              <h2 id="qr-modal-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {title ?? t.qr.title}
              </h2>
              {!hideClose && (
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label={t.common.close}
                  className="-mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2.5 text-zinc-400 transition-colors hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              )}
            </div>

            {canSwitch && (
              <div className={`mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 transition-[background-color,border-color,box-shadow] ${showPeekHint && shouldUsePeekHint ? 'border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/70' : 'border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/40'}`}>
                <p
                  id="qr-modal-switch-hint"
                  className={`flex min-w-0 items-center gap-1.5 text-[11px] font-medium ${showPeekHint && shouldUsePeekHint ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  {isTouchPrimaryInput && (
                    <MoveHorizontal
                      size={14}
                      aria-hidden="true"
                      style={showPeekHint && shouldUsePeekHint ? { color: 'light-dark(var(--accent), var(--accent-dark))' } : undefined}
                    />
                  )}
                  <span className="truncate">{switchHintText}</span>
                </p>

                <div className="shrink-0 flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/90 px-1 py-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => commitTo('prev')}
                    aria-label={t.qr.switchPrev}
                    className={navButtonClass}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <span className="min-w-[4.5ch] px-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums select-none">
                    {t.qr.accountPosition(currentPosition, allCards.length)}
                  </span>
                  <button
                    type="button"
                    onClick={() => commitTo('next')}
                    aria-label={t.qr.switchNext}
                    className={navButtonClass}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>

                <span className="sr-only" aria-live="polite">
                  {t.qr.accountPosition(currentPosition, allCards.length)}
                </span>
              </div>
            )}
          </div>

          {/* Card viewport — clips horizontal overflow for the carousel strip */}
          <div className="flex-1 overflow-hidden min-h-0">
          {canSwitch ? (
            /* Three-panel carousel strip */
            <div
              className={`h-full flex w-[300%] motion-reduce:transition-none! ${showPeekHint && shouldUsePeekHint ? 'pager-peek-hint' : ''}`}
              style={stripStyle}
              onTransitionEnd={handleStripTransitionEnd}
              onAnimationEnd={() => setShowPeekHint(false)}
            >
              {carousel.slots.map((slot, slotIndex) => {
                const card = allCards[slot.cardIndex] ?? currentCard;
                const isCurrent = slotIndex === 1;

                return (
                  <div
                    key={slot.slotId}
                    className="w-1/3 h-full"
                    inert={!isCurrent}
                    aria-hidden={!isCurrent}
                  >
                    {renderPanel({ card, slotId: slot.slotId, isCurrent })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single panel — no carousel */
            renderPanel({ card: currentCard, slotId: SINGLE_SLOT_ID, isCurrent: true })
          )}
          </div>
        </div>
        {renderStaticFooter()}
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
        value={currentValue}
        amount={amount}
        bankName={currentBankName}
        note={note}
        onExit={() => setIsFullscreen(false)}
        qrCenterImage={currentCenterImage}
        customName={customName.trim() || undefined}
        showBankName={showBankNameSetting}
        accountNumber={currentAccountNumber}
        bankCode={currentBankCode}
        showAccount={Boolean(currentAccountNumber)}
        accountRevealed={accountRevealed}
        dotStyle={dotStyle}
        eyeStyle={eyeStyle}
      />
    )}
    </>
  );
};
