import { useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useAppStore } from '../../stores/useAppStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { haptic } from '../../utils/haptics';

/**
 * Danger zone section — provides a "Reset All Data" action that clears
 * every persisted store and reloads the app.
 */
export const DangerSection = () => {
  const t = useLocaleStore((s) => s.t);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = useCallback(() => {
    haptic();

    // Clear all Zustand stores (IDB + localStorage)
    // These trigger persist middleware to remove their storage keys
    useAppStore.persist.clearStorage();
    useThemeStore.persist.clearStorage();
    useLocaleStore.persist.clearStorage();
    useAuthStore.persist.clearStorage();
    useQRSettingsStore.persist.clearStorage();
    useUrlSchemeStore.persist.clearStorage();

    // Also clear any standalone localStorage keys
    try {
      localStorage.removeItem('opentwqr-onboarding-done');
      localStorage.removeItem('opentwqr-last-backup');
      localStorage.removeItem('opentwqr-backup-reminder-snoozed');
      localStorage.removeItem('opentwqr-install-dismissed');
    } catch { /* noop */ }

    // Reload the page to reinitialize everything
    window.location.reload();
  }, []);

  return (
    <div>
      <h2 className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider px-1 mb-3">
        {t.danger.sectionTitle}
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-red-200/50 dark:border-red-800/30 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-red-600 dark:text-red-400 text-sm">{t.danger.resetTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.danger.resetDesc}
            </p>
          </div>
        </button>
      </div>

      {showConfirm && (
        <AnimatedModal
          onClose={() => setShowConfirm(false)}
          overlayClass="z-50"
          cardClass="w-full max-w-sm"
          ariaLabelledby="danger-reset-title"
          ariaDescribedby="danger-reset-desc"
        >
          {(requestClose) => (
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <Trash2 size={28} className="text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
              <h2 id="danger-reset-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                {t.danger.resetConfirmTitle}
              </h2>
              <p id="danger-reset-desc" className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                {t.danger.resetConfirmDesc}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  {t.danger.resetCancel}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.danger.resetConfirm}
                </button>
              </div>
            </div>
          )}
        </AnimatedModal>
      )}
    </div>
  );
};
