import { useState, useCallback, useEffect, useLayoutEffect, useRef, type AnimationEvent } from 'react';
import { createHistoryLayerToken, historyStateHasLayer, pushHistoryLayer } from '../utils/historyLayers';
import { prefersReducedMotion } from '../utils/motion';

interface UseAnimatedToggleOptions {
  /** When true, browser Back / swipe-back closes this layer before leaving the page. */
  historyBack?: boolean;
}

type ClosePhase = 'idle' | 'closing-ui' | 'closing-history' | 'awaiting-history-pop';

export interface AnimatedToggleClose {
  (): void;
  (onClosed: () => void): void;
}

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
export const useAnimatedToggle = (options: UseAnimatedToggleOptions = {}) => {
  const { historyBack = false } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const animationFallbackTimerRef = useRef<number | null>(null);
  const popFallbackTimerRef = useRef<number | null>(null);
  const onClosedRef = useRef<(() => void) | null>(null);
  const settledRef = useRef(false);
  const isOpenRef = useRef(false);
  const isClosingRef = useRef(false);
  const closePhaseRef = useRef<ClosePhase>('idle');
  const historyLayerTokenRef = useRef<string | null>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

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

  const finalise = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    clearFallbackTimers();
    isOpenRef.current = false;
    isClosingRef.current = false;
    setIsOpen(false);
    setIsClosing(false);
    closePhaseRef.current = 'idle';
    const cb = onClosedRef.current;
    onClosedRef.current = null;
    cb?.();
  }, [clearFallbackTimers]);

  const settleCloseAfterAnimation = useCallback(() => {
    if (!isClosingRef.current) return;

    if (!historyBack || !historyLayerTokenRef.current) {
      finalise();
      return;
    }

    if (closePhaseRef.current === 'closing-history') {
      finalise();
      return;
    }

    if (closePhaseRef.current === 'closing-ui') {
      if (!historyStateHasLayer(window.history.state, historyLayerTokenRef.current)) {
        finalise();
        return;
      }

      closePhaseRef.current = 'awaiting-history-pop';
      popFallbackTimerRef.current = window.setTimeout(() => {
        finalise();
      }, 180);
      window.history.back();
    }
  }, [finalise, historyBack]);

  const open = useCallback(() => {
    clearFallbackTimers();
    onClosedRef.current = null;
    settledRef.current = false;
    closePhaseRef.current = 'idle';
    isOpenRef.current = true;
    isClosingRef.current = false;
    setIsClosing(false);
    setIsOpen(true);
  }, [clearFallbackTimers]);

  const close = useCallback<AnimatedToggleClose>(
    (onClosed?: () => void) => {
      onClosedRef.current = onClosed ?? null;
      if (!isOpenRef.current || isClosingRef.current) return;

      settledRef.current = false;
      closePhaseRef.current = 'closing-ui';
      isClosingRef.current = true;
      setIsClosing(true);
      if (prefersReducedMotion()) {
        settleCloseAfterAnimation();
        return;
      }
      // Safety fallback if animationend never fires.
      animationFallbackTimerRef.current = window.setTimeout(settleCloseAfterAnimation, 200);
    },
    [settleCloseAfterAnimation],
  );

  /** Attach to the overlay's `onAnimationEnd` to finalise close. */
  const onAnimationEnd = useCallback((e: AnimationEvent) => {
    // Ignore events bubbling up from child element animations
    if (e.currentTarget !== e.target) return;
    settleCloseAfterAnimation();
  }, [settleCloseAfterAnimation]);

  useLayoutEffect(() => {
    if (!historyBack || !isOpen) return;

    const historyLayerToken = createHistoryLayerToken('animated-toggle');
    historyLayerTokenRef.current = historyLayerToken;
    pushHistoryLayer(historyLayerToken);

    const handlePopState = (event: PopStateEvent) => {
      if (historyStateHasLayer(event.state, historyLayerToken)) return;

      if (closePhaseRef.current === 'awaiting-history-pop') {
        finalise();
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

      if (prefersReducedMotion()) {
        settleCloseAfterAnimation();
        return;
      }

      animationFallbackTimerRef.current = window.setTimeout(() => {
        settleCloseAfterAnimation();
      }, 200);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      historyLayerTokenRef.current = null;
      window.removeEventListener('popstate', handlePopState);
      clearFallbackTimers();
    };
  }, [clearFallbackTimers, finalise, historyBack, isOpen, settleCloseAfterAnimation]);

  useEffect(() => {
    return () => {
      clearFallbackTimers();
    };
  }, [clearFallbackTimers]);

  return { isOpen, isClosing, open, close, onAnimationEnd } as const;
};
