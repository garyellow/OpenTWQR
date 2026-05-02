import { useState, useCallback, useEffect, useLayoutEffect, useRef, type AnimationEvent } from 'react';
import { createHistoryLayerToken, historyStateHasLayer, pushHistoryLayer } from '../utils/historyLayers';

interface UseDelayedCloseOptions {
  /** When true, browser Back / swipe-back closes this layer before leaving the page. */
  historyBack?: boolean;
}

type ClosePhase = 'idle' | 'closing-ui' | 'closing-history' | 'awaiting-history-pop';

export interface DelayedCloseRequest {
  (): void;
  (onClosed: () => void): void;
  (event: unknown): void;
}

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
export const useDelayedClose = (onClose: () => void, options: UseDelayedCloseOptions = {}) => {
  const { historyBack = false } = options;
  const [isClosing, setIsClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  const onClosedRef = useRef<(() => void) | null>(null);
  const settledRef = useRef(false);
  const isClosingRef = useRef(false);
  const closePhaseRef = useRef<ClosePhase>('idle');
  const animationFallbackTimerRef = useRef<number | null>(null);
  const popFallbackTimerRef = useRef<number | null>(null);
  const historyLayerTokenRef = useRef<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    isClosingRef.current = isClosing;
  }, [isClosing]);

  const clearFallbackTimers = useCallback(() => {
    if (animationFallbackTimerRef.current !== null) {
      window.clearTimeout(animationFallbackTimerRef.current);
      animationFallbackTimerRef.current = null;
    }

    if (popFallbackTimerRef.current !== null) {
      window.clearTimeout(popFallbackTimerRef.current);
      popFallbackTimerRef.current = null;
    }
  }, []);

  const finaliseClose = useCallback(() => {
    if (settledRef.current) return;

    settledRef.current = true;
    clearFallbackTimers();
    isClosingRef.current = false;
    setIsClosing(false);
    closePhaseRef.current = 'idle';

    const onClosed = onClosedRef.current;
    onClosedRef.current = null;

    onCloseRef.current();
    onClosed?.();
  }, [clearFallbackTimers]);

  const settleCloseAfterAnimation = useCallback(() => {
    if (!isClosingRef.current) return;

    if (!historyBack || !historyLayerTokenRef.current) {
      finaliseClose();
      return;
    }

    if (closePhaseRef.current === 'closing-history') {
      finaliseClose();
      return;
    }

    if (closePhaseRef.current === 'closing-ui') {
      if (!historyStateHasLayer(window.history.state, historyLayerTokenRef.current)) {
        finaliseClose();
        return;
      }

      closePhaseRef.current = 'awaiting-history-pop';
      popFallbackTimerRef.current = window.setTimeout(() => {
        finaliseClose();
      }, 180);
      window.history.back();
    }
  }, [finaliseClose, historyBack]);

  const requestClose = useCallback<DelayedCloseRequest>((onClosed?: unknown) => {
    // Some call sites intentionally use `onClick={requestClose}`. React then
    // passes the click event as the first argument; only store real callbacks.
    if (typeof onClosed === 'function') onClosedRef.current = onClosed as () => void;
    if (isClosingRef.current) return;

    settledRef.current = false;
    closePhaseRef.current = 'closing-ui';
    isClosingRef.current = true;
    setIsClosing(true);
  }, []);

  /** Attach to the overlay's `onAnimationEnd` to finalise close. */
  const handleAnimationEnd = useCallback((e: AnimationEvent) => {
    // Ignore events bubbling up from child element animations
    if (e.currentTarget !== e.target) return;
    settleCloseAfterAnimation();
  }, [settleCloseAfterAnimation]);

  // Safety fallback: if the animationend event never fires (e.g.
  // prefers-reduced-motion or animation-duration: 0), settle after 200 ms.
  useEffect(() => {
    if (!isClosing) return;

    animationFallbackTimerRef.current = window.setTimeout(() => {
      settleCloseAfterAnimation();
    }, 200);

    return () => {
      if (animationFallbackTimerRef.current !== null) {
        window.clearTimeout(animationFallbackTimerRef.current);
        animationFallbackTimerRef.current = null;
      }
    };
  }, [isClosing, settleCloseAfterAnimation]);

  useLayoutEffect(() => {
    if (!historyBack) return;

    const historyLayerToken = createHistoryLayerToken('delayed-close');
    historyLayerTokenRef.current = historyLayerToken;
    pushHistoryLayer(historyLayerToken);

    const handlePopState = (event: PopStateEvent) => {
      if (historyStateHasLayer(event.state, historyLayerToken)) return;

      if (closePhaseRef.current === 'awaiting-history-pop') {
        finaliseClose();
        return;
      }

      if (closePhaseRef.current === 'closing-ui') {
        closePhaseRef.current = 'closing-history';
        return;
      }

      if (isClosingRef.current) return;

      settledRef.current = false;
      closePhaseRef.current = 'closing-history';
      isClosingRef.current = true;
      setIsClosing(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      historyLayerTokenRef.current = null;
      window.removeEventListener('popstate', handlePopState);
      clearFallbackTimers();
    };
  }, [clearFallbackTimers, finaliseClose, historyBack]);

  return { isClosing, requestClose, onAnimationEnd: handleAnimationEnd };
};
