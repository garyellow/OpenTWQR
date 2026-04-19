import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { flushSync } from 'react-dom';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAnimatedToggle } from '../hooks/useAnimatedToggle';
import { useDelayedClose } from '../hooks/useDelayedClose';

const DelayedCloseLayer = ({ onClose }: { onClose: () => void }) => {
  const { isClosing, onAnimationEnd } = useDelayedClose(onClose, { historyBack: true });

  return (
    <div role="dialog" data-state={isClosing ? 'closing' : 'open'} onAnimationEnd={onAnimationEnd}>
      delayed-close layer
    </div>
  );
};

const DelayedCloseHarness = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        open delayed layer
      </button>
      {open && <DelayedCloseLayer onClose={() => setOpen(false)} />}
    </div>
  );
};

const AnimatedToggleHarness = () => {
  const toggle = useAnimatedToggle({ historyBack: true });

  return (
    <div>
      <button type="button" onClick={() => toggle.open()}>
        open animated layer
      </button>
      {toggle.isOpen && (
        <div
          role="dialog"
          data-state={toggle.isClosing ? 'closing' : 'open'}
          onAnimationEnd={toggle.onAnimationEnd}
        >
          animated-toggle layer
        </div>
      )}
    </div>
  );
};

describe('overlay history back registration', () => {
  beforeEach(() => {
    window.history.replaceState({ root: true }, '', '/');
  });

  it('lets delayed-close overlays react to a back event fired right after opening', async () => {
    render(<DelayedCloseHarness />);

    flushSync(() => {
      fireEvent.click(screen.getByRole('button', { name: 'open delayed layer' }));
    });

    expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'open');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { root: true } }));
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'closing');
    });

    act(() => {
      screen.getByRole('dialog').dispatchEvent(new Event('animationend', { bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('lets animated-toggle overlays react to a back event fired right after opening', async () => {
    render(<AnimatedToggleHarness />);

    flushSync(() => {
      fireEvent.click(screen.getByRole('button', { name: 'open animated layer' }));
    });

    expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'open');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { root: true } }));
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'closing');
    });

    act(() => {
      screen.getByRole('dialog').dispatchEvent(new Event('animationend', { bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
