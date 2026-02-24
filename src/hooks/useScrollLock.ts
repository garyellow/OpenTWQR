import { useEffect } from 'react';

/**
 * Lock `document.body` scroll while `active` is true.
 * Restores the previous `overflow` value on cleanup.
 */
export const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
};
