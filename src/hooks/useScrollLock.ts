import { useEffect } from 'react';

/**
 * Lock body scroll while `active` is true.
 *
 * Uses `position: fixed` + saved `scrollY` to handle iOS Safari, where
 * `overflow: hidden` alone does not prevent the background from scrolling.
 * Restores exact scroll position on cleanup.
 */
export const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    const prevCssText = document.body.style.cssText;

    Object.assign(document.body.style, {
      overflow: 'hidden',
      position: 'fixed',
      top: `-${scrollY}px`,
      left: '0',
      right: '0',
    });

    return () => {
      document.body.style.cssText = prevCssText;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
};
