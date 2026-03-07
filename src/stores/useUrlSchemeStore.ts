import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

export interface BankUrlConfig {
  bankCode: string;
  /** URL template with placeholders like {account}, {amount}, etc. */
  urlTemplate: string;
  /** When true, only show this config for same-institution QR codes. */
  sameInstitutionOnly?: boolean;
  /** Optional URL to simply open the app (no account pre-fill) when cross-institution. */
  launchUrl?: string;
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
      version: 3,
      storage: createJSONStorage(() => idbStorage),
      migrate: (persisted) => {
        // v2 → v3: new optional fields (sameInstitutionOnly, launchUrl) default to undefined
        return persisted as UrlSchemeState;
      },
    },
  ),
);
