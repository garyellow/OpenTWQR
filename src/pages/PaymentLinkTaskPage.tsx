import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { TaskPage } from '../components/layout/TaskPage';
import { UrlSchemeForm } from '../components/settings/UrlSchemeForm';
import { useRouteTaskDismiss } from '../hooks/useRouteTaskDismiss';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useLocaleStore } from '../stores/useLocaleStore';
import { useUrlSchemeStore } from '../stores/useUrlSchemeStore';

export const PaymentLinkTaskPage = () => {
  const { bankCode } = useParams<{ bankCode: string }>();
  const navigate = useNavigate();
  const t = useLocaleStore((s) => s.t);
  const configs = useUrlSchemeStore((s) => s.configs);
  const [isDirty, setIsDirty] = useState(false);
  const [exitTo, setExitTo] = useState<string | null>(null);
  const guardedDismissRef = useRef<() => void>(() => undefined);
  useRouteTaskDismiss({
    fallbackTo: '/settings/payment-links',
    onEscape: () => guardedDismissRef.current(),
  });
  const { confirmNavigation, proceedNavigation, confirmationDialog } = useUnsavedChangesGuard({ when: isDirty });

  const isEditing = Boolean(bankCode);
  const editingConfig = bankCode ? configs.find((config) => config.bankCode === bankCode) : undefined;
  const handleDismiss = useCallback(() => {
    confirmNavigation(() => {
      setIsDirty(false);
      setExitTo('/settings/payment-links');
    });
  }, [confirmNavigation]);
  const handleComplete = useCallback(() => {
    proceedNavigation(() => {
      setIsDirty(false);
      setExitTo('/settings/payment-links');
    });
  }, [proceedNavigation]);

  useEffect(() => {
    if (!exitTo) return;

    navigate(exitTo, { replace: true });
  }, [exitTo, navigate]);

  useEffect(() => {
    guardedDismissRef.current = handleDismiss;
  }, [handleDismiss]);

  if (isEditing && !editingConfig) {
    return <Navigate to="/settings/payment-links" replace />;
  }

  return (
    <TaskPage
      title={isEditing ? t.urlScheme.editTitle : t.urlScheme.addTitle}
      description={t.urlScheme.entryDesc}
      onDismiss={handleDismiss}
      mainId="payment-link-task-main"
      maxWidthClassName="max-w-3xl"
    >
      <div className="app-surface shadow-xs p-5 sm:p-6">
        <UrlSchemeForm bankCode={bankCode} onComplete={handleComplete} onDirtyChange={setIsDirty} />
      </div>
      {confirmationDialog}
    </TaskPage>
  );
};
