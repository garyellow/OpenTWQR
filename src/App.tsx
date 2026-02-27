import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useBanksStore } from './stores/useBanksStore';
import { useThemeStore, applyTheme } from './stores/useThemeStore';
import { useAuthStore } from './stores/useAuthStore';
import { AuthLockScreen } from './components/auth/AuthLockScreen';
import { PrivacyScreen } from './components/auth/PrivacyScreen';
import { ReloadPrompt } from './components/layout/ReloadPrompt';
import { InstallPrompt } from './components/layout/InstallPrompt';

const ReceivePage = lazy(() =>
  import('./pages/ReceivePage').then((m) => ({ default: m.ReceivePage })),
);
const AccountsPage = lazy(() =>
  import('./pages/AccountsPage').then((m) => ({ default: m.AccountsPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const SharedPage = lazy(() =>
  import('./pages/SharedPage').then((m) => ({ default: m.SharedPage })),
);
const ImportPage = lazy(() =>
  import('./pages/ImportPage').then((m) => ({ default: m.ImportPage })),
);

function App() {
  const refreshBanks = useBanksStore((state) => state.refreshBanks);
  const mode = useThemeStore((state) => state.mode);

  /* ---------- Auth lock state ---------- */
  const location = useLocation();
  const isSharedPage = location.pathname.startsWith('/s/');
  const authHydrated = useAuthStore((s) => s.isHydrated);
  const authEnabled = useAuthStore((s) => s.isEnabled);
  const authUnlocked = useAuthStore((s) => s.isUnlocked);
  const lockTimeout = useAuthStore((s) => s.lockTimeout);
  const lock = useAuthStore((s) => s.lock);

  const showLockScreen = authEnabled && !authUnlocked && !isSharedPage && authHydrated;

  /* ---------- Auto-lock on visibility change ---------- */
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!authEnabled) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
        const elapsed = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        // Re-lock after configured timeout in the background
        if (elapsed > lockTimeout) lock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [authEnabled, lock, lockTimeout]);

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
      {!authHydrated && !isSharedPage ? (
        <PageLoader />
      ) : showLockScreen ? (
        <AuthLockScreen />
      ) : (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ReceivePage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/s/:data" element={<SharedPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
      <ReloadPrompt />
      <InstallPrompt />
      <PrivacyScreen />
    </>
  );
}

/** Minimal full-screen spinner shown while a lazy page chunk is loading. */
function PageLoader() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950" role="status" aria-label="載入中">
      <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
    </div>
  );
}

export default App;
