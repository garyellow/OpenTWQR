import { Link2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useLocaleStore } from '../../stores/useLocaleStore';

/**
 * Single-row settings entry that navigates to the full PaymentLinksPage.
 * Shows the section title, description, and a badge with the configured-bank count.
 */
export const UrlSchemeSection = () => {
  const t = useLocaleStore((s) => s.t);
  const configCount = useUrlSchemeStore((s) => s.configs.length);

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        {t.urlScheme.sectionTitle}
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
        <Link
          to="/settings/payment-links"
          viewTransition
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 12%, transparent)' }}
          >
            <Link2
              size={18}
              style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              {t.urlScheme.entryRow}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.urlScheme.entryDesc}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {configCount > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 12%, transparent)',
                  color: 'light-dark(var(--accent), var(--accent-dark))',
                }}
              >
                {t.urlScheme.configCount(configCount)}
              </span>
            )}
            <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </div>
  );
};
