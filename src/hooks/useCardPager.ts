import { useRef, useState, useCallback } from 'react';

type PagerPhase = 'idle' | 'settling' | 'committing';

/**
 * Horizontal three-panel card-pager hook.
 *
 * Designed for a 3-panel strip layout where `translateX(-33.333%)`
 * centres the middle panel.  During a drag the offset follows the
 * finger (dampened).  When the touch releases past the threshold,
 * `phase` becomes `'committing'` and `commitDirection` indicates the
 * target panel.  The caller animates the strip to the edge; once the
 * CSS transition finishes, `onTransitionEnd` fires `onCommit` and
 * resets to idle.
 *
 * `commitTo` allows programmatic navigation (chevron buttons,
 * keyboard arrows) that bypasses touch input.
 *
 * Vertical-dominant gestures are ignored and delegated to native scroll.
 */
export function useCardPager(
  onCommit?: (direction: 'prev' | 'next') => void,
  threshold = 50,
) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<PagerPhase>('idle');
  const [commitDirection, setCommitDirection] = useState<'prev' | 'next' | null>(null);

  const active = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const decided = useRef(false);
  const vertical = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || phase === 'committing') return;
    active.current = true;
    decided.current = false;
    vertical.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(false);
    setPhase('idle');
    setCommitDirection(null);
    setDragOffset(0);
  }, [phase]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!decided.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decided.current = true;
      vertical.current = Math.abs(dy) > Math.abs(dx);
    }

    if (vertical.current) return;

    setIsDragging(true);
    setDragOffset(dx * 0.55);
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!active.current) return;
    active.current = false;
    setIsDragging(false);

    if (vertical.current || !decided.current) {
      setDragOffset(0);
      return;
    }

    const dx = e.changedTouches[0].clientX - startX.current;

    if (Math.abs(dx) < threshold) {
      setPhase('settling');
      setDragOffset(0);
      return;
    }

    const dir = dx > 0 ? 'prev' as const : 'next' as const;
    setCommitDirection(dir);
    setDragOffset(0);
    setPhase('committing');
  }, [threshold]);

  /** Programmatic navigation — used by chevron buttons and keyboard. */
  const commitTo = useCallback((direction: 'prev' | 'next') => {
    if (phase === 'committing') return;
    setCommitDirection(direction);
    setPhase('committing');
  }, [phase]);

  /** Attach to the strip's `onTransitionEnd`. */
  const onTransitionEnd = useCallback(() => {
    if (phase === 'settling') {
      setPhase('idle');
    } else if (phase === 'committing' && commitDirection) {
      onCommit?.(commitDirection);
      setCommitDirection(null);
      setPhase('idle');
    }
  }, [phase, commitDirection, onCommit]);

  return {
    dragOffset,
    isDragging,
    phase,
    commitDirection,
    onTransitionEnd,
    commitTo,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
