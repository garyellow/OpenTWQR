import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Adds a short "closing" phase before the consumer's `onClose` is called,
 * giving CSS exit animations time to play.
 *
 * Usage:
 *   const { isClosing, requestClose } = useDelayedClose(onClose);
 *   // Replace every direct `onClose()` call with `requestClose()`.
 *   // Apply `animate-out` classes when `isClosing === true`.
 */
export const useDelayedClose = (onClose: () => void, delay = 150) => {
  const [isClosing, setIsClosing] = useState(false);
  // Sync the latest onClose into a ref so the timer callback is never stale,
  // and the timer itself doesn't restart when the parent re-renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const requestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    if (!isClosing) return;
    const id = setTimeout(() => onCloseRef.current(), delay);
    return () => clearTimeout(id);
  }, [isClosing, delay]);

  return { isClosing, requestClose };
};
