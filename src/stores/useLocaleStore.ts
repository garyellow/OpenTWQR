import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage } from '../utils/safeStorage';
import zhTW from '../locales/zh-TW';
import enUS from '../locales/en-US';
import type { Translations } from '../locales/zh-TW';

export type Locale = 'zh-TW' | 'en-US';

const LOCALE_MAP: Record<Locale, Translations> = {
  'zh-TW': zhTW,
  'en-US': enUS,
};

/**
 * Detect the best locale from the browser's language preferences.
 * Returns 'en-US' for any English variant, 'zh-TW' for any Chinese variant,
 * and 'zh-TW' as the ultimate fallback.
 */
const detectLocale = (): Locale => {
  if (typeof navigator === 'undefined') return 'zh-TW';

  const langs = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter((lang): lang is string => typeof lang === 'string' && lang.length > 0);

  for (const lang of langs) {
    const l = lang.toLowerCase();
    if (l.startsWith('en')) return 'en-US';
    if (l.startsWith('zh')) return 'zh-TW';
  }
  return 'zh-TW';
};

interface LocaleState {
  /** `null` means "follow system". A string means the user manually chose. */
  userLocale: Locale | null;
  /** Resolved locale used for rendering. */
  locale: Locale;
  /** The translation object for the current locale. */
  t: Translations;
  /** Set a manual locale override; pass `null` to return to system. */
  setLocale: (locale: Locale | null) => void;
  /** Toggle between zh-TW and en-US. */
  toggle: () => void;
}

const resolveLocale = (userLocale: Locale | null): Locale =>
  userLocale ?? detectLocale();

const applyDocumentLocale = (locale: Locale) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => {
      const initial = resolveLocale(null);
      return {
        userLocale: null,
        locale: initial,
        t: LOCALE_MAP[initial],
        setLocale: (locale) => {
          const resolved = resolveLocale(locale);
          set({ userLocale: locale, locale: resolved, t: LOCALE_MAP[resolved] });
          applyDocumentLocale(resolved);
        },
        toggle: () => {
          const current = get().locale;
          const next: Locale = current === 'zh-TW' ? 'en-US' : 'zh-TW';
          set({ userLocale: next, locale: next, t: LOCALE_MAP[next] });
          applyDocumentLocale(next);
        },
      };
    },
    {
      name: 'opentwqr-locale',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        userLocale: state.userLocale,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveLocale(state.userLocale);
          state.locale = resolved;
          state.t = LOCALE_MAP[resolved];
          applyDocumentLocale(resolved);
        }
      },
    },
  ),
);
