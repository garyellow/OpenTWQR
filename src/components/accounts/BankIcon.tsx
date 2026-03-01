import { useState } from 'react';
import { resolveIconSrc } from '../../utils/favicon';

interface BankIconProps {
  iconUrl?: string;
  /** Default bank website URL — used as favicon fallback when iconUrl is absent. */
  bankUrl?: string;
  bankCode: string;
  size?: 'sm' | 'md';
  /** Extra Tailwind classes for the outer wrapper. */
  className?: string;
}

/**
 * Bank icon with automatic favicon resolution and fallback to bank code text.
 *
 * Resolution order: `iconUrl` → `bankUrl` → text code.
 *
 * The image fades in after it loads so the component never shows a jarring
 * snap from the blank container to the fully-rendered icon.
 *
 * State is tracked per-URL rather than reset in an effect:
 * `loadedSrc` and `erroredSrc` store the URL they represent, so when `src`
 * changes React can derive the new loaded/error state in render without
 * needing `useEffect` — this avoids the extra render cycle and the
 * `react-hooks/set-state-in-effect` lint error.
 */
export const BankIcon = ({
  iconUrl,
  bankUrl,
  bankCode,
  size = 'md',
  className = '',
}: BankIconProps) => {
  // Prioritise user-set icon; fall back to bank default URL
  const src = resolveIconSrc(iconUrl) ?? resolveIconSrc(bankUrl);

  // Track load / error by URL instead of boolean flags so React can derive
  // state during render when `src` changes without needing useEffect.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);

  const showImage = Boolean(src && src !== erroredSrc);
  const imgReady = loadedSrc === src;

  const containerClass = size === 'sm'
    ? 'max-w-8 max-h-8 min-w-6 min-h-6 text-xs'
    : 'max-w-12 max-h-12 min-w-8 min-h-8 text-sm';
  const fallbackSizeClass = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
  const radiusClass = size === 'sm' ? 'rounded-lg' : 'rounded-xl';
  const bgClass = 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700/50';
  const textClass = 'text-zinc-700 dark:text-zinc-300';

  return (
    <div
      className={`${showImage ? containerClass : fallbackSizeClass} ${radiusClass} flex items-center justify-center font-semibold border shrink-0 overflow-hidden ${bgClass} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          onError={() => setErroredSrc(src!)}
          onLoad={() => setLoadedSrc(src!)}
          className={`max-w-full max-h-full object-contain p-1 transition-opacity duration-200 ${imgReady ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={textClass}>{bankCode.substring(0, 3)}</span>
      )}
    </div>
  );
};
