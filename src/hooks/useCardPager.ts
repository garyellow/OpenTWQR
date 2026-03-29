import { useRef, useState, useCallback } from 'react';

type PagerPhase = 'idle' | 'settling' | 'committing';

/** Centre of the 3-panel strip. */
const CENTER = 'translate3d(-33.333%,0px,0px)';

/**
 * Horizontal three-panel card-pager hook.
 *
 * Designed for a 3-panel strip layout where `translate3d(-33.333%,0,0)`
 * centres the middle panel.  During a drag the offset follows the
 * finger (dampened).  When the touch releases past the threshold,
 * `phase` becomes `'committing'` and `commitDirection` indicates the
 * target panel.
 *
 * When the CSS commit-transition finishes, the hook performs a
 * *DOM-level teleport*: it directly sets `transition:none` and snaps
 * the strip back to centre, then forces a synchronous reflow so the
 * browser commits the new position *before* React re-renders with the
 * updated data.  This eliminates the 1-2 frame flicker that would
 * otherwise occur when React updates the centre panel's content.
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

  /**
   * Attach to the strip's `onTransitionEnd`.
   *
   * Filters out bubbled events from child elements (e.g. button
   * hover transitions) and non-transform transitions.
   *
   * On commit-end, performs a *DOM-level teleport*:
   * 1. Set `transition:none` + snap the strip to centre via `e.currentTarget`
   * 2. Force a synchronous reflow so the browser commits the new position
   * 3. Fire `onCommit` (parent updates data) + reset local state
   *
   * React's reconciler then re-renders with the idle `stripStyle`, which
   * sets the same centre transform and clears the `transition:none` we set
   * (because the idle style has no `transition` key and React removes any
   * inline property it had previously managed).
   */
  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      // Only react to the strip's own transform transition.
      if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;

      if (phase === 'settling') {
        setPhase('idle');
        return;
      }

      if (phase === 'committing' && commitDirection) {
        const strip = e.currentTarget;

        // ── DOM-level teleport ──────────────────────────────
        // Snap the strip back to centre WITHOUT any CSS transition
        // so the browser composites the centred position before
        // React re-renders with updated panel data.
        strip.style.transition = 'none';
        strip.style.transform = CENTER;
        // Force a synchronous reflow — the browser must commit the
        // above style changes before we proceed.
        void strip.offsetHeight;

        // Fire the parent callback (e.g. selectAccount) and reset.
        // React will re-render synchronously (React 19 batching) and apply
        // the idle stripStyle — which includes the correct centre transform.
        // React's reconciler will also clear the 'transition: none' we set
        // above (because the idle stripStyle has no transition key and React
        // removes props it previously managed).  No rAF cleanup needed.
        onCommit?.(commitDirection);
        setCommitDirection(null);
        setPhase('idle');
      }
    },
    [phase, commitDirection, onCommit],
  );

  return {
    dragOffset,
    isDragging,
    phase,
    commitDirection,
    handleTransitionEnd,
    commitTo,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
