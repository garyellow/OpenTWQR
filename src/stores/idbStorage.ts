import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

/**
 * Zustand-compatible IndexedDB storage adapter via idb-keyval.
 * Falls back to safe localStorage access when IndexedDB is unavailable,
 * blocked, or temporarily failing.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await get<string>(name)) ?? null;
    } catch {
      return safeGetItem(name);
    }
  },
  setItem: async (name, value) => {
    try {
      await set(name, value);
    } catch {
      safeSetItem(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await del(name);
    } catch {
      safeRemoveItem(name);
    }
  },
};
