import { useState } from 'react';
import { Link2, ChevronRight, CircleHelp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedModal } from '../ui/AnimatedModal';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useLocaleStore } from '../../stores/useLocaleStore';

/**
 * Single-row settings entry that navigates to the full PaymentLinksPage.
 * Shows the section title (with an info tooltip button), and a badge with
 * the configured-bank count.
 */
export const UrlSchemeSection = () => {
  const [showInfo, setShowInfo] = useState(false);
  const t = useLocaleStore((s) => s.t);
  const configCount = useUrlSchemeStore((s) => s.configs.length);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t.urlScheme.sectionTitle}
        </h2>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label={t.urlScheme.infoTitle}
          className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-500 rounded"
        >
          <CircleHelp size={13} aria-hidden="true" />
        </button>
      </div>
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

      {showInfo && (
        <AnimatedModal
          onClose={() => setShowInfo(false)}
          overlayClass="z-50"
          cardClass="max-w-sm p-6"
          ariaLabelledby="urlscheme-info-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 12%, transparent)' }}
                  >
                    <CircleHelp size={18} style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }} aria-hidden="true" />
                  </div>
                  <h2 id="urlscheme-info-title" className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                    {t.urlScheme.infoTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label={t.common.close}
                  className="p-2.5 -mr-2 -mt-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t.urlScheme.infoDesc}
              </p>
              <button
                type="button"
                onClick={requestClose}
                className="w-full py-3.5 mt-5 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {t.common.understand}
              </button>
            </>
          )}
        </AnimatedModal>
      )}
    </div>
  );
};
