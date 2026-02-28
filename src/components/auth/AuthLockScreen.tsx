import { useState, useCallback } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { authenticate } from '../../utils/authLock';
import { OpenTWQRLogo } from '../ui/OpenTWQRLogo';
import { haptic } from '../../utils/haptics';

/**
 * Full-screen lock screen shown when the app requires device
 * verification (biometrics / PIN / password) before granting access.
 *
 * Design: centered branded layout with the logo, a teal-accented lock
 * icon and a prominent unlock button — matching the app's TWQR brand
 * palette (#008BBA teal, #E74E95 pink) for visual consistency.
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
      {/* Branded lock icon with teal accent */}
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-[#008BBA]/10 dark:bg-[#008BBA]/15 border border-[#008BBA]/20 dark:border-[#008BBA]/25 shadow-xs">
        <Lock size={48} className="text-[#008BBA]" aria-hidden="true" />
      </div>

      {/* Headline */}
      <div className="text-center space-y-3">
        <h1>
          <OpenTWQRLogo className="h-9 w-auto mx-auto" />
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
          請驗證身分以解鎖應用程式
        </p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Unlock button — uses brand teal for a cohesive branded feel */}
      <button
        type="button"
        onClick={handleUnlock}
        disabled={isAuthenticating}
        className="w-full max-w-xs flex items-center justify-center gap-2.5 py-4 bg-[#008BBA] text-white font-semibold rounded-2xl text-lg hover:bg-[#007AA6] active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 mt-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#008BBA] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      >
        <ShieldCheck size={22} aria-hidden="true" />
        {isAuthenticating ? '驗證中…' : '解鎖'}
      </button>
    </div>
  );
};
