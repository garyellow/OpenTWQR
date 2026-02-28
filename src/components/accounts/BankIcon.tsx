import { useState } from 'react';
import { resolveIconSrc } from '../../utils/favicon';

interface BankIconProps {
  iconUrl?: string;
  bankCode: string;
  size?: 'sm' | 'md';
  /** Extra Tailwind classes for the outer wrapper. */
  className?: string;
}

/**
 * Bank icon with automatic favicon resolution and fallback to bank code text.
 *
 * - If `iconUrl` resolves to a valid image → shows the image.
 * - Otherwise → shows the first 3 chars of `bankCode` as text.
 */
export const BankIcon = ({
  iconUrl,
  bankCode,
  size = 'md',
  className = '',
}: BankIconProps) => {
  const src = resolveIconSrc(iconUrl);
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src && !imgError);

  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm';
  const radiusClass = size === 'sm' ? 'rounded-lg' : 'rounded-xl';
  const bgClass = 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700/50';
  const textClass = 'text-zinc-700 dark:text-zinc-300';

  return (
    <div
      className={`${sizeClass} ${radiusClass} flex items-center justify-center font-semibold border shrink-0 overflow-hidden ${bgClass} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-1"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={textClass}>{bankCode.substring(0, 3)}</span>
      )}
    </div>
  );
};
