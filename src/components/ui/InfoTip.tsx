import { useState, type ReactNode } from 'react';
import { CircleHelp, TriangleAlert, CircleAlert, X } from 'lucide-react';
import { AnimatedModal } from './AnimatedModal';
import { useLocaleStore } from '../../stores/useLocaleStore';

type InfoTipVariant = 'info' | 'caution' | 'danger';

interface InfoTipProps {
  /** Modal title */
  title: string;
  /** Simple string body — used when children is not provided */
  content?: string;
  /** Rich body content — takes precedence over content */
  children?: ReactNode;
  /** 'info' = ? circle (accent), 'caution' = ! triangle (amber), 'danger' = ! circle (red) */
  variant?: InfoTipVariant;
  /** Trigger icon size (default: 13) */
  size?: number;
  className?: string;
}

const ICONS = {
  info: CircleHelp,
  caution: TriangleAlert,
  danger: CircleAlert,
} as const;

const BTN_COLORS: Record<InfoTipVariant, string> = {
  info: 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300',
  caution: 'text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300',
  danger: 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300',
};

const ICON_BG: Partial<Record<InfoTipVariant, string>> = {
  caution: 'bg-amber-50 dark:bg-amber-500/10',
  danger: 'bg-red-50 dark:bg-red-500/10',
};

const ICON_COLOR: Partial<Record<InfoTipVariant, string>> = {
  caution: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

/**
 * Inline help icon that opens an info modal on click.
 *
 * Variants:
 * - `info`    → CircleHelp (?) in accent color — for optional explanations
 * - `caution` → TriangleAlert (!) in amber — for data loss / storage warnings
 * - `danger`  → CircleAlert (!) in red — for destructive action warnings
 *
 * Usage:
 * ```tsx
 * // Simple string content
 * <InfoTip title="Feature name" content="Full explanation..." />
 *
 * // Rich/conditional children
 * <InfoTip variant="caution" title="Storage Warning">
 *   <p>{warning}</p>
 * </InfoTip>
 * ```
 */
export const InfoTip = ({
  title,
  content,
  children,
  variant = 'info',
  size = 13,
  className,
}: InfoTipProps) => {
  const [open, setOpen] = useState(false);
  const t = useLocaleStore((s) => s.t);
  const Icon = ICONS[variant];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        className={`${BTN_COLORS[variant]} transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-500 rounded ${className ?? ''}`}
      >
        <Icon size={size} aria-hidden="true" />
      </button>

      {open && (
        <AnimatedModal
          onClose={() => setOpen(false)}
          overlayClass="z-60"
          backdropClass="bg-black/60 dark:bg-black/75 backdrop-blur-sm"
          cardClass="max-w-sm p-6"
          ariaLabelledby="infotip-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  {variant === 'info' ? (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 12%, transparent)' }}
                    >
                      <Icon size={18} style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }} aria-hidden="true" />
                    </div>
                  ) : (
                    <div className={`w-9 h-9 rounded-xl ${ICON_BG[variant]} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={ICON_COLOR[variant]} aria-hidden="true" />
                    </div>
                  )}
                  <h2
                    id="infotip-title"
                    className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug"
                  >
                    {title}
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

              {content && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {content}
                </p>
              )}
              {children}

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
    </>
  );
};
