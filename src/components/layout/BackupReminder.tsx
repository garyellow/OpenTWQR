import { useState, useEffect, useCallback } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useAppStore } from '../../stores/useAppStore';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SNOOZE_KEY = 'opentwqr-backup-reminder-snoozed';
const LAST_BACKUP_KEY = 'opentwqr-last-backup';

/**
 * Displays a toast when the user hasn't exported a backup in over 30 days.
 * Only shows if the user has at least one account.
 * Snoozed for 7 days when dismissed.
 */
export const BackupReminder = () => {
  const t = useLocaleStore((s) => s.t);
  const navigate = useNavigate();
  const accountCount = useAppStore((s) => s.accounts.length);
  const [show, setShow] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (accountCount === 0) return;

    try {
      // Check snooze
      const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || '0');
      if (Date.now() < snoozedUntil) return;

      // Check last backup
      const lastBackup = Number(localStorage.getItem(LAST_BACKUP_KEY) || '0');
      if (lastBackup === 0 || Date.now() - lastBackup > THIRTY_DAYS_MS) {
        // Small delay so it doesn't pop immediately on load
        const timer = setTimeout(() => setShow(true), 2000);
        return () => clearTimeout(timer);
      }
    } catch { /* noop */ }
  }, [accountCount]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    // Snooze for 7 days
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch { /* noop */ }
  }, []);

  const handleGoToBackup = useCallback(() => {
    setIsExiting(true);
    // Snooze for 7 days
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch { /* noop */ }
    // Navigate after animation
    setTimeout(() => navigate('/settings'), 300);
  }, [navigate]);

  const handleAnimationEnd = useCallback(() => {
    if (isExiting) setShow(false);
  }, [isExiting]);

  if (!show) return null;

  return (
    <div
      role="alert"
      className={`fixed top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-90 w-[calc(100%-2.5rem)] max-w-sm motion-reduce:animate-none ${
        isExiting
          ? 'animate-out slide-out-to-top-4 fade-out duration-300'
          : 'animate-in slide-in-from-top-4 fade-in duration-300'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="relative bg-amber-50 dark:bg-amber-950/80 rounded-xl shadow-2xl border border-amber-200 dark:border-amber-800/50 p-4 pr-12">
        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t.backup.reminderDismiss}
          className="absolute top-3 right-3 p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <TriangleAlert size={20} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
              {t.backup.reminderTitle}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
              {t.backup.reminderDesc}
            </p>
            <button
              type="button"
              onClick={handleGoToBackup}
              className="mt-2.5 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-amber-950 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-amber-950"
            >
              {t.backup.reminderAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
