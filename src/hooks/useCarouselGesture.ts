import { useCallback, useRef, useState } from 'react';

export type CarouselGesturePhase = 'idle' | 'settling' | 'committing';

/**
 * Touch / programmatic gesture state for a horizontally paged carousel.
 *
 * This hook intentionally does not own any data updates. It only tracks drag
 * state, decides whether a gesture should settle back or commit to a direction,
 * and lets the caller finish the transition by rotating slot data when the CSS
 * animation ends.
 */
export function useCarouselGesture(enabled: boolean, threshold = 50) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<CarouselGesturePhase>('idle');
  const [commitDirection, setCommitDirection] = useState<'prev' | 'next' | null>(null);

  const active = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const decided = useRef(false);
  const vertical = useRef(false);

  const resetAfterTransition = useCallback(() => {
    active.current = false;
    decided.current = false;
    vertical.current = false;
    setDragOffset(0);
    setIsDragging(false);
    setCommitDirection(null);
    setPhase('idle');
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || e.touches.length !== 1 || phase === 'committing') return;
    active.current = true;
    decided.current = false;
    vertical.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(false);
    setPhase('idle');
    setCommitDirection(null);
    setDragOffset(0);
  }, [enabled, phase]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !active.current || e.touches.length !== 1) return;

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
  }, [enabled]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !active.current) return;

    active.current = false;
    decided.current = false;
    setIsDragging(false);

    if (vertical.current) {
      vertical.current = false;
      setDragOffset(0);
      setCommitDirection(null);
      setPhase('idle');
      return;
    }

    const dx = e.changedTouches[0].clientX - startX.current;

    if (Math.abs(dx) < threshold) {
      setDragOffset(0);
      setCommitDirection(null);
      setPhase('settling');
      return;
    }

    vertical.current = false;
    setDragOffset(0);
    setCommitDirection(dx > 0 ? 'prev' : 'next');
    setPhase('committing');
  }, [enabled, threshold]);

  const onTouchCancel = useCallback(() => {
    if (!enabled) return;
    resetAfterTransition();
  }, [enabled, resetAfterTransition]);

  /** Programmatic navigation — used by chevron buttons and keyboard arrows. */
  const commitTo = useCallback((direction: 'prev' | 'next') => {
    if (!enabled || phase === 'committing') return;
    setIsDragging(false);
    setDragOffset(0);
    setCommitDirection(direction);
    setPhase('committing');
  }, [enabled, phase]);

  return {
    dragOffset,
    isDragging,
    phase,
    commitDirection,
    commitTo,
    resetAfterTransition,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  };
}