import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

const FormHarness = () => {
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const { confirmNavigation, proceedNavigation, confirmationDialog } = useUnsavedChangesGuard({
    when: dirty,
    title: 'Discard draft?',
    description: 'Unsaved changes will be lost.',
    confirmLabel: 'Leave anyway',
  });

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={dirty}
          onChange={(event) => setDirty(event.target.checked)}
        />
        dirty
      </label>
      <button type="button" onClick={() => confirmNavigation(() => navigate('/done'))}>
        dismiss
      </button>
      <Link to="/done">go link</Link>
      <button type="button" onClick={() => proceedNavigation(() => navigate('/done'))}>
        save
      </button>
      {confirmationDialog}
    </div>
  );
};

const renderHarness = () =>
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/form" element={<FormHarness />} />
        <Route path="/done" element={<div>done page</div>} />
      </Routes>
    </BrowserRouter>,
  );

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({ idx: 0 }, '', '/form');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a confirmation dialog before explicit dismiss actions', async () => {
    renderHarness();

    fireEvent.click(screen.getByLabelText('dirty'));
    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));

    expect(screen.getByText('Discard draft?')).toBeInTheDocument();
    expect(screen.queryByText('done page')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Leave anyway' }));
    act(() => {
      vi.advanceTimersByTime(250);
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText('done page')).toBeInTheDocument();
  });

  it('prompts on browser back while dirty and only leaves after confirmation', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);

    renderHarness();

    fireEvent.click(screen.getByLabelText('dirty'));

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { idx: 0 } }));
    });

    expect(screen.getByText('Discard draft?')).toBeInTheDocument();
    expect(screen.queryByText('done page')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Leave anyway' }));
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });

  it('allows successful completion flows to bypass the blocker', async () => {
    renderHarness();

    fireEvent.click(screen.getByLabelText('dirty'));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText('done page')).toBeInTheDocument();

    expect(screen.queryByText('Discard draft?')).not.toBeInTheDocument();
  });
});
