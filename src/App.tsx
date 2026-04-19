import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useBanksStore } from './stores/useBanksStore';
import { useThemeStore, applyTheme, applyAccentHue } from './stores/useThemeStore';
import { useAuthStore, readLastActiveTimestamp, writeLastActiveTimestamp } from './stores/useAuthStore';
import { useAppStore } from './stores/useAppStore';
import { AuthLockScreen } from './components/auth/AuthLockScreen';
import { PrivacyScreen } from './components/auth/PrivacyScreen';
import { ReloadPrompt } from './components/layout/ReloadPrompt';
import { InstallPrompt } from './components/layout/InstallPrompt';
import { OnboardingOverlay } from './components/layout/OnboardingOverlay';
import { PageLoader } from './components/layout/PageLoader';
import { TabLayout } from './components/layout/TabLayout';

const ReceivePage = lazy(() =>
  import('./pages/ReceivePage').then((m) => ({ default: m.ReceivePage })),
);
const AccountsPage = lazy(() =>
  import('./pages/AccountsPage').then((m) => ({ default: m.AccountsPage })),
);
const AccountTaskPage = lazy(() =>
  import('./pages/AccountTaskPage').then((m) => ({ default: m.AccountTaskPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ImportTaskPage = lazy(() =>
  import('./pages/ImportTaskPage').then((m) => ({ default: m.ImportTaskPage })),
);
const ExportTaskPage = lazy(() =>
  import('./pages/ExportTaskPage').then((m) => ({ default: m.ExportTaskPage })),
);
const ScanPage = lazy(() =>
  import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })),
);
const SharedPage = lazy(() =>
  import('./pages/SharedPage').then((m) => ({ default: m.SharedPage })),
);
const SharePage = lazy(() =>
  import('./pages/SharePage').then((m) => ({ default: m.SharePage })),
);
const PaymentLinksPage = lazy(() =>
  import('./pages/PaymentLinksPage').then((m) => ({ default: m.PaymentLinksPage })),
);
const PaymentLinkTaskPage = lazy(() =>
  import('./pages/PaymentLinkTaskPage').then((m) => ({ default: m.PaymentLinkTaskPage })),
);

/** Routes that host the bottom tab bar — floating overlays are restricted to these
 *  to prevent covering back-buttons on sub-pages (e.g. /settings/payment-links). */
const TAB_ROUTES = ['/', '/scan', '/accounts', '/settings'] as const;

function App() {
  const refreshBanks = useBanksStore((state) => state.refreshBanks);
  const mode = useThemeStore((state) => state.mode);
  const accentHue = useThemeStore((state) => state.accentHue);

  /* ---------- Auth lock state ---------- */
  const location = useLocation();
  const isSharedPage = location.pathname.startsWith('/s/');
  const isShareTargetPage = location.pathname.startsWith('/share');
  const authHydrated = useAuthStore((s) => s.isHydrated);
  const authEnabled = useAuthStore((s) => s.isEnabled);
  const authUnlocked = useAuthStore((s) => s.isUnlocked);
  const lockTimeout = useAuthStore((s) => s.lockTimeout);
  const lock = useAuthStore((s) => s.lock);

  /* appStore hydration — wait for it alongside authStore so ReceivePage
     never shows a secondary PageLoader after the lazy chunk loads. */
  const appHydrated = useAppStore((s) => s.isHydrated);

  const showLockScreen = authEnabled && !authUnlocked && !isSharedPage && authHydrated;
  const showGlobalAssistiveUI = !isSharedPage && !isShareTargetPage && !showLockScreen;

  /** Restrict floating overlays (OnboardingOverlay, InstallPrompt)
   *  to main tab routes to avoid covering back-buttons on sub-pages. */
  const showOverlayUI = showGlobalAssistiveUI && (TAB_ROUTES as readonly string[]).includes(location.pathname);

  /* ---------- Auto-lock on visibility change ---------- */
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!authEnabled) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        // Only persist the timestamp when the session is unlocked — writing
        // while locked would let a fresh launch auto-unlock without auth.
        if (lockTimeout > 0 && useAuthStore.getState().isUnlocked) writeLastActiveTimestamp();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
        const elapsed = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (elapsed > lockTimeout) lock();
      }
    };

    const handlePageHide = () => {
      if (lockTimeout > 0 && useAuthStore.getState().isUnlocked) writeLastActiveTimestamp();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    // pagehide fires on iOS PWA swipe-away; beforeunload covers desktop unloads
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [authEnabled, lock, lockTimeout]);

  /* ---------- Heartbeat: persist last-active timestamp every 5s ---------- */
  useEffect(() => {
    if (!authEnabled || lockTimeout === 0 || !authUnlocked) return;
    const id = window.setInterval(() => writeLastActiveTimestamp(), 5_000);
    return () => window.clearInterval(id);
  }, [authEnabled, lockTimeout, authUnlocked]);

  /* ---------- On startup: auto-unlock if within lock timeout ---------- */
  const startupCheckedRef = useRef(false);
  useEffect(() => {
    if (!authHydrated || !authEnabled || startupCheckedRef.current) return;
    startupCheckedRef.current = true;

    // lockTimeout === 0 means "always lock" — skip timestamp check
    if (lockTimeout === 0) return;

    readLastActiveTimestamp().then((ts) => {
      if (ts !== null && Date.now() - ts <= lockTimeout) {
        useAuthStore.getState().unlock();
      }
    });
  }, [authHydrated, authEnabled, lockTimeout]);

  useEffect(() => {
    applyTheme(mode);
    applyAccentHue(accentHue);

    if (mode !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode, accentHue]);

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
      {(!authHydrated || !appHydrated) && !isSharedPage ? (
        <PageLoader />
      ) : showLockScreen ? (
        <AuthLockScreen />
      ) : (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<TabLayout />}>
              <Route path="/" element={<ReceivePage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/accounts/new" element={<AccountTaskPage />} />
            <Route path="/accounts/:accountId/edit" element={<AccountTaskPage />} />
            <Route path="/settings/backup/import" element={<ImportTaskPage />} />
            <Route path="/settings/backup/export" element={<ExportTaskPage />} />
            <Route path="/s/:data" element={<SharedPage />} />
            <Route path="/share" element={<SharePage />} />
            <Route path="/import" element={<ImportTaskPage />} />
            <Route path="/settings/payment-links" element={<PaymentLinksPage />} />
            <Route path="/settings/payment-links/new" element={<PaymentLinkTaskPage />} />
            <Route path="/settings/payment-links/:bankCode/edit" element={<PaymentLinkTaskPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
      <ReloadPrompt />
      <InstallPrompt />
      {showOverlayUI && <OnboardingOverlay />}
      <PrivacyScreen />
    </>
  );
}

export default App;
