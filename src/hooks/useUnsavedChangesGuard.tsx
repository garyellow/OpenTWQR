import { useBeforeUnload } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useLocaleStore } from '../stores/useLocaleStore';
import { createHistoryLayerToken, historyStateHasLayer, pushHistoryLayer, readHistoryLayers } from '../utils/historyLayers';

function buildStateWithoutLayer(state: unknown, layerToken: string) {
  const layers = readHistoryLayers(state).filter((layer) => layer !== layerToken);

  if (typeof state === 'object' && state !== null) {
    return {
      ...state,
      __otwqrHistoryLayers: layers,
    };
  }

  return {
    __otwqrHistoryLayers: layers,
  };
}

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
  const [prevWhen, setPrevWhen] = useState(when);

  if (prevWhen !== when) {
    setPrevWhen(when);
    if (!when) {
      proceedingRef.current = false;
      setPendingAction(null);
      setPendingBrowserBack(false);
    }
  }

  const whenRef = useRef(when);
  const historyLayerTokenRef = useRef<string>(createHistoryLayerToken('unsaved-changes'));
  const pendingActionAfterLayerPopRef = useRef<(() => void) | null>(null);
  const suppressNextPopRef = useRef(false);
  const proceedingRef = useRef(false);

  useEffect(() => {
    whenRef.current = when;
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
      const fallbackState = buildStateWithoutLayer(window.history.state, token);
      window.history.back();
      window.setTimeout(() => {
        if (pendingActionAfterLayerPopRef.current !== action) return;

        window.dispatchEvent(new PopStateEvent('popstate', { state: fallbackState }));
      }, 0);
      return;
    }

    action();
  }, []);

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
  }, []);

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

  const confirmationDialog = (pendingBrowserBack || pendingAction) ? (
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
