import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const getResolvedTheme = (mode: ThemeMode): 'light' | 'dark' => {
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
 * Theme store intentionally uses localStorage (not IndexedDB) so that the
 * inline FOUC-prevention script in index.html can read the persisted mode
 * synchronously before any JS bundle executes.
 */
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
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode);
      },
    },
  ),
);
