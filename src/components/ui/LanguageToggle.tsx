import { useLocaleStore } from '../../stores/useLocaleStore';

/**
 * A compact toggle button that shows "文" (Chinese) or "A" (English)
 * to indicate the current locale. Click to switch.
 * Styled identically to ThemeToggle.
 */
export const LanguageToggle = () => {
  const { locale, toggle, t } = useLocaleStore();
  const label = locale === 'zh-TW' ? t.language.zh : t.language.en;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.language.toggleLabel}
      title={t.language.toggleLabel}
      className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
    >
      <span
        key={locale}
        aria-hidden="true"
        className="text-[15px] font-bold leading-none select-none animate-in fade-in zoom-in-75 duration-150 motion-reduce:animate-none"
      >
        {locale === 'zh-TW' ? '文' : 'A'}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
};
