import { useCallback, useEffect, useRef } from 'react';
import { createHistoryLayerToken, historyStateHasLayer, pushHistoryLayer } from '../utils/historyLayers';

interface UseHistoryDismissStateOptions {
  active: boolean;
  onDismiss: () => void;
}

/**
 * Registers a synthetic browser-history entry for a transient in-page state.
 *
 * Use this for view-state transitions that are not rendered as a modal but
 * should still be unwound by browser Back / swipe-back before leaving the page.
 */
export const useHistoryDismissState = ({ active, onDismiss }: UseHistoryDismissStateOptions) => {
  const onDismissRef = useRef(onDismiss);
  const historyLayerTokenRef = useRef<string | null>(null);
  const popFallbackTimerRef = useRef<number | null>(null);
  const waitingForPopRef = useRef(false);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const clearFallbackTimer = useCallback(() => {
    if (popFallbackTimerRef.current !== null) {
      window.clearTimeout(popFallbackTimerRef.current);
      popFallbackTimerRef.current = null;
    }
  }, []);

  const requestDismiss = useCallback(() => {
    if (!historyLayerTokenRef.current) {
      onDismissRef.current();
      return;
    }

    if (waitingForPopRef.current) return;

    waitingForPopRef.current = true;
    popFallbackTimerRef.current = window.setTimeout(() => {
      waitingForPopRef.current = false;
      onDismissRef.current();
    }, 180);
    window.history.back();
  }, []);

  useEffect(() => {
    if (!active) return;

    const historyLayerToken = createHistoryLayerToken('state-dismiss');
    historyLayerTokenRef.current = historyLayerToken;
    waitingForPopRef.current = false;
    pushHistoryLayer(historyLayerToken);

    const handlePopState = (event: PopStateEvent) => {
      if (historyStateHasLayer(event.state, historyLayerToken)) return;

      waitingForPopRef.current = false;
      clearFallbackTimer();
      onDismissRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      historyLayerTokenRef.current = null;
      waitingForPopRef.current = false;
      window.removeEventListener('popstate', handlePopState);
      clearFallbackTimer();
    };
  }, [active, clearFallbackTimer]);

  return requestDismiss;
};
