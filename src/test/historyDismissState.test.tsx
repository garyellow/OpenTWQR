import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHistoryDismissState } from '../hooks/useHistoryDismissState';

const Harness = () => {
  const [active, setActive] = useState(false);
  const requestDismiss = useHistoryDismissState({
    active,
    onDismiss: () => setActive(false),
  });

  return (
    <div>
      <button type="button" onClick={() => setActive(true)}>open</button>
      {active && <button type="button" onClick={requestDismiss}>dismiss</button>}
      <span data-testid="state">{active ? 'open' : 'closed'}</span>
    </div>
  );
};

describe('useHistoryDismissState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({ root: true }, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses the active state when the synthetic history entry is popped', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('state')).toHaveTextContent('open');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { root: true } }));
    });

    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });

  it('falls back to closing even if the browser does not emit popstate for history.back()', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('state')).toHaveTextContent('closed');
  });
});
