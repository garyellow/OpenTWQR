import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Trap keyboard focus inside a container element.
 *
 * - Tab / Shift-Tab cycles through focusable children.
 * - On mount, focus moves to `initialFocusRef` (if provided) or the first
 *   focusable element inside the container.
 * - On unmount, focus returns to the element that was focused before the trap
 *   activated.
 */
export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  initialFocusRef?: RefObject<HTMLElement | null>,
) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Remember the element that had focus before the trap opens.
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Move focus into the trap.
    const setInitialFocus = () => {
      // If autoFocus (or another mechanism) has already placed focus inside
      // the trap, respect it and do nothing. Overriding would move focus to
      // the wrong element (e.g. the close button) and dismiss the mobile
      // virtual keyboard that autoFocus triggered.
      if (container.contains(document.activeElement)) return;

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        first?.focus();
      }
    };

    // Use rAF to wait for the DOM to settle (e.g. after animation).
    const rafId = requestAnimationFrame(setInitialFocus);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('keydown', onKeyDown);

      // Restore focus to the previously-focused element.
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [active, containerRef, initialFocusRef]);
};
