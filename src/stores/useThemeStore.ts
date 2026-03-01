import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

type ThemeMode = 'system' | 'light' | 'dark';

/** Default OKLCH hue for the accent color (teal, matching TWQR brand). */
const DEFAULT_HUE = 200;

/** Predefined accent hue presets for the color picker. */
export const ACCENT_PRESETS = [
  { hue: 200, label: '水波藍', color: 'oklch(55% 0.15 200)' },
  { hue: 264, label: '薰衣紫', color: 'oklch(55% 0.15 264)' },
  { hue: 330, label: '玫瑰粉', color: 'oklch(55% 0.15 330)' },
  { hue: 25,  label: '琥珀橘', color: 'oklch(55% 0.15 25)' },
  { hue: 145, label: '翡翠綠', color: 'oklch(55% 0.15 145)' },
  { hue: 60,  label: '暖陽黃', color: 'oklch(55% 0.15 60)' },
] as const;

interface ThemeState {
  mode: ThemeMode;
  /** User-chosen accent hue (0–360, OKLCH hue angle). */
  accentHue: number;
  setMode: (mode: ThemeMode) => void;
  /** @param animate - Pass `true` on intentional user actions to cross-fade accent colours. */
  setAccentHue: (hue: number, animate?: boolean) => void;
}

const getResolvedTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
};

/**
 * Apply accent hue as CSS custom properties on :root.
 *
 * Pass `animate: true` when the change is triggered by an intentional user
 * action (preset click) to smoothly cross-fade all accent colours via the
 * `html.accent-animating` CSS class defined in index.css.
 */
export const applyAccentHue = (hue: number, animate = false) => {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('accent-animating');
    setTimeout(() => root.classList.remove('accent-animating'), 500);
  }
  root.style.setProperty('--accent-hue', String(hue));
  // Light mode accent colors
  root.style.setProperty('--accent', `oklch(55% 0.15 ${hue})`);
  root.style.setProperty('--accent-hover', `oklch(48% 0.15 ${hue})`);
  root.style.setProperty('--accent-light', `oklch(95% 0.04 ${hue})`);
  root.style.setProperty('--accent-subtle', `oklch(90% 0.06 ${hue})`);
  // Dark mode accent colors
  root.style.setProperty('--accent-dark', `oklch(75% 0.12 ${hue})`);
  root.style.setProperty('--accent-dark-hover', `oklch(80% 0.12 ${hue})`);
  root.style.setProperty('--accent-dark-light', `oklch(25% 0.04 ${hue})`);
  root.style.setProperty('--accent-dark-subtle', `oklch(30% 0.06 ${hue})`);
};

export const applyTheme = (mode: ThemeMode) => {
  const resolved = getResolvedTheme(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');

  const color = resolved === 'dark' ? '#0c0c0e' : '#ffffff';
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
      accentHue: DEFAULT_HUE,
      setMode: (mode) => {
        applyTheme(mode);
        set({ mode });
      },
      setAccentHue: (hue, animate = false) => {
        applyAccentHue(hue, animate);
        set({ accentHue: hue });
      },
    }),
    {
      name: 'opentwqr-theme',
      storage: createJSONStorage(() => safeLocalStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.mode);
          applyAccentHue(state.accentHue ?? DEFAULT_HUE);
        }
      },
    },
  ),
);
