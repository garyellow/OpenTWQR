import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRouteTaskDismiss } from '../hooks/useRouteTaskDismiss';

const TaskHarness = () => {
  const dismiss = useRouteTaskDismiss({ fallbackTo: '/accounts' });

  return (
    <button type="button" onClick={dismiss}>
      dismiss task
    </button>
  );
};

const renderHarness = () =>
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/accounts" element={<div>accounts page</div>} />
        <Route path="/accounts/new" element={<TaskHarness />} />
      </Routes>
    </BrowserRouter>,
  );

describe('useRouteTaskDismiss', () => {
  beforeEach(() => {
    window.history.replaceState({ idx: 0 }, '', '/');
  });

  it('uses browser back when in-app history exists', async () => {
    window.history.replaceState({ idx: 0 }, '', '/accounts');
    window.history.pushState({ idx: 1 }, '', '/accounts/new');

    renderHarness();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByText('accounts page')).toBeInTheDocument();
    });
  });

  it('falls back to the parent route when opened directly', async () => {
    window.history.replaceState({ idx: 0 }, '', '/accounts/new');

    renderHarness();

    fireEvent.click(screen.getByRole('button', { name: 'dismiss task' }));

    await waitFor(() => {
      expect(screen.getByText('accounts page')).toBeInTheDocument();
    });
  });
});
