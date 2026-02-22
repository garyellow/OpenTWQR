import { useState } from 'react';
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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this account?')) {
      removeAccount(id);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-safe font-sans flex flex-col">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors active:scale-95">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">My Accounts</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all active:scale-95 border border-emerald-500/20"
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
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
              className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
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
                onDelete={(e) => handleDelete(e, account.id)}
                onEdit={(e) => {
                  e.stopPropagation();
                  setEditingId(account.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-10 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-8">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden opacity-50" />
              <h2 className="text-2xl font-bold mb-8 text-center">
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
    </div>
  );
};
