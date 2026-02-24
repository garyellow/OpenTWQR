import { useState, useCallback, useEffect } from 'react';

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

  const requestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    if (!isClosing) return;
    const id = setTimeout(onClose, delay);
    return () => clearTimeout(id);
  }, [isClosing, onClose, delay]);

  return { isClosing, requestClose };
};
