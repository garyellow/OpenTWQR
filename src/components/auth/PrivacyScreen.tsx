import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

/**
 * Full-screen privacy overlay displayed when the app enters the background.
 *
 * Mirrors the behaviour of banking / payment apps (e.g. 國泰世華、中信、玉山)
 * that show a branded splash or blurred screen in the OS task-switcher,
 * preventing bystanders from glimpsing sensitive account data.
 *
 * This overlay is shown instantly on `visibilitychange → hidden` when the
 * app lock is enabled, and removed when the app returns to the foreground
 * (either because the user was already unlocked or after re-authentication).
 */
export const PrivacyScreen = () => {
  const authEnabled = useAuthStore((s) => s.isEnabled);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!authEnabled) return;

    const handle = () => {
      setHidden(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [authEnabled]);

  if (!authEnabled || !hidden) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950"
      aria-hidden="true"
    >
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm mb-4">
        <Lock size={40} className="text-zinc-300 dark:text-zinc-600" />
      </div>
      <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        OpenTWQR
      </p>
    </div>
  );
};
