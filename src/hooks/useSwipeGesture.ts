import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Lightweight horizontal swipe detection.
 *
 * Returns `onTouchStart` / `onTouchEnd` handlers — attach them to the
 * element that should respond to swipe gestures.
 *
 * - `onSwipeLeft`  fires when the finger moves **right → left** (dx < 0).
 * - `onSwipeRight` fires when the finger moves **left → right** (dx > 0).
 * - Vertical-dominant movements are ignored (dy/dx ratio > 0.75).
 */
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50,
): SwipeHandlers {
  const startRef = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - startRef.current.x;
    const dy = e.changedTouches[0].clientY - startRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < threshold) return;
    if (absDy / absDx > 0.75) return;

    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchEnd };
}
