import { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useDelayedClose } from '../../hooks/useDelayedClose';
import { useAnimatedToggle } from '../../hooks/useAnimatedToggle';
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
import { AccountSelectorCard } from '../accounts/AccountSelectorCard';
import { AccountPickerSheet } from '../accounts/AccountPickerSheet';
import type { ShareData, ExpiryOption } from '../../types';
import { QR_CENTER_IMAGE_VERTICAL } from '../../utils/qrLabel';
import { StyledQRCode, type StyledQRCodeHandle, type StyledQRCodeCenterImage } from './StyledQRCode';
import { formatBankCaption } from '../../utils/accountPresentation';

const SINGLE_SLOT_ID = 'slot-single' as const;

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
  label?: string;
  value: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  bankIconUrl?: string;
  shareData?: ShareData;
}

interface QRRenderSlide {
  renderKey: string;
  card: QRDisplayCard;
  logicalIndex: number;
}

const SCROLL_SETTLE_DELAY_MS = 160;

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}

function findCardIndex(cards: QRDisplayCard[], cardId?: string) {
  if (cards.length === 0) return 0;
  if (!cardId) return 0;
  const found = cards.findIndex((card) => card.id === cardId);
  return found >= 0 ? found : 0;
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

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function buildRenderSlides(cards: QRDisplayCard[]): QRRenderSlide[] {
  if (cards.length <= 1) {
    return cards.map((card, logicalIndex) => ({
      renderKey: `real-${card.id}`,
      card,
      logicalIndex,
    }));
  }

  const lastLogicalIndex = cards.length - 1;

  return [
    {
      renderKey: `clone-head-${cards[lastLogicalIndex].id}`,
      card: cards[lastLogicalIndex],
      logicalIndex: lastLogicalIndex,
    },
    ...cards.map((card, logicalIndex) => ({
      renderKey: `real-${card.id}`,
      card,
      logicalIndex,
    })),
    {
      renderKey: `clone-tail-${cards[0].id}`,
      card: cards[0],
      logicalIndex: 0,
    },
  ];
}

function getNearestRenderIndex(scrollLeft: number, viewportWidth: number, renderSlideCount: number) {
  if (renderSlideCount <= 1 || viewportWidth <= 0) return 0;
  return clampIndex(Math.round(scrollLeft / viewportWidth), renderSlideCount);
}

function getRealRenderIndex(logicalIndex: number, logicalCount: number) {
  if (logicalCount <= 1) return 0;
  return clampIndex(logicalIndex, logicalCount) + 1;
}

function getLoopedRenderIndex(rawRenderIndex: number, logicalCount: number) {
  if (logicalCount <= 1) return 0;
  if (rawRenderIndex === 0) return logicalCount;
  if (rawRenderIndex === logicalCount + 1) return 1;
  return clampIndex(rawRenderIndex, logicalCount + 2);
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
  /** Configured transfer-app URL shown only in scan-result context. */
  transferAppUrl?: string;
  /** When provided, a "重新掃描" button is shown and the modal acts as a scan result view. */
  onRescan?: () => void;
  /** Override the modal header title (defaults to t.qr.title). */
  title?: string;
  /** When true, hides the X close button and disables backdrop-click-to-close.
   *  Used when QRDisplay is the primary scan result view (no underlying content). */
  hideClose?: boolean;
  /** Optional full card list for a native scroll-snap carousel. */
  cards?: QRDisplayCard[];
  /** Active card id used to seed / sync the visible carousel state. */
  activeCardId?: string;
  /** Called after a committed account switch so the parent can stay in sync. */
  onActiveCardChange?: (cardId: string) => void;
  /** Optional entry point into the dedicated account-management page. */
  onManageAccounts?: () => void;
}

export const QRDisplay = ({ value, amount, bankName, accountNumber, bankCode, note, shareData, onClose, isSharedView = false, bankIconUrl, transferAppUrl, onRescan, title, hideClose = false, cards, activeCardId, onActiveCardChange, onManageAccounts }: QRDisplayProps) => {
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

  const externalActiveIndex = useMemo(
    () => findCardIndex(allCards, activeCardId),
    [allCards, activeCardId],
  );

  const renderSlides = useMemo(() => buildRenderSlides(allCards), [allCards]);

  const canSwitch = allCards.length > 1;
  const hasExternalSync = canSwitch && activeCardId != null && typeof onActiveCardChange === 'function';
  const [currentRenderIndex, setCurrentRenderIndex] = useState(() => getRealRenderIndex(externalActiveIndex, allCards.length));
  const currentRenderIndexRef = useRef(currentRenderIndex);

  /**
   * Cache of bank icons converted to data URIs for export-safe QR rendering.
   * All carousel cards can reuse the same cached asset without re-fetching.
   */
  const [bankIconCache, setBankIconCache] = useState<BankIconCache>({});
  const loadingBankIconUrlsRef = useRef<Set<string>>(new Set());
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollSettleTimerRef = useRef<number | null>(null);

  const syncCurrentRenderIndex = useCallback((nextRenderIndex: number) => {
    currentRenderIndexRef.current = nextRenderIndex;
    setCurrentRenderIndex(nextRenderIndex);
  }, []);

  const clearScrollSettleTimer = useCallback(() => {
    if (scrollSettleTimerRef.current) {
      window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    }
  }, []);

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

  const centerImagesByCardId = useMemo<Record<string, StyledQRCodeCenterImage | undefined>>(() => {
    const next: Record<string, StyledQRCodeCenterImage | undefined> = {};

    for (const card of allCards) {
      if (logoType !== 'bank') {
        next[card.id] = defaultCenterImage;
        continue;
      }

      if (!card.bankIconUrl) {
        next[card.id] = undefined;
        continue;
      }

      const iconInfo = bankIconCache[card.bankIconUrl];
      next[card.id] = iconInfo?.dataUri
        ? { src: iconInfo.dataUri, width: iconInfo.width, height: iconInfo.height }
        : undefined;
    }

    return next;
  }, [allCards, bankIconCache, defaultCenterImage, logoType]);

  const currentRenderSlide = renderSlides[currentRenderIndex] ?? renderSlides[0];
  const activeIndex = currentRenderSlide?.logicalIndex ?? 0;
  const currentCard = currentRenderSlide?.card ?? allCards[0];
  const currentValue = currentCard?.value ?? value;
  const currentBankName = currentCard?.bankName;
  const currentBankCode = currentCard?.bankCode;
  const currentTransferAppUrl = transferAppUrl;
  const currentAccountNumber = currentCard?.accountNumber;
  const currentShareData = currentCard?.shareData ?? shareData;
  const currentCenterImage = currentCard ? centerImagesByCardId[currentCard.id] : defaultCenterImage;
  const currentPosition = activeIndex + 1;
  const currentAccountTitle = currentCard?.label || currentBankName || t.receive.myAccount;

  const [qrSize, setQrSize] = useState(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    return Math.max(180, Math.min(280, Math.floor(vw * 0.58)));
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
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
  const currentAccountLiveLabel = t.qr.currentAccountLive(currentAccountTitle, currentPosition, allCards.length);
  const feedbackShowTimerRef = useRef<number | null>(null);
  const feedbackHideTimerRef = useRef<number | null>(null);
  const qrHandleRef = useRef<Record<string, StyledQRCodeHandle | null>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  const accountPickerOptions = useMemo(() => {
    const orderedCards = [...allCards].sort((left, right) => {
      if (left.id === currentCard?.id) return -1;
      if (right.id === currentCard?.id) return 1;
      return (left.bankCode ?? '').localeCompare(right.bankCode ?? '');
    });

    const titleCounts = new Map<string, number>();

    const baseOptions = orderedCards.map((card) => {
      const title = card.label || card.bankName || t.receive.myAccount;

      titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);

      return {
        id: card.id,
        title,
        accountNumber: card.accountNumber,
        caption: formatBankCaption(card.bankName, card.bankCode),
        bankCode: card.bankCode ?? '—',
        iconUrl: card.bankIconUrl,
      };
    });

    return baseOptions.map((option) => ({
      id: option.id,
      title: option.title,
      subtitle: option.accountNumber && (titleCounts.get(option.title) ?? 0) > 1
        ? maskAccount(option.accountNumber)
        : undefined,
      caption: option.caption,
      bankCode: option.bankCode,
      iconUrl: option.iconUrl,
    }));
  }, [allCards, currentCard?.id, t.receive.myAccount]);

  const qrRefCallbacks = useMemo<Record<string, (handle: StyledQRCodeHandle | null) => void>>(() => {
    const callbacks: Record<string, (handle: StyledQRCodeHandle | null) => void> = {};

    for (const slide of renderSlides) {
      callbacks[slide.renderKey] = (handle) => {
        qrHandleRef.current[slide.renderKey] = handle;
      };
    }

    return callbacks;
  }, [renderSlides]);

  /**
   * Returns the underlying QR canvas element for PNG export.
   * StyledQRCode always uses data URIs for the centre logo, so the canvas
   * is never tainted by cross-origin resources.
   */
  const getExportCanvas = useCallback((): HTMLCanvasElement | null => {
    return currentRenderSlide ? (qrHandleRef.current[currentRenderSlide.renderKey]?.getCanvas() ?? null) : null;
  }, [currentRenderSlide]);

  const trimmedCustomName = customName.trim();

  /**
   * Labels to include in exported PNG images.
   * Order: customName above QR, bankLine + accountLine below QR.
   */
  const exportLabels = useMemo(() => ({
    customName: trimmedCustomName || undefined,
    bankLine: showBankNameSetting && currentBankName && currentBankCode
      ? `(${currentBankCode}) ${currentBankName}`
      : undefined,
    accountLine: currentAccountNumber
      ? (accountRevealed ? currentAccountNumber : '')
      : undefined,
  }), [accountRevealed, currentAccountNumber, currentBankCode, currentBankName, showBankNameSetting, trimmedCustomName]);

  const { isClosing, requestClose, onAnimationEnd } = useDelayedClose(onClose);

  /** `navigator.share` is only available in secure contexts (HTTPS / PWA). */
  const supportsNativeShare = typeof navigator.share === 'function';

  /** `ClipboardItem` + `navigator.clipboard.write` for copying images. */
  const supportsClipboardWrite = typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';

  // Focus trap: active only when no sub-overlay is on top
  useFocusTrap(modalRef, !shareMenu.isOpen && !linkSettingsToggle.isOpen && !isFullscreen && !showAccountPicker);
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (feedbackShowTimerRef.current) window.clearTimeout(feedbackShowTimerRef.current);
      if (feedbackHideTimerRef.current) window.clearTimeout(feedbackHideTimerRef.current);
      clearScrollSettleTimer();
    };
  }, [clearScrollSettleTimer]);

  const scrollToRenderIndex = useCallback((targetRenderIndex: number, behavior: 'smooth' | 'instant' = 'smooth') => {
    const viewport = scrollViewportRef.current;
    if (!viewport || !canSwitch) return;

    const nextRenderIndex = clampIndex(targetRenderIndex, renderSlides.length);
    const left = viewport.clientWidth * nextRenderIndex;

    if (behavior !== 'smooth' || prefersReducedMotion()) {
      viewport.scrollLeft = left;
      return;
    }

    try {
      viewport.scrollTo({ left, behavior: 'smooth' });
    } catch {
      viewport.scrollLeft = left;
    }
  }, [canSwitch, renderSlides.length]);

  const commitLogicalIndex = useCallback((nextLogicalIndex: number) => {
    const safeIndex = clampIndex(nextLogicalIndex, allCards.length);
    const nextCardId = allCards[safeIndex]?.id;

    if (hasExternalSync) {
      if (nextCardId && nextCardId !== activeCardId) {
        onActiveCardChange?.(nextCardId);
      }
    }
  }, [activeCardId, allCards, hasExternalSync, onActiveCardChange]);

  const syncActiveIndexFromScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport || !canSwitch) return;

    const rawRenderIndex = getNearestRenderIndex(viewport.scrollLeft, viewport.clientWidth, renderSlides.length);
    const nextRenderIndex = getLoopedRenderIndex(rawRenderIndex, allCards.length);
    const nextSlide = renderSlides[nextRenderIndex];
    if (!nextSlide) return;

    if (nextRenderIndex !== currentRenderIndexRef.current) {
      syncCurrentRenderIndex(nextRenderIndex);
    }

    commitLogicalIndex(nextSlide.logicalIndex);

    if (nextRenderIndex !== rawRenderIndex) {
      scrollToRenderIndex(nextRenderIndex, 'instant');
    }
  }, [allCards.length, canSwitch, commitLogicalIndex, renderSlides, scrollToRenderIndex, syncCurrentRenderIndex]);

  const syncVisibleRenderIndexFromScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport || !canSwitch) return;

    const rawRenderIndex = getNearestRenderIndex(viewport.scrollLeft, viewport.clientWidth, renderSlides.length);

    if (rawRenderIndex !== currentRenderIndexRef.current) {
      syncCurrentRenderIndex(rawRenderIndex);
    }
  }, [canSwitch, renderSlides.length, syncCurrentRenderIndex]);

  const handleViewportScroll = useCallback(() => {
    if (!canSwitch) return;

    syncVisibleRenderIndexFromScroll();

    clearScrollSettleTimer();

    scrollSettleTimerRef.current = window.setTimeout(() => {
      syncActiveIndexFromScroll();
    }, SCROLL_SETTLE_DELAY_MS);
  }, [canSwitch, clearScrollSettleTimer, syncActiveIndexFromScroll, syncVisibleRenderIndexFromScroll]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport || !canSwitch) return;

    const handleScrollEnd = () => {
      clearScrollSettleTimer();
      syncActiveIndexFromScroll();
    };

    viewport.addEventListener('scrollend', handleScrollEnd as EventListener);
    return () => viewport.removeEventListener('scrollend', handleScrollEnd as EventListener);
  }, [canSwitch, clearScrollSettleTimer, syncActiveIndexFromScroll]);

  useLayoutEffect(() => {
    if (!canSwitch) return;
    const desiredRenderIndex = getRealRenderIndex(externalActiveIndex, allCards.length);

    if (desiredRenderIndex !== currentRenderIndexRef.current) {
      syncCurrentRenderIndex(desiredRenderIndex);
    }

    scrollToRenderIndex(desiredRenderIndex, 'instant');
  }, [allCards.length, canSwitch, externalActiveIndex, scrollToRenderIndex, syncCurrentRenderIndex]);

  useEffect(() => {
    if (!canSwitch) return;

    const handleResize = () => {
      scrollToRenderIndex(currentRenderIndexRef.current, 'instant');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canSwitch, scrollToRenderIndex]);

  // Escape handler — closes the topmost active layer
  const shareMenuIsOpen = shareMenu.isOpen;
  const shareMenuClose = shareMenu.close;
  const linkSettingsIsOpen = linkSettingsToggle.isOpen;
  const linkSettingsClose = linkSettingsToggle.close;
  const accountPickerIsOpen = showAccountPicker;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isFullscreen) return; // QRFullscreen has its own Escape handler
      if (isEncrypting) return;
      if (accountPickerIsOpen) { setShowAccountPicker(false); return; }
      if (linkSettingsIsOpen) { linkSettingsClose(); return; }
      if (shareMenuIsOpen) { shareMenuClose(); return; }
      requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestClose, isFullscreen, shareMenuIsOpen, shareMenuClose, linkSettingsIsOpen, linkSettingsClose, isEncrypting, accountPickerIsOpen]);

  const goToRenderIndex = useCallback((targetRenderIndex: number) => {
    const nextRenderIndex = clampIndex(targetRenderIndex, renderSlides.length);
    if (nextRenderIndex === currentRenderIndexRef.current) return;
    haptic();
    scrollToRenderIndex(nextRenderIndex, 'smooth');
  }, [renderSlides.length, scrollToRenderIndex]);

  const normalizeLoopBoundaryForNavigation = useCallback(() => {
    if (!canSwitch) return currentRenderIndexRef.current;

    const nextRenderIndex = getLoopedRenderIndex(currentRenderIndexRef.current, allCards.length);
    if (nextRenderIndex === currentRenderIndexRef.current) return nextRenderIndex;

    const nextSlide = renderSlides[nextRenderIndex];
    if (!nextSlide) return currentRenderIndexRef.current;

    clearScrollSettleTimer();
    syncCurrentRenderIndex(nextRenderIndex);
    commitLogicalIndex(nextSlide.logicalIndex);
    scrollToRenderIndex(nextRenderIndex, 'instant');

    return nextRenderIndex;
  }, [allCards.length, canSwitch, clearScrollSettleTimer, commitLogicalIndex, renderSlides, scrollToRenderIndex, syncCurrentRenderIndex]);

  const handleGoPrev = useCallback(() => {
    if (!canSwitch) return;
    const baseRenderIndex = normalizeLoopBoundaryForNavigation();
    const targetRenderIndex = baseRenderIndex <= 1
      ? 0
      : baseRenderIndex - 1;
    goToRenderIndex(targetRenderIndex);
  }, [canSwitch, goToRenderIndex, normalizeLoopBoundaryForNavigation]);

  const handleGoNext = useCallback(() => {
    if (!canSwitch) return;
    const baseRenderIndex = normalizeLoopBoundaryForNavigation();
    const targetRenderIndex = baseRenderIndex >= allCards.length
      ? allCards.length + 1
      : baseRenderIndex + 1;
    goToRenderIndex(targetRenderIndex);
  }, [allCards.length, canSwitch, goToRenderIndex, normalizeLoopBoundaryForNavigation]);

  const handleSelectAccountFromPicker = useCallback((cardId: string) => {
    const logicalIndex = findCardIndex(allCards, cardId);
    if (logicalIndex < 0) {
      setShowAccountPicker(false);
      return;
    }

    const targetRenderIndex = canSwitch
      ? getRealRenderIndex(logicalIndex, allCards.length)
      : 0;

    setShowAccountPicker(false);

    if (targetRenderIndex === currentRenderIndexRef.current) return;

    if (canSwitch) {
      goToRenderIndex(targetRenderIndex);
      return;
    }

    const nextSlide = renderSlides[targetRenderIndex];
    if (!nextSlide) return;
    syncCurrentRenderIndex(targetRenderIndex);
    commitLogicalIndex(nextSlide.logicalIndex);
  }, [allCards, canSwitch, commitLogicalIndex, goToRenderIndex, renderSlides, syncCurrentRenderIndex]);

  // Left/Right arrow keys — switch accounts (desktop keyboard support)
  useEffect(() => {
    if (!canSwitch) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen || shareMenuIsOpen || linkSettingsIsOpen || accountPickerIsOpen || isEncrypting) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoPrev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canSwitch, handleGoNext, handleGoPrev, isFullscreen, shareMenuIsOpen, linkSettingsIsOpen, accountPickerIsOpen, isEncrypting]);

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

  const accountActionButtonClass =
    'flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 disabled:opacity-60 disabled:cursor-default disabled:hover:bg-zinc-50 disabled:dark:hover:bg-zinc-900/70';
  const carouselArrowButtonClass =
    'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/80 bg-white/94 text-zinc-500 shadow-md backdrop-blur-sm hover:text-zinc-900 hover:bg-white dark:border-zinc-700/70 dark:bg-zinc-900/92 dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 active:scale-95 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100';
  const carouselArrowTop = useMemo(() => {
    const panelVerticalPadding = 12;
    const qrCardPadding = 16;
    const customNameOffset = trimmedCustomName ? 32 : 0;

    return panelVerticalPadding + qrCardPadding + customNameOffset + qrSize / 2;
  }, [qrSize, trimmedCustomName]);

  /* --- Carousel panel renderer --- */

  const renderPanel = ({ slide, renderIndex }: { slide: QRRenderSlide; renderIndex: number; }) => {
    const { card, renderKey } = slide;
    const isCurrent = renderIndex === currentRenderIndex;
    const panelCenterImage = centerImagesByCardId[card.id];

    return (
      <div className="h-full overflow-y-auto min-h-0">
        <div className="flex flex-col items-center px-6 gap-3 py-3">
          <div className="w-full flex flex-col items-center rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-xs transition-shadow hover:shadow-md dark:border-zinc-800/70">
            {trimmedCustomName && (
              <p className="text-sm font-semibold text-zinc-800 text-center mb-3">{trimmedCustomName}</p>
            )}
            <div className="mx-auto w-fit leading-0">
              <button
                type="button"
                onClick={() => {
                  if (isCurrent) setIsFullscreen(true);
                }}
                aria-label={t.qr.enlargeQR}
                disabled={!isCurrent}
                tabIndex={isCurrent ? 0 : -1}
                className={`block p-0 border-0 bg-transparent leading-0 transition-transform ${
                  isCurrent ? 'cursor-zoom-in active:scale-98' : 'cursor-default'
                }`}
              >
                <StyledQRCode
                  ref={qrRefCallbacks[renderKey]}
                  value={card.value}
                  size={qrSize}
                  dotStyle={dotStyle}
                  eyeStyle={eyeStyle}
                  centerImage={panelCenterImage}
                />
              </button>
            </div>
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
            {note && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">{t.qr.notePrefix}{note}</p>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">{t.qr.safetyReminder}</p>
          </div>
        </div>
      </div>
    );
  };

  const showStaticFooter = Boolean(currentTransferAppUrl || !isSharedView || onRescan || feedback);

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

        <AccountSelectorCard
          title={currentCard?.label || currentBankName || t.receive.myAccount}
          subtitle={currentAccountNumber ? (accountRevealed ? formatAccountDisplay(currentAccountNumber) : maskAccount(currentAccountNumber)) : undefined}
          caption={formatBankCaption(currentBankName, currentBankCode)}
          bankCode={currentBankCode ?? '—'}
          iconUrl={currentCard?.bankIconUrl}
          onClick={() => setShowAccountPicker(true)}
          buttonLabel={t.accountPicker.openLabel}
          compact
        />

        {currentAccountNumber && (
          <div className="grid grid-cols-2 gap-2">
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
              <span className="truncate">{accountRevealed ? t.qr.hideAccount : t.qr.revealAccount}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyAccount}
              aria-label={t.qr.copyAccount}
              title={t.qr.copyAccount}
              className={accountActionButtonClass}
            >
              <Copy size={18} aria-hidden="true" />
              <span className="truncate">{t.qr.copyAccount}</span>
            </button>
          </div>
        )}

        {currentTransferAppUrl && (
          <a
            href={currentTransferAppUrl}
            {...(isIntentUrl(currentTransferAppUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}
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
              currentTransferAppUrl
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
        className={`pointer-events-auto app-modal-shell w-full max-w-sm bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden max-h-[calc(100dvh-2rem)] motion-reduce:animate-none ${isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'}`}
        onAnimationEnd={onAnimationEnd}
      >
        <div className={`flex-1 flex flex-col min-h-0 ${canSwitch ? 'select-none' : ''}`}>
          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 id="qr-modal-title" className="truncate text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {title ?? t.qr.title}
                  </h2>
                  {canSwitch && (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {currentPosition}/{allCards.length}
                    </span>
                  )}
                </div>
              </div>
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
          </div>

          <span className="sr-only" aria-live="polite">
            {currentAccountLiveLabel}
          </span>

          {/* Card viewport — native scroll-snap keeps DOM order stable, so the
              visible card never teleports/recycles at the end of the gesture. */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
          {canSwitch && (
            <>
              <div
                className="pointer-events-none absolute left-2 z-10 -translate-y-1/2 sm:left-3"
                style={{ top: carouselArrowTop }}
              >
                <button
                  type="button"
                  onClick={handleGoPrev}
                  aria-label={t.qr.switchPrev}
                  className={carouselArrowButtonClass}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
              </div>

              <div
                className="pointer-events-none absolute right-2 z-10 -translate-y-1/2 sm:right-3"
                style={{ top: carouselArrowTop }}
              >
                <button
                  type="button"
                  onClick={handleGoNext}
                  aria-label={t.qr.switchNext}
                  className={carouselArrowButtonClass}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
          {canSwitch ? (
            <div
              ref={scrollViewportRef}
              className="h-full flex overflow-x-auto overflow-y-hidden scrollbar-none"
              style={{
                scrollSnapType: 'x mandatory',
                overscrollBehaviorX: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
              onScroll={handleViewportScroll}
            >
              {renderSlides.map((slide, renderIndex) => {
                const isCurrent = renderIndex === currentRenderIndex;

                return (
                  <div
                    key={slide.renderKey}
                    className="w-full h-full shrink-0"
                    style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                    inert={!isCurrent}
                    aria-hidden={!isCurrent}
                  >
                    {renderPanel({ slide, renderIndex })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single panel — no carousel */
            currentRenderSlide ? renderPanel({ slide: currentRenderSlide, renderIndex: currentRenderIndex }) : null
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

    {showAccountPicker && (
      <AccountPickerSheet
        title={t.accountPicker.title}
        description={t.accountPicker.description}
        options={accountPickerOptions}
        selectedId={currentCard?.id ?? allCards[0]?.id ?? ''}
        onSelect={handleSelectAccountFromPicker}
        onClose={() => setShowAccountPicker(false)}
        onManageAccounts={onManageAccounts}
        manageLabel={t.accountPicker.manageAccounts}
        selectedLabel={t.accountPicker.selected}
        closeLabel={t.common.close}
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
        customName={trimmedCustomName || undefined}
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
