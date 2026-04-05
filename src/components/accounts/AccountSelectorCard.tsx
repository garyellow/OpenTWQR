import { ChevronDown } from 'lucide-react';
import { BankIcon } from './BankIcon';

interface AccountSelectorCardProps {
  title: string;
  subtitle?: string;
  caption?: string;
  bankCode: string;
  iconUrl?: string;
  bankUrl?: string;
  onClick?: () => void;
  buttonLabel?: string;
  className?: string;
  compact?: boolean;
  showDisclosure?: boolean;
}

/**
 * Shared account identity surface used across Receive, QR modal, and management flows.
 * Keeps the current account readable while allowing the caller to decide whether the
 * primary action opens a picker, navigates elsewhere, or stays static.
 */
export const AccountSelectorCard = ({
  title,
  subtitle,
  caption,
  bankCode,
  iconUrl,
  bankUrl,
  onClick,
  buttonLabel,
  className = '',
  compact = false,
  showDisclosure,
}: AccountSelectorCardProps) => {
  const shouldShowDisclosure = showDisclosure ?? Boolean(onClick);
  const shellClass = compact ? 'px-1.5 py-1.5' : 'px-2 py-2';
  const contentClass = compact
    ? 'gap-3 px-3 py-2.5'
    : 'gap-4 px-4 py-3.5';
  const titleClass = compact ? 'text-sm' : 'text-base';
  const subtitleClass = compact ? 'text-xs mt-0.5' : 'text-sm mt-0.5';
  const captionClass = compact ? 'text-[11px] mt-1' : 'text-xs mt-1';
  const iconSize = compact ? 'sm' : 'md';

  const content = (
    <>
      <BankIcon iconUrl={iconUrl} bankUrl={bankUrl} bankCode={bankCode} size={iconSize} />

      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold text-zinc-900 dark:text-zinc-100 ${titleClass}`}>
          {title}
        </p>
        {subtitle && (
          <p className={`truncate font-mono tracking-wider text-zinc-500 dark:text-zinc-400 ${subtitleClass}`}>
            {subtitle}
          </p>
        )}
        {caption && (
          <p className={`truncate text-zinc-400 dark:text-zinc-500 ${captionClass}`}>
            {caption}
          </p>
        )}
      </div>

      {shouldShowDisclosure && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200">
          <ChevronDown size={18} aria-hidden="true" />
        </div>
      )}
    </>
  );

  return (
    <div
      className={`group app-surface-strong flex items-center gap-1 shadow-xs ${shellClass} ${className}`}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={buttonLabel}
          className={`flex min-w-0 flex-1 items-center rounded-[inherit] text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${contentClass}`}
        >
          {content}
        </button>
      ) : (
        <div className={`flex min-w-0 flex-1 items-center ${contentClass}`}>
          {content}
        </div>
      )}
    </div>
  );
};
