import { Routes, Route, Navigate } from 'react-router-dom';
import { ReceivePage } from './pages/ReceivePage';
import { AccountsPage } from './pages/AccountsPage';
import { useEffect } from 'react';
import { useBanksStore } from './stores/useBanksStore';
import { useThemeStore, applyTheme } from './stores/useThemeStore';

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
    const intervalId = window.setInterval(() => refreshBanks(), 60 * 60 * 1000);

    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(intervalId);
    };
  }, [refreshBanks]);

  return (
    <Routes>
      <Route path="/" element={<ReceivePage />} />
      <Route path="/accounts" element={<AccountsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
