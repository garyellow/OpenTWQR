import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Manages visibility + closing animation state for overlays.
 * Encapsulates the repeated `isXxxClosing + setTimeout` pattern.
 *
 * Usage:
 *   const { isOpen, isClosing, open, close } = useAnimatedToggle();
 *   // `close()` starts exit animation; after `delay` ms the overlay unmounts.
 *   // Optionally run a callback after unmount: `close(() => doSomething())`.
 */
export const useAnimatedToggle = (delay = 150) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const open = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsClosing(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(
    (onClosed?: () => void) => {
      setIsClosing(true);
      timerRef.current = window.setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        timerRef.current = null;
        onClosed?.();
      }, delay);
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isOpen, isClosing, open, close } as const;
};
