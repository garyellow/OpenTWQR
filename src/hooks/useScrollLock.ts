import { useEffect } from 'react';

/**
 * Lock body scroll while `active` is true.
 *
 * Uses `position: fixed` + saved `scrollY` to handle iOS Safari, where
 * `overflow: hidden` alone does not prevent the background from scrolling.
 *
 * Reference-counted: multiple concurrent locks (e.g. nested modals) are
 * safe — only the first lock captures state and only the last unlock
 * restores it, preventing visual jumps from intermediate unlock/re-lock
 * cycles.
 *
 * Compensates for scrollbar-width change on desktop to avoid layout shift
 * when the scrollbar disappears.
 */

let lockCount = 0;
let savedScrollY = 0;
const LOCKED_BODY_STYLE_PROPERTIES = ['overflow', 'position', 'top', 'left', 'right', 'paddingRight'] as const;
type LockedBodyStyleProperty = (typeof LOCKED_BODY_STYLE_PROPERTIES)[number];
let savedBodyStyle: Record<LockedBodyStyleProperty, string> | null = null;

export const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;

    lockCount++;
    if (lockCount === 1) {
      savedScrollY = window.scrollY;
      savedBodyStyle = LOCKED_BODY_STYLE_PROPERTIES.reduce(
        (styles, property) => {
          styles[property] = document.body.style[property];
          return styles;
        },
        {} as Record<LockedBodyStyleProperty, string>,
      );

      // Compensate for scrollbar disappearing (desktop only; mobile overlay
      // scrollbars have zero width so this is a no-op there).
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      Object.assign(document.body.style, {
        overflow: 'hidden',
        position: 'fixed',
        top: `-${savedScrollY}px`,
        left: '0',
        right: '0',
        ...(scrollbarWidth > 0
          ? { paddingRight: `${scrollbarWidth}px` }
          : {}),
      });
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        if (savedBodyStyle) {
          for (const property of LOCKED_BODY_STYLE_PROPERTIES) {
            document.body.style[property] = savedBodyStyle[property];
          }
          savedBodyStyle = null;
        }
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
};
