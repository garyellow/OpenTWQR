import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * Zustand-compatible IndexedDB storage adapter via idb-keyval.
 * Replaces localStorage for non-blocking, larger-capacity persistence.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => { await set(name, value); },
  removeItem: async (name) => { await del(name); },
};
