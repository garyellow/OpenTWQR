import { useState } from 'react';
import { resolveIconSrc } from '../../utils/favicon';

interface BankIconProps {
  iconUrl?: string;
  /** Official bank website/homepage — used only as favicon fallback when iconUrl is absent. */
  bankUrl?: string;
  bankCode: string;
  size?: 'sm' | 'md';
  /** Extra Tailwind classes for the outer wrapper. */
  className?: string;
}

/**
 * Bank icon with automatic favicon resolution and fallback to bank code text.
 *
 * Resolution order: `iconUrl` → `bankUrl` (homepage favicon) → text code.
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
  // Prioritise user-set icon; fall back to the institution homepage favicon.
  const src = resolveIconSrc(iconUrl) ?? resolveIconSrc(bankUrl);

  // Track load / error by URL instead of boolean flags so React can derive
  // state during render when `src` changes without needing useEffect.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);

  const showImage = Boolean(src && src !== erroredSrc);
  const imgReady = loadedSrc === src;
  const iconPixelSize = size === 'sm' ? 32 : 48;

  const containerClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm';
  const radiusClass = size === 'sm' ? 'rounded-lg' : 'rounded-xl';
  const bgClass = 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700/50';
  const textClass = 'text-zinc-700 dark:text-zinc-300';

  return (
    <div
      className={`${containerClass} ${radiusClass} flex items-center justify-center font-semibold border shrink-0 overflow-hidden ${bgClass} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          width={iconPixelSize}
          height={iconPixelSize}
          onError={() => setErroredSrc(src!)}
          onLoad={() => setLoadedSrc(src!)}
          className={`h-full w-full object-contain p-1 transition-opacity duration-200 ${imgReady ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={textClass}>{bankCode.substring(0, 3)}</span>
      )}
    </div>
  );
};
