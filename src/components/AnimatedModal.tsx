import { useRef, useEffect } from 'react';
import { useDelayedClose } from '../hooks/useDelayedClose';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';

interface AnimatedModalProps {
  /** Called after the exit animation completes to remove the modal from the tree. */
  onClose: () => void;
  /** Render prop — receives `requestClose` to trigger the animated close. */
  children: (requestClose: () => void) => React.ReactNode;
  /** Additional Tailwind classes on the fixed overlay (e.g. z-index). */
  overlayClass?: string;
  /** Additional Tailwind classes on the dialog card (e.g. max-width, padding). */
  cardClass?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  /** When true, backdrop click and Escape are ignored. */
  preventClose?: boolean;
  /** Enable body scroll lock (default: true). */
  scrollLock?: boolean;
  /** Ref to the element receiving initial focus. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * A self-contained modal component with backdrop, card entrance / exit
 * animation, scroll lock, focus trap and Escape-to-close.
 *
 * Render it conditionally: `{showModal && <AnimatedModal ...>}`
 */
export const AnimatedModal = ({
  onClose,
  children,
  overlayClass = '',
  cardClass = '',
  ariaLabelledby,
  ariaDescribedby,
  preventClose = false,
  scrollLock = true,
  initialFocusRef,
}: AnimatedModalProps) => {
  const { isClosing, requestClose, onAnimationEnd } = useDelayedClose(onClose);
  const cardRef = useRef<HTMLDivElement>(null);

  useScrollLock(scrollLock);
  useFocusTrap(cardRef, true, initialFocusRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose) requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, preventClose]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-5 motion-reduce:animate-none ${
        isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'
      } ${overlayClass}`}
      onClick={() => !preventClose && requestClose()}
      onAnimationEnd={onAnimationEnd}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        className={`w-full bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overscroll-contain motion-reduce:animate-none ${
          isClosing ? 'animate-out zoom-out-95 duration-150' : 'animate-in zoom-in-95 duration-200'
        } ${cardClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children(requestClose)}
      </div>
    </div>
  );
};
