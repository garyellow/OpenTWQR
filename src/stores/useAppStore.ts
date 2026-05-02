import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BankAccount } from '../types';
import { idbStorage } from './idbStorage';
import { normalizeAccountNumber } from '../utils/twqr';

interface AppState {
  accounts: BankAccount[];
  selectedAccountId: string | null;
  /** Whether the store has been rehydrated from IndexedDB. */
  isHydrated: boolean;
  /** Transient receive-page state (not persisted). */
  receiveAmount: string;
  receiveNote: string;
  addAccount: (account: BankAccount) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, account: Partial<BankAccount>) => void;
  selectAccount: (id: string | null) => void;
  setReceiveAmount: (amount: string) => void;
  setReceiveNote: (note: string) => void;
  isDuplicate: (bankCode: string, accountNumber: string, excludeId?: string) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      accounts: [],
      selectedAccountId: null,
      isHydrated: false,
      receiveAmount: '',
      receiveNote: '',
      addAccount: (account) =>
        set((state) => {
          const isFirst = state.accounts.length === 0;

          // Request persistent storage on first account add (fire-and-forget).
          // Chrome auto-grants for installed PWAs; Safari/Firefox may prompt.
          if (isFirst && navigator.storage?.persist) {
            navigator.storage.persist().catch(() => { /* noop */ });
          }

          return {
            accounts: [...state.accounts, account],
            selectedAccountId: isFirst ? account.id : state.selectedAccountId,
          };
        }),
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
      setReceiveAmount: (amount) => set({ receiveAmount: amount }),
      setReceiveNote: (note) => set({ receiveNote: note }),
      isDuplicate: (bankCode, accountNumber, excludeId) => {
        const num = normalizeAccountNumber(accountNumber);
        return get().accounts.some(
          (a) => a.bankCode === bankCode && normalizeAccountNumber(a.accountNumber) === num && a.id !== excludeId,
        );
      },
    }),
    {
      name: 'opentwqr-storage',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        selectedAccountId: state.selectedAccountId,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ isHydrated: true });
      },
    },
  ),
);
