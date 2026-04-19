import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AccountForm } from '../components/accounts/AccountForm';
import { TaskPage } from '../components/layout/TaskPage';
import { useRouteTaskDismiss } from '../hooks/useRouteTaskDismiss';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useAppStore } from '../stores/useAppStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import type { BankAccount } from '../types';
import { generateId } from '../utils/generateId';

interface AccountTaskLocationState {
  prefill?: {
    bankCode: string;
    accountNumber: string;
  };
  fallbackTo?: string;
}

export const AccountTaskPage = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { accounts, addAccount, updateAccount } = useAppStore();
  const t = useLocaleStore((s) => s.t);
  const [isDirty, setIsDirty] = useState(false);
  const [exitTo, setExitTo] = useState<string | null>(null);
  const guardedDismissRef = useRef<() => void>(() => undefined);
  const { confirmNavigation, proceedNavigation, confirmationDialog } = useUnsavedChangesGuard({ when: isDirty });

  const isEditing = Boolean(accountId);
  const editingAccount = useMemo(
    () => (accountId ? accounts.find((account) => account.id === accountId) : undefined),
    [accountId, accounts],
  );

  const locationState = location.state as AccountTaskLocationState | null;
  const prefillData = locationState?.prefill;
  const fallbackTo = locationState?.fallbackTo ?? '/accounts';

  useRouteTaskDismiss({
    fallbackTo,
    onEscape: () => guardedDismissRef.current(),
  });

  const initialData = useMemo<Partial<BankAccount> | undefined>(() => {
    if (editingAccount) return editingAccount;
    if (prefillData) {
      return {
        bankCode: prefillData.bankCode,
        accountNumber: prefillData.accountNumber,
      };
    }
    return undefined;
  }, [editingAccount, prefillData]);

  const handleSubmit = useCallback(
    (data: Omit<BankAccount, 'id'>) => {
      if (accountId) {
        updateAccount(accountId, data);
      } else {
        addAccount({ id: generateId(), ...data });
      }

      proceedNavigation(() => {
        setIsDirty(false);
        setExitTo('/accounts');
      });
    },
    [accountId, addAccount, proceedNavigation, updateAccount],
  );
  const handleDismiss = useCallback(() => {
    confirmNavigation(() => {
      setIsDirty(false);
      setExitTo(fallbackTo);
    });
  }, [confirmNavigation, fallbackTo]);

  useEffect(() => {
    if (!exitTo) return;

    navigate(exitTo, { replace: true });
  }, [exitTo, navigate]);

  useEffect(() => {
    guardedDismissRef.current = handleDismiss;
  }, [handleDismiss]);

  if (isEditing && !editingAccount) {
    return <Navigate to="/accounts" replace />;
  }

  return (
    <TaskPage
      title={isEditing ? t.accounts.editTitle : t.accounts.addTitle}
      onDismiss={handleDismiss}
      mainId="account-task-main"
    >
      <div className="app-surface shadow-xs p-5 sm:p-6">
        <AccountForm
          initialData={initialData}
          editingId={accountId}
          onSubmit={handleSubmit}
          onCancel={handleDismiss}
          onDirtyChange={setIsDirty}
        />
      </div>
      {confirmationDialog}
    </TaskPage>
  );
};
