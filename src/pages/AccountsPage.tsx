import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AccountCard } from '../components/AccountCard';
import { AccountForm } from '../components/AccountForm';
import { Plus, ChevronLeft, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { BankAccount } from '../types';

export const AccountsPage = () => {
  const { accounts, addAccount, removeAccount, updateAccount, selectAccount, selectedAccountId } =
    useAppStore();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = (data: Omit<BankAccount, 'id'>) => {
    addAccount({ id: crypto.randomUUID(), ...data });
    setIsAdding(false);
    navigate('/');
  };

  const handleUpdate = (data: Omit<BankAccount, 'id'>) => {
    if (editingId) {
      updateAccount(editingId, data);
      setEditingId(null);
    }
  };

  /** Selecting an account always navigates back to the receive page. */
  const handleSelect = (id: string) => {
    selectAccount(id);
    navigate('/');
  };

  const handleDeleteConfirm = () => {
    if (!deletingId) return;
    removeAccount(deletingId);
    setDeletingId(null);
  };

  /* Escape key closes whichever modal is open; also locks body scroll. */
  useEffect(() => {
    if (!isAdding && !editingId && !deletingId) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (deletingId) setDeletingId(null);
      else {
        setIsAdding(false);
        setEditingId(null);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isAdding, editingId, deletingId]);

  const deletingAccount = deletingId ? accounts.find((a) => a.id === deletingId) : null;

  return (
    <div className="min-h-screen flex flex-col px-safe pb-safe">
      <a
        href="#accounts-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        Skip to main content
      </a>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back"
            className="p-2 -ml-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Accounts</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          aria-label="Add account"
          className="p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
        >
          <Plus size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <main id="accounts-main" className="flex-1 p-4 max-w-md mx-auto w-full">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
            <div className="p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800">
              <Wallet size={40} aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">No Accounts Yet</h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-xs">
                Add a bank account to start receiving payments via TWQR.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-400 active:scale-[0.98] transition-[background-color,transform]"
            >
              Add First Account
            </button>
          </div>
        ) : (
          <div className="grid gap-3 pb-20">
            {accounts.map((account) => (
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
        )}
      </main>

      {/* ---------- Add / Edit Form Modal ---------- */}
      {(isAdding || editingId) && (
        <div
          className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            setIsAdding(false);
            setEditingId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-form-title"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-xl border-t border-zinc-200 dark:border-zinc-800 sm:border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5 sm:hidden" />
              <h2
                id="account-form-title"
                className="text-xl font-bold text-zinc-900 dark:text-white mb-6 text-center"
              >
                {editingId ? 'Edit Account' : 'Add Account'}
              </h2>
              <AccountForm
                initialData={editingId ? accounts.find((a) => a.id === editingId) : undefined}
                onSubmit={editingId ? handleUpdate : handleAdd}
                onCancel={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------- Delete Confirmation ---------- */}
      {deletingAccount && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl border-t border-zinc-200 dark:border-zinc-800 sm:border p-6 shadow-xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-title" className="text-lg font-bold text-zinc-900 dark:text-white">
              Delete Account
            </h2>
            <p id="delete-desc" className="mt-2 text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              This account will be permanently removed from this device.
            </p>
            <div className="mt-3 font-mono text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 break-all border border-zinc-200 dark:border-zinc-700">
              {deletingAccount.bankCode} · {deletingAccount.accountNumber}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
