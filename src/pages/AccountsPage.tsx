import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { AccountCard } from '../components/accounts/AccountCard';
import { AccountForm } from '../components/accounts/AccountForm';
import { AnimatedModal } from '../components/ui/AnimatedModal';
import { Plus, ChevronLeft, Wallet, Trash2, Download } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ImportDialog } from '../components/settings/ImportDialog';
import type { BankAccount } from '../types';
import { generateId } from '../utils/generateId';

export const AccountsPage = () => {
  const { accounts, addAccount, removeAccount, updateAccount, selectAccount, selectedAccountId } =
    useAppStore();
  const t = useLocaleStore((s) => s.t);
  const navigate = useNavigate();
  const location = useLocation();

  /* Auto-open add form when navigated with autoAdd state (e.g. from empty ReceivePage).
     Derive initial value from location.state so no effect / setState is needed. */
  const [isAdding, setIsAdding] = useState(() => {
    const state = location.state as { autoAdd?: boolean } | null;
    if (state?.autoAdd) {
      // Clear only the user state; preserve React Router's internal keys (key, idx)
      const hs = window.history.state;
      window.history.replaceState(hs ? { ...hs, usr: undefined } : {}, '');
      return true;
    }
    return false;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const closeFormModal = useCallback(() => {
    setIsAdding(false);
    setEditingId(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeletingId(null);
  }, []);

  const handleAdd = useCallback((data: Omit<BankAccount, 'id'>) => {
    addAccount({ id: generateId(), ...data });
    setIsAdding(false);
    navigate('/', { viewTransition: true });
  }, [addAccount, navigate]);

  /** Selecting an account always navigates back to the receive page. */
  const handleSelect = useCallback((id: string) => {
    selectAccount(id);
    navigate('/', { viewTransition: true });
  }, [selectAccount, navigate]);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.bankCode.localeCompare(b.bankCode)),
    [accounts],
  );

  const deletingAccount = deletingId ? accounts.find((a) => a.id === deletingId) : null;

  return (
    <div className="min-h-svh flex flex-col px-safe pb-safe bg-zinc-50 dark:bg-zinc-950">
      <a
        href="#accounts-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        {t.common.skipToMain}
      </a>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              viewTransition
              aria-label={t.common.back}
              className="p-2.5 min-w-11 min-h-11 -ml-2 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t.accounts.title}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              aria-label={t.accounts.importLabel}
              className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <Download size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              aria-label={t.accounts.addLabel}
              className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main id="accounts-main" className="flex-1 p-5 max-w-md lg:max-w-lg mx-auto w-full">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center shadow-xs">
              <Wallet size={48} aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">{t.accounts.emptyTitle}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-pretty">
                {t.accounts.emptyHint}
              </p>
            </div>
            <div className="w-full max-w-72 space-y-3 mt-4">
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full py-4 btn-accent font-semibold rounded-xl active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {t.receive.addBankAccount}
              </button>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                <Download size={20} aria-hidden="true" />
                {t.receive.importAccounts}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-24">
            <div className="grid gap-4">
              {sortedAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isSelected={selectedAccountId === account.id}
                  onSelect={() => handleSelect(account.id)}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setDeletingId(account.id);
                  }}
                  onEdit={(e) => {
                    e.stopPropagation();
                    setEditingId(account.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ---------- Add / Edit Form Modal ---------- */}
      {(isAdding || editingId) && (
        <AnimatedModal
          onClose={closeFormModal}
          overlayClass="z-50"
          cardClass="max-w-lg max-h-[90svh] overflow-y-auto"
          ariaLabelledby="account-form-title"
        >
          {(requestClose) => (
            <div className="p-6 sm:p-8">
              <h2
                id="account-form-title"
                className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8 text-center"
              >
                {editingId ? t.accounts.editTitle : t.accounts.addTitle}
              </h2>
              <AccountForm
                initialData={editingId ? accounts.find((a) => a.id === editingId) : undefined}
                editingId={editingId ?? undefined}
                onSubmit={
                  editingId
                    ? (data) => {
                        updateAccount(editingId, data);
                        requestClose();
                      }
                    : handleAdd
                }
                onCancel={requestClose}
              />
            </div>
          )}
        </AnimatedModal>
      )}

      {/* ---------- Delete Confirmation ---------- */}
      {deletingAccount && (
        <AnimatedModal
          onClose={closeDeleteModal}
          overlayClass="z-60"
          cardClass="max-w-sm p-6"
          ariaLabelledby="delete-title"
          ariaDescribedby="delete-desc"
        >
          {(requestClose) => (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-5 mx-auto">
                <Trash2 size={24} className="text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
              <h2 id="delete-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-center">
                {t.accounts.deleteTitle}
              </h2>
              <p id="delete-desc" className="mt-3 text-zinc-500 dark:text-zinc-400 text-center leading-relaxed text-pretty">
                {t.accounts.deleteDesc}
              </p>
              <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-4 py-3 break-all border border-zinc-200/50 dark:border-zinc-700/50 text-center space-y-1">
                {deletingAccount.label && (
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">{deletingAccount.label}</p>
                )}
                <p className="font-mono">({deletingAccount.bankCode}) {deletingAccount.accountNumber}</p>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deletingId) removeAccount(deletingId);
                    requestClose();
                  }}
                  className="flex-1 py-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-600 dark:focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.delete}
                </button>
              </div>
            </>
          )}
        </AnimatedModal>
      )}

      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
};
