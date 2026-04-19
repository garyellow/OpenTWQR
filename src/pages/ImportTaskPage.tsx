import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TaskPage } from '../components/layout/TaskPage';
import { ImportTaskContent } from '../components/settings/ImportTaskContent';
import { useRouteTaskDismiss } from '../hooks/useRouteTaskDismiss';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useLocaleStore } from '../stores/useLocaleStore';

interface ImportTaskLocationState {
  initialText?: string;
  fallbackTo?: string;
}

export const ImportTaskPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useLocaleStore((s) => s.t);
  const [isDirty, setIsDirty] = useState(false);
  const [exitTo, setExitTo] = useState<string | null>(null);
  const guardedDismissRef = useRef<() => void>(() => undefined);

  const locationState = location.state as ImportTaskLocationState | null;
  const fallbackTo = useMemo(() => {
    if (locationState?.fallbackTo) return locationState.fallbackTo;
    return location.pathname === '/import' ? '/' : '/settings';
  }, [location.pathname, locationState?.fallbackTo]);

  useRouteTaskDismiss({
    fallbackTo,
    onEscape: () => guardedDismissRef.current(),
  });

  const { confirmNavigation, proceedNavigation, confirmationDialog } = useUnsavedChangesGuard({
    when: isDirty,
  });

  const navigateToFallback = useCallback(() => {
    setIsDirty(false);
    setExitTo(fallbackTo);
  }, [fallbackTo]);

  useEffect(() => {
    if (!exitTo) return;

    navigate(exitTo, { replace: true });
  }, [exitTo, navigate]);

  const handleDismiss = useCallback(() => {
    confirmNavigation(navigateToFallback);
  }, [confirmNavigation, navigateToFallback]);

  const handleComplete = useCallback(() => {
    proceedNavigation(navigateToFallback);
  }, [navigateToFallback, proceedNavigation]);

  useEffect(() => {
    guardedDismissRef.current = handleDismiss;
  }, [handleDismiss]);

  return (
    <TaskPage
      title={t.importDialog.title}
      description={t.importDialog.subtitle}
      onDismiss={handleDismiss}
      mainId="import-task-main"
      maxWidthClassName="max-w-3xl"
    >
      <div className="app-surface shadow-xs p-5 sm:p-6">
        <ImportTaskContent
          initialText={locationState?.initialText}
          onCancel={handleDismiss}
          onComplete={handleComplete}
          onDirtyChange={setIsDirty}
        />
      </div>
      {confirmationDialog}
    </TaskPage>
  );
};
