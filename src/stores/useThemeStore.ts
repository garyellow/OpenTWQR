import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const getResolvedTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
};

export const applyTheme = (mode: ThemeMode) => {
  const resolved = getResolvedTheme(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');

  const color = resolved === 'dark' ? '#09090b' : '#ffffff';
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', color);
  });
};

/**
 * Safe localStorage adapter for Zustand persist.
 *
 * Wraps every read/write in try/catch so the store never throws in
 * private-browsing mode or when storage is full. The theme store
 * intentionally uses localStorage (not IndexedDB) so that the inline
 * FOUC-prevention script in index.html can read the persisted mode
 * synchronously before any JS bundle executes.
 */
const safeLocalStorage: Storage = {
  get length() { try { return localStorage.length; } catch { return 0; } },
  key(index) { try { return localStorage.key(index); } catch { return null; } },
  clear() { try { localStorage.clear(); } catch { /* noop */ } },
  getItem: (key) => safeGetItem(key),
  setItem: (key, value) => { safeSetItem(key, value); },
  removeItem: (key) => { safeRemoveItem(key); },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system' as ThemeMode,
      setMode: (mode) => {
        applyTheme(mode);
        set({ mode });
      },
    }),
    {
      name: 'opentwqr-theme',
      storage: createJSONStorage(() => safeLocalStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode);
      },
    },
  ),
);
