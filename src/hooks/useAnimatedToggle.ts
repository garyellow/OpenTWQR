import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Manages visibility + closing animation state for overlays.
 *
 * Uses `animationend` events for precise synchronisation with CSS exit
 * animations. A safety timeout prevents the overlay from getting stuck if
 * the event never fires.
 *
 * Usage:
 *   const toggle = useAnimatedToggle();
 *   // `close()` starts exit animation; the overlay unmounts when the
 *   //  `onAnimationEnd` handler fires or the safety timeout elapses.
 *   // Optionally run a callback after unmount: `close(() => doSomething())`.
 */
export const useAnimatedToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const onClosedRef = useRef<(() => void) | null>(null);

  const finalise = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
    setIsClosing(false);
    const cb = onClosedRef.current;
    onClosedRef.current = null;
    cb?.();
  }, []);

  const open = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onClosedRef.current = null;
    setIsClosing(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(
    (onClosed?: () => void) => {
      onClosedRef.current = onClosed ?? null;
      setIsClosing(true);
      // Safety fallback if animationend never fires.
      timerRef.current = window.setTimeout(finalise, 200);
    },
    [finalise],
  );

  /** Attach to the overlay's `onAnimationEnd` to finalise close. */
  const onAnimationEnd = useCallback(() => {
    if (!isClosing) return;
    finalise();
  }, [isClosing, finalise]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isOpen, isClosing, open, close, onAnimationEnd } as const;
};
