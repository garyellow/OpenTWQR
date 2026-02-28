import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { OpenTWQRLogo } from '../ui/OpenTWQRLogo';

/**
 * Full-screen privacy overlay displayed when the app enters the background.
 *
 * Mirrors the behaviour of banking / payment apps (e.g. 國泰世華、中信、玉山)
 * that show a branded splash with frosted-glass blur in the OS task-switcher,
 * preventing bystanders from glimpsing sensitive account data.
 *
 * Implementation:
 * - Uses `backdrop-filter: blur(64px)` with a semi-transparent background
 *   to heavily blur the underlying app content (frosted glass effect).
 * - Centres the coloured OpenTWQR SVG logo as the sole visual element —
 *   clean, branded, and recognisable in the task switcher thumbnail.
 * - The overlay is kept hidden via `visibility: hidden` (not `display: none`)
 *   so that toggling to visible is a **synchronous** style change — no React
 *   re-render required.  This guarantees the overlay paints before the OS
 *   captures the app-switcher screenshot.
 *
 * The component renders nothing (and registers no listeners) when app lock
 * is disabled.
 *
 * ## Event strategy
 *
 * | Event                    | iOS Safari | Android Chrome |
 * |--------------------------|------------ |----------------|
 * | `window` `blur`          | unreliable  | fires BEFORE screenshot ✓ |
 * | `visibilitychange hidden` | fires BEFORE screenshot ✓ | fires AFTER screenshot ✗ |
 *
 * Android OS composites the Recents thumbnail at the moment the browser window
 * loses focus, which is **before** `visibilitychange → hidden` is dispatched to
 * JS.  Listening to `window.blur` catches this early enough on Android.
 * `visibilitychange` remains the reliable path for iOS / desktop.
 *
 * We hide the overlay only when the page is truly visible again (both
 * `window.focus` received **and** `document.visibilityState === 'visible'`),
 * preventing a premature hide caused by OS permission dialogs or IME popups
 * that briefly steal focus without actually backgrounding the app.
 */
export const PrivacyScreen = () => {
  const authEnabled = useAuthStore((s) => s.isEnabled);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authEnabled) return;

    const show = () => {
      const el = overlayRef.current;
      if (el) el.style.visibility = 'visible';
    };

    const hide = () => {
      const el = overlayRef.current;
      if (el) el.style.visibility = 'hidden';
    };

    // iOS: visibilitychange fires before the screenshot is taken.
    // Android: visibilitychange fires AFTER — so we also rely on window.blur.
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        show();
      } else {
        // Only hide when the page is truly back in the foreground.
        hide();
      }
    };

    // Android: window loses focus just before Android composites the
    // app-switcher thumbnail — this is our earliest reliable signal.
    const handleBlur = () => show();

    // Hide only when the window regains focus AND the page is visible,
    // to avoid a false hide from OS dialogs / IME that steal focus briefly.
    const handleFocus = () => {
      if (document.visibilityState === 'visible') hide();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [authEnabled]);

  if (!authEnabled) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-3xl"
      style={{ visibility: 'hidden' }}
      aria-hidden="true"
    >
      <OpenTWQRLogo className="h-10 w-auto" />
    </div>
  );
};
