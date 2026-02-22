import { Routes, Route, Navigate } from 'react-router-dom';
import { ReceivePage } from './pages/ReceivePage';
import { AccountsPage } from './pages/AccountsPage';
import { useEffect } from 'react';
import { useBanksStore } from './stores/useBanksStore';

function App() {
  const refreshBanks = useBanksStore((state) => state.refreshBanks);

  useEffect(() => {
    const bodyClasses = [
      'bg-black',
      'text-white',
      'antialiased',
      'overflow-x-hidden',
      'selection:bg-emerald-500/30',
      'selection:text-emerald-200',
    ];

    document.body.classList.add(...bodyClasses);

    return () => {
      document.body.classList.remove(...bodyClasses);
    };
  }, []);

  useEffect(() => {
    refreshBanks();

    const onOnline = () => {
      refreshBanks();
    };

    const intervalId = window.setInterval(() => {
      refreshBanks();
    }, 60 * 60 * 1000);

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
