import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskPage } from '../components/layout/TaskPage';
import { ExportTaskContent } from '../components/settings/ExportTaskContent';
import { useRouteTaskDismiss } from '../hooks/useRouteTaskDismiss';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useLocaleStore } from '../stores/useLocaleStore';

export const ExportTaskPage = () => {
  const navigate = useNavigate();
  const t = useLocaleStore((s) => s.t);
  const [isDirty, setIsDirty] = useState(false);
  const [exitTo, setExitTo] = useState<string | null>(null);
  const guardedDismissRef = useRef<() => void>(() => undefined);

  useRouteTaskDismiss({
    fallbackTo: '/settings',
    onEscape: () => guardedDismissRef.current(),
  });

  const { confirmNavigation, proceedNavigation, confirmationDialog } = useUnsavedChangesGuard({
    when: isDirty,
  });

  const navigateToSettings = useCallback(() => {
    setIsDirty(false);
    setExitTo('/settings');
  }, []);

  useEffect(() => {
    if (!exitTo) return;

    navigate(exitTo, { replace: true });
  }, [exitTo, navigate]);

  const handleDismiss = useCallback(() => {
    confirmNavigation(navigateToSettings);
  }, [confirmNavigation, navigateToSettings]);

  const handleComplete = useCallback(() => {
    proceedNavigation(navigateToSettings);
  }, [navigateToSettings, proceedNavigation]);

  useEffect(() => {
    guardedDismissRef.current = handleDismiss;
  }, [handleDismiss]);

  return (
    <TaskPage
      title={t.exportDialog.title}
      description={t.exportDialog.subtitle}
      onDismiss={handleDismiss}
      mainId="export-task-main"
      maxWidthClassName="max-w-3xl"
    >
      <div className="app-surface shadow-xs p-5 sm:p-6">
        <ExportTaskContent
          onCancel={handleDismiss}
          onComplete={handleComplete}
          onDirtyChange={setIsDirty}
        />
      </div>
      {confirmationDialog}
    </TaskPage>
  );
};
