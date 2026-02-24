import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BankAccount } from '../types';
import { idbStorage } from './idbStorage';

interface AppState {
  accounts: BankAccount[];
  selectedAccountId: string | null;
  addAccount: (account: BankAccount) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, account: Partial<BankAccount>) => void;
  selectAccount: (id: string | null) => void;
  isDuplicate: (bankCode: string, accountNumber: string, excludeId?: string) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      selectedAccountId: null,
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
          selectedAccountId: state.accounts.length === 0 ? account.id : state.selectedAccountId,
        })),
      removeAccount: (id) =>
        set((state) => {
          const nextAccounts = state.accounts.filter((a) => a.id !== id);
          const nextSelectedId =
            state.selectedAccountId === id
              ? (nextAccounts[0]?.id ?? null)
              : state.selectedAccountId;

          return {
            accounts: nextAccounts,
            selectedAccountId: nextSelectedId,
          };
        }),
      updateAccount: (id, updatedAccount) =>
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updatedAccount } : a)),
        })),
      selectAccount: (id) => set({ selectedAccountId: id }),
      isDuplicate: (bankCode, accountNumber, excludeId) => {
        return get().accounts.some(
          (a) => a.bankCode === bankCode && a.accountNumber === accountNumber && a.id !== excludeId,
        );
      },
    }),
    {
      name: 'opentwqr-storage',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
