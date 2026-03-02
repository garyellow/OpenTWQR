import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

export interface BankUrlConfig {
  bankCode: string;
  /** URL template with placeholders like {account}, {amount}, etc. */
  urlTemplate: string;
}

interface UrlSchemeState {
  configs: BankUrlConfig[];
  addConfig: (config: BankUrlConfig) => void;
  removeConfig: (bankCode: string) => void;
  getConfig: (bankCode: string) => BankUrlConfig | undefined;
}

export const useUrlSchemeStore = create<UrlSchemeState>()(
  persist(
    (set, get) => ({
      configs: [],
      addConfig: (config) =>
        set((state) => ({
          // Upsert: replace existing config for same bank, or append
          configs: [
            ...state.configs.filter((c) => c.bankCode !== config.bankCode),
            config,
          ],
        })),
      removeConfig: (bankCode) =>
        set((state) => ({
          configs: state.configs.filter((c) => c.bankCode !== bankCode),
        })),
      getConfig: (bankCode) => get().configs.find((c) => c.bankCode === bankCode),
    }),
    {
      name: 'opentwqr-url-schemes',
      version: 2,
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
