import { useState, useEffect, useCallback, useRef } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

export interface BeforeInstallPromptEvent extends Event {
  /**
   * Shows the browser's native install dialog.
   *
   * Returns a promise resolving to the user's choice. This is the
   * modern API — the separate `userChoice` property is deprecated.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt
   */
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type Platform = 'chromium' | 'ios' | null;

interface InstallPromptState {
  /** Whether the install banner should be shown */
  canShow: boolean;
  /** The platform-specific context for the prompt */
  platform: Platform;
  /** Trigger the native Chromium install dialog */
  promptInstall: () => Promise<void>;
  /** Dismiss the banner and remember the choice */
  dismiss: () => void;
}

const DISMISS_KEY = 'opentwqr-install-dismissed';
/** Don't re-prompt for 30 days after dismissal */
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
/** Delay showing the banner to avoid interrupting first-load experience */
const SHOW_DELAY_MS = 5_000;

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  return false;
}

function isDismissed(): boolean {
  const raw = safeGetItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DURATION_MS;
}

function detectIOSSafari(): boolean {
  const ua = navigator.userAgent;
  // Detect iOS/iPadOS — covers iPhone, iPad, iPod, and iPadOS
  // (iPadOS reports "Macintosh" in UA but has touch support)
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  // Must be in Safari (not Chrome-on-iOS, Firefox-on-iOS, etc.)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

/**
 * Manages the PWA install prompt across platforms.
 *
 * - **Chromium** (Chrome, Edge, Samsung Internet, etc.): captures the
 *   `beforeinstallprompt` event and defers it so we can trigger a native
 *   install dialog from our own UI.
 * - **iOS Safari**: detects the platform and shows manual "Add to Home
 *   Screen" instructions, since Safari doesn't support `beforeinstallprompt`.
 * - **Already installed / dismissed**: hides the banner.
 */
export function useInstallPrompt(): InstallPromptState {
  const [platform, setPlatform] = useState<Platform>(null);
  const [canShow, setCanShow] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const showTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Already running as installed PWA — never show
    if (isStandalone()) return;
    // User dismissed recently — don't show
    if (isDismissed()) return;

    // --- Chromium path ---
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      // Delay showing to let the user orient themselves first
      showTimerRef.current = window.setTimeout(() => {
        setPlatform('chromium');
        setCanShow(true);
      }, SHOW_DELAY_MS);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // --- iOS Safari path ---
    if (detectIOSSafari()) {
      showTimerRef.current = window.setTimeout(() => {
        setPlatform('ios');
        setCanShow(true);
      }, SHOW_DELAY_MS);
    }

    // --- Already installed (appinstalled fires after successful install) ---
    const handleInstalled = () => {
      setCanShow(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    // `prompt()` returns { outcome, platform } directly (modern API)
    const { outcome } = await prompt.prompt();
    deferredPromptRef.current = null;
    if (outcome === 'accepted') {
      setCanShow(false);
    } else {
      // User dismissed the native dialog — hide the banner and
      // remember the choice so we don't nag again for 30 days.
      setCanShow(false);
      safeSetItem(DISMISS_KEY, String(Date.now()));
    }
  }, []);

  const dismiss = useCallback(() => {
    setCanShow(false);
    deferredPromptRef.current = null;
    safeSetItem(DISMISS_KEY, String(Date.now()));
  }, []);

  return { canShow, platform, promptInstall, dismiss };
}
