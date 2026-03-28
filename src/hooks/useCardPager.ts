import { useRef, useState, useCallback } from 'react';

interface CardPagerHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Horizontal card-pager gesture hook.
 *
 * Tracks horizontal touch movement in real-time and returns a dampened
 * drag offset for visual feedback.  When the touch releases past the
 * threshold, `onCommit('prev' | 'next')` fires.  Below-threshold
 * releases spring back to zero via CSS transition (caller must apply
 * `isSettling` style and call `onSettleEnd` on `transitionend`).
 *
 * Vertical-dominant gestures are ignored and delegated to native scroll.
 */
export function useCardPager(
  onCommit?: (direction: 'prev' | 'next') => void,
  threshold = 50,
): {
  dragOffset: number;
  isDragging: boolean;
  isSettling: boolean;
  onSettleEnd: () => void;
  handlers: CardPagerHandlers;
} {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  // Tracking state in refs — avoids stale-closure issues across touch events.
  const active = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const decided = useRef(false);
  const vertical = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    active.current = true;
    decided.current = false;
    vertical.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(false);
    setIsSettling(false);
    setDragOffset(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // First significant movement locks the gesture axis.
    if (!decided.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decided.current = true;
      vertical.current = Math.abs(dy) > Math.abs(dx);
    }

    if (vertical.current) return;

    setIsDragging(true);
    setDragOffset(dx * 0.55); // dampening for rubber-band feel
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
      setIsSettling(true);
      setDragOffset(0);
      return;
    }

    setDragOffset(0);
    onCommit?.(dx < 0 ? 'next' : 'prev');
  }, [threshold, onCommit]);

  const onSettleEnd = useCallback(() => {
    setIsSettling(false);
  }, []);

  return { dragOffset, isDragging, isSettling, onSettleEnd, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
