import { useBeforeUnload } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useLocaleStore } from '../stores/useLocaleStore';
import { createHistoryLayerToken, historyStateHasLayer, pushHistoryLayer } from '../utils/historyLayers';

interface UseUnsavedChangesGuardOptions {
  when: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

/**
 * Protects long-lived task pages from accidental dismissal.
 *
 * The app currently uses `BrowserRouter`, so data-router-only blockers are not
 * available in production. We therefore use the same synthetic history-layer
 * technique already used by modal flows:
 *
 * - when a task becomes dirty, push a same-URL history layer;
 * - browser Back / swipe-back first pops that synthetic layer, letting us show
 *   a discard-confirm dialog without leaving the route;
 * - explicit Cancel / Back / Esc actions call `confirmNavigation()`;
 * - successful Save / Done actions call `proceedNavigation()`.
 */
export const useUnsavedChangesGuard = ({
  when,
  title,
  description,
  confirmLabel,
}: UseUnsavedChangesGuardOptions) => {
  const t = useLocaleStore((s) => s.t);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingBrowserBack, setPendingBrowserBack] = useState(false);
  const whenRef = useRef(when);
  const historyLayerTokenRef = useRef<string>(createHistoryLayerToken('unsaved-changes'));
  const pendingActionAfterLayerPopRef = useRef<(() => void) | null>(null);
  const pendingLayerPopFallbackTimerRef = useRef<number | null>(null);
  const suppressNextPopRef = useRef(false);
  const proceedingRef = useRef(false);

  const clearLayerPopFallbackTimer = useCallback(() => {
    if (pendingLayerPopFallbackTimerRef.current === null) return;

    window.clearTimeout(pendingLayerPopFallbackTimerRef.current);
    pendingLayerPopFallbackTimerRef.current = null;
  }, []);

  useEffect(() => {
    whenRef.current = when;
    if (when) return;

    proceedingRef.current = false;
    const cleanupTimer = window.setTimeout(() => {
      setPendingAction(null);
      setPendingBrowserBack(false);
    }, 0);

    return () => window.clearTimeout(cleanupTimer);
  }, [when]);

  useBeforeUnload(
    useCallback((event) => {
      if (!when) return;

      event.preventDefault();
      event.returnValue = '';
    }, [when]),
  );

  useEffect(() => {
    const token = historyLayerTokenRef.current;
    if (!when || pendingBrowserBack || proceedingRef.current || historyStateHasLayer(window.history.state, token)) return;

    pushHistoryLayer(token);
  }, [pendingBrowserBack, when]);

  const runProceedingAction = useCallback((action: () => void) => {
    const token = historyLayerTokenRef.current;
    proceedingRef.current = true;

    if (historyStateHasLayer(window.history.state, token)) {
      pendingActionAfterLayerPopRef.current = action;
      window.history.back();

      clearLayerPopFallbackTimer();
      pendingLayerPopFallbackTimerRef.current = window.setTimeout(() => {
        pendingLayerPopFallbackTimerRef.current = null;
        if (pendingActionAfterLayerPopRef.current !== action) return;

        pendingActionAfterLayerPopRef.current = null;
        action();
      }, 100);
      return;
    }

    action();
  }, [clearLayerPopFallbackTimer]);

  useEffect(() => {
    const token = historyLayerTokenRef.current;

    const handlePopState = (event: PopStateEvent) => {
      if (historyStateHasLayer(event.state, token)) return;

      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false;
        return;
      }

      const pendingActionAfterLayerPop = pendingActionAfterLayerPopRef.current;
      if (pendingActionAfterLayerPop) {
        pendingActionAfterLayerPopRef.current = null;
        clearLayerPopFallbackTimer();
        window.setTimeout(() => {
          pendingActionAfterLayerPop();
        }, 0);
        return;
      }

      if (!whenRef.current) {
        suppressNextPopRef.current = true;
        window.history.back();
        return;
      }

      setPendingBrowserBack(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [clearLayerPopFallbackTimer]);

  const confirmNavigation = useCallback((action: () => void) => {
    if (!when) {
      action();
      return;
    }

    setPendingAction(() => action);
  }, [when]);

  const proceedNavigation = useCallback((action: () => void) => {
    runProceedingAction(action);
  }, [runProceedingAction]);

  const scheduleConfirmedLeave = useCallback((action: () => void) => {
    window.setTimeout(action, 0);
  }, []);

  const handleStay = useCallback(() => {
    proceedingRef.current = false;
    setPendingAction(null);

    if (!pendingBrowserBack) return;

    setPendingBrowserBack(false);
    pushHistoryLayer(historyLayerTokenRef.current);
  }, [pendingBrowserBack]);

  const handleLeave = useCallback(() => {
    if (pendingBrowserBack) {
      setPendingBrowserBack(false);
      scheduleConfirmedLeave(() => {
        suppressNextPopRef.current = true;
        window.history.back();
      });
      return;
    }

    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);
    scheduleConfirmedLeave(() => {
      runProceedingAction(action);
    });
  }, [pendingAction, pendingBrowserBack, runProceedingAction, scheduleConfirmedLeave]);

  const confirmationDialog = when && (pendingBrowserBack || pendingAction) ? (
    <ConfirmDialog
      title={title ?? t.common.discardChangesTitle}
      description={description ?? t.common.discardChangesDesc}
      confirmLabel={confirmLabel ?? t.common.discardChangesConfirm}
      onConfirm={handleLeave}
      onCancel={handleStay}
      variant="warning"
    />
  ) : null;

  return {
    confirmNavigation,
    proceedNavigation,
    confirmationDialog,
  };
};
