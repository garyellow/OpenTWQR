import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BankAccount } from '../types';

interface AppState {
  accounts: BankAccount[];
  selectedAccountId: string | null;
  addAccount: (account: BankAccount) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, account: Partial<BankAccount>) => void;
  selectAccount: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      accounts: [],
      selectedAccountId: null,
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
          selectedAccountId: state.accounts.length === 0 ? account.id : state.selectedAccountId,
        })),
      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
          selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
        })),
      updateAccount: (id, updatedAccount) =>
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updatedAccount } : a)),
        })),
      selectAccount: (id) => set({ selectedAccountId: id }),
    }),
    {
      name: 'opentwqr-storage',
    }
  )
);
