import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useBanksStore } from './stores/useBanksStore';
import { useThemeStore, applyTheme } from './stores/useThemeStore';
import { ReloadPrompt } from './components/ReloadPrompt';

const ReceivePage = lazy(() =>
  import('./pages/ReceivePage').then((m) => ({ default: m.ReceivePage })),
);
const AccountsPage = lazy(() =>
  import('./pages/AccountsPage').then((m) => ({ default: m.AccountsPage })),
);
const SharedPage = lazy(() =>
  import('./pages/SharedPage').then((m) => ({ default: m.SharedPage })),
);

function App() {
  const refreshBanks = useBanksStore((state) => state.refreshBanks);
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    applyTheme(mode);

    if (mode !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  useEffect(() => {
    refreshBanks();

    const onOnline = () => refreshBanks();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshBanks();
    };
    const intervalId = window.setInterval(() => refreshBanks(), 60 * 60 * 1000);

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(intervalId);
    };
  }, [refreshBanks]);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<ReceivePage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/s/:data" element={<SharedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ReloadPrompt />
    </>
  );
}

/** Minimal full-screen spinner shown while a lazy page chunk is loading. */
function PageLoader() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
    </div>
  );
}

export default App;
