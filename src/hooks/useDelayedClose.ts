import { useState, useCallback, useEffect, useRef, type AnimationEvent } from 'react';

/**
 * Adds a short "closing" phase before the consumer's `onClose` is called,
 * giving CSS exit animations time to play.
 *
 * Uses `animationend` events for precise synchronisation with CSS animations.
 * A safety timeout prevents the modal from getting stuck if the event never
 * fires (e.g. `prefers-reduced-motion` disabling all animations).
 *
 * `settledRef` ensures `onClose` is called at most once per close cycle,
 * preventing a double-fire race between `animationend` and the safety timeout
 * in React 18 concurrent mode (where state updates may be deferred).
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
  const settledRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => {
    settledRef.current = false;
    setIsClosing(true);
  }, []);

  /** Attach to the overlay's `onAnimationEnd` to finalise close. */
  const handleAnimationEnd = useCallback((e: AnimationEvent) => {
    // Ignore events bubbling up from child element animations
    if (e.currentTarget !== e.target) return;
    if (!isClosing) return;
    if (settledRef.current) return;
    settledRef.current = true;
    onCloseRef.current();
  }, [isClosing]);

  // Safety fallback: if the animationend event never fires (e.g.
  // prefers-reduced-motion or animation-duration: 0), close after 200 ms.
  useEffect(() => {
    if (!isClosing) return;
    const id = setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      onCloseRef.current();
    }, 200);
    return () => clearTimeout(id);
  }, [isClosing]);

  return { isClosing, requestClose, onAnimationEnd: handleAnimationEnd };
};
