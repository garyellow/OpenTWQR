import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Bank } from '../types';
import { BANKS, BANKS_SOURCE } from '../data/banks';
import { idbStorage } from './idbStorage';

interface RemoteBankPayload {
  source?: {
    provider?: string;
    url?: string;
    business?: string;
    generatedAt?: string;
    count?: number;
  };
  banks?: Array<{ code?: string; name?: string }>;
}

interface BanksState {
  banks: Bank[];
  source: {
    provider: string;
    url: string;
    business?: string;
    generatedAt?: string;
    count: number;
  };
  lastSyncedAt: string | null;
  isRefreshing: boolean;
  refreshBanks: () => Promise<void>;
}

const BANKS_JSON_PATH = `${import.meta.env.BASE_URL}data/banks.latest.json`;

const FALLBACK_BANKS = [...BANKS].sort((left, right) => Number(left.code) - Number(right.code));

const FALLBACK_SOURCE = {
  provider: BANKS_SOURCE.provider,
  url: BANKS_SOURCE.url,
  business: 'business' in BANKS_SOURCE ? BANKS_SOURCE.business : undefined,
  generatedAt: BANKS_SOURCE.generatedAt,
  count: FALLBACK_BANKS.length,
};

const normalizeRemoteBanks = (payload: RemoteBankPayload): Bank[] => {
  const items = Array.isArray(payload.banks) ? payload.banks : [];
  const unique = new Map<string, string>();

  for (const item of items) {
    const rawCode = item?.code?.trim();
    const rawName = item?.name?.trim();

    if (!rawCode || !rawName || !/^\d{3}$/.test(rawCode)) {
      continue;
    }

    if (!unique.has(rawCode)) {
      unique.set(rawCode, rawName);
    }
  }

  return [...unique.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => Number(left.code) - Number(right.code));
};

const toTimestamp = (value?: string): number => {
  if (!value) return 0;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const useBanksStore = create<BanksState>()(
  persist(
    (set, get) => ({
      banks: FALLBACK_BANKS,
      source: FALLBACK_SOURCE,
      lastSyncedAt: null,
      isRefreshing: false,
      refreshBanks: async () => {
        if (get().isRefreshing) return;
        if (!navigator.onLine) return;

        set({ isRefreshing: true });

        try {
          const response = await fetch(`${BANKS_JSON_PATH}?t=${Date.now()}`, {
            cache: 'no-store',
          });

          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
          }

          const payload = (await response.json()) as RemoteBankPayload;
          const banks = normalizeRemoteBanks(payload);

          if (banks.length === 0) {
            throw new Error('No valid bank entries in remote payload');
          }

          set((state) => {
            const currentGeneratedAt = toTimestamp(state.source.generatedAt);
            const incomingGeneratedAt = toTimestamp(payload.source?.generatedAt);
            const isIncomingNewer = incomingGeneratedAt >= currentGeneratedAt;

            if (!isIncomingNewer && state.banks.length > 0) {
              return {
                lastSyncedAt: new Date().toISOString(),
              };
            }

            return {
              banks,
              source: {
                provider: payload.source?.provider || FALLBACK_SOURCE.provider,
                url: payload.source?.url || FALLBACK_SOURCE.url,
                business: payload.source?.business || FALLBACK_SOURCE.business,
                generatedAt: payload.source?.generatedAt,
                count: banks.length,
              },
              lastSyncedAt: new Date().toISOString(),
            };
          });
        } catch {
          set((state) => ({
            banks: state.banks.length > 0 ? state.banks : FALLBACK_BANKS,
          }));
        } finally {
          set({ isRefreshing: false });
        }
      },
    }),
    {
      name: 'opentwqr-bank-catalog',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        banks: state.banks,
        source: state.source,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
