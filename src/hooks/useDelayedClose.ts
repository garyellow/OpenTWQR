import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Adds a short "closing" phase before the consumer's `onClose` is called,
 * giving CSS exit animations time to play.
 *
 * Uses `animationend` events for precise synchronisation with CSS animations.
 * A safety timeout prevents the modal from getting stuck if the event never
 * fires (e.g. `prefers-reduced-motion` disabling all animations).
 *
 * Usage:
 *   const { isClosing, requestClose, onAnimationEnd } = useDelayedClose(onClose);
 *   // Replace every direct `onClose()` call with `requestClose()`.
 *   // Apply `animate-out` classes when `isClosing === true`.
 *   // Attach `onAnimationEnd` to the **overlay** element.
 */
export const useDelayedClose = (onClose: () => void) => {
  const [isClosing, setIsClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const requestClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  /** Attach to the overlay's `onAnimationEnd` to finalise close. */
  const handleAnimationEnd = useCallback(() => {
    if (!isClosing) return;
    onCloseRef.current();
  }, [isClosing]);

  // Safety fallback: if the animationend event never fires (e.g.
  // prefers-reduced-motion or animation-duration: 0), close after 200 ms.
  useEffect(() => {
    if (!isClosing) return;
    const id = setTimeout(() => onCloseRef.current(), 200);
    return () => clearTimeout(id);
  }, [isClosing]);

  return { isClosing, requestClose, onAnimationEnd: handleAnimationEnd };
};
