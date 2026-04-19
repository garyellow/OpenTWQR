import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseRouteTaskDismissOptions {
  fallbackTo: string;
  replace?: boolean;
  viewTransition?: boolean;
  onEscape?: () => void;
}

/**
 * Unified dismiss handler for route-based task screens.
 *
 * - If the user navigated here from another in-app route, dismiss behaves like Back.
 * - If the task route was opened directly, dismiss falls back to a safe parent route.
 * - Escape always triggers the same dismiss path as the header button / cancel action.
 */
export const useRouteTaskDismiss = ({
  fallbackTo,
  replace = true,
  viewTransition = true,
  onEscape,
}: UseRouteTaskDismissOptions) => {
  const navigate = useNavigate();

  const dismiss = useCallback(() => {
    const historyState = window.history.state as { idx?: unknown } | null;
    const canGoBack = typeof historyState?.idx === 'number' && historyState.idx > 0;

    if (canGoBack) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo, { replace, viewTransition });
  }, [fallbackTo, navigate, replace, viewTransition]);

  useEffect(() => {
    const escapeAction = onEscape ?? dismiss;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      escapeAction();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dismiss, onEscape]);

  return dismiss;
};
