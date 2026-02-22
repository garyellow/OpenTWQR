import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AccountCard } from '../components/AccountCard';
import { AccountForm } from '../components/AccountForm';
import { Plus, ChevronLeft, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { BankAccount } from '../types';

export const AccountsPage = () => {
  const { accounts, addAccount, removeAccount, updateAccount, selectAccount, selectedAccountId } = useAppStore();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = (data: Omit<BankAccount, 'id'>) => {
    const isFirstAccount = accounts.length === 0;
    addAccount({
      id: crypto.randomUUID(),
      ...data,
    });
    setIsAdding(false);
    if (isFirstAccount) {
      navigate('/');
    }
  };

  const handleUpdate = (data: Omit<BankAccount, 'id'>) => {
    if (editingId) {
      updateAccount(editingId, data);
      setEditingId(null);
    }
  };

  useEffect(() => {
    if (!deletingId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDeletingId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deletingId]);

  const handleDeleteConfirm = () => {
    if (!deletingId) return;
    removeAccount(deletingId);
    setDeletingId(null);
  };

  const deletingAccount = deletingId ? accounts.find((account) => account.id === deletingId) : null;

  return (
    <div className="min-h-screen bg-black text-white pb-safe font-sans flex flex-col px-safe">
      <a href="#accounts-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-900 focus:text-white">
        Skip to main content
      </a>
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to receive page" className="p-2 -ml-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500/50">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">My Accounts</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          aria-label="Add account"
          className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-[background-color,transform] active:scale-95 border border-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          <Plus size={22} />
        </button>
      </div>

      <main id="accounts-main" className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-8 rounded-full bg-zinc-900/50 text-zinc-600 border border-zinc-800 shadow-inner">
              <Wallet size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">No accounts yet</h3>
              <p className="text-zinc-500 max-w-xs mx-auto">Add a bank account to start receiving payments via TWQR.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-[background-color,transform] shadow-lg shadow-emerald-900/20 active:scale-95"
            >
              Add First Account
            </button>
          </div>
        ) : (
          <div className="grid gap-4 pb-24 animate-in fade-in">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                isSelected={selectedAccountId === account.id}
                onSelect={() => selectAccount(account.id)}
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

      {(isAdding || editingId) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-form-title"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-10 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-8">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden opacity-50" />
              <h2 id="account-form-title" className="text-2xl font-bold mb-8 text-center">
                {editingId ? 'Edit Account' : 'Add New Account'}
              </h2>
              <AccountForm
                initialData={editingId ? accounts.find(a => a.id === editingId) : undefined}
                onSubmit={editingId ? handleUpdate : handleAdd}
                onCancel={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
              />
            </div>
          </div>
          <div
             className="absolute inset-0 -z-10"
             onClick={() => {
               setIsAdding(false);
               setEditingId(null);
             }}
          />
        </div>
      )}

      {deletingAccount && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-description"
            className="w-full max-w-md bg-zinc-900 rounded-t-[2rem] sm:rounded-[2rem] border border-zinc-800 p-6 sm:p-7 shadow-2xl animate-in slide-in-from-bottom-10 duration-300"
          >
            <h2 id="delete-account-title" className="text-xl font-bold text-white">Delete Account</h2>
            <p id="delete-account-description" className="mt-3 text-zinc-400 leading-relaxed">
              Remove this account from device storage? This action cannot be undone.
            </p>
            <div className="mt-5 text-zinc-300 font-mono text-sm bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 break-all">
              {deletingAccount.bankCode} · {deletingAccount.accountNumber}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 rounded-xl bg-red-500/90 text-white hover:bg-red-500 transition-colors border border-red-400/40"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setDeletingId(null)} />
        </div>
      )}
    </div>
  );
};
