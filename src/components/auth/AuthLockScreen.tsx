import { useState, useCallback } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { authenticate } from '../../utils/authLock';
import { haptic } from '../../utils/haptics';

/**
 * Full-screen lock screen shown when the app requires device
 * verification (biometrics / PIN / password) before granting access.
 */
export const AuthLockScreen = () => {
  const credentialId = useAuthStore((s) => s.credentialId);
  const unlock = useAuthStore((s) => s.unlock);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = useCallback(async () => {
    if (!credentialId || isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);

    const success = await authenticate(credentialId);

    if (success) {
      haptic();
      unlock();
    } else {
      setError('驗證失敗，請再試一次');
    }

    setIsAuthenticating(false);
  }, [credentialId, isAuthenticating, unlock]);

  return (
    <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
      {/* Icon */}
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
        <Lock size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
      </div>

      {/* Headline */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          OpenTWQR
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto leading-relaxed text-lg">
          請驗證身分以解鎖應用程式
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Unlock button */}
      <button
        type="button"
        onClick={handleUnlock}
        disabled={isAuthenticating}
        className="w-full max-w-xs flex items-center justify-center gap-2.5 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:active:scale-100 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      >
        <ShieldCheck size={22} aria-hidden="true" />
        {isAuthenticating ? '驗證中…' : '解鎖'}
      </button>
    </div>
  );
};
