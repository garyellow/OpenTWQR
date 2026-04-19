import { useState, useCallback } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { authenticate } from '../../utils/authLock';
import { OpenTWQRLogo } from '../ui/OpenTWQRLogo';
import { haptic } from '../../utils/haptics';

/**
 * Full-screen lock screen shown when the app requires device
 * verification (biometrics / PIN / password) before granting access.
 *
 * Design: centered branded layout with the logo, an accent-coloured lock
 * icon and a prominent unlock button — colours driven by the user's
 * chosen accent hue (CSS custom properties) for visual consistency.
 */
export const AuthLockScreen = () => {
  const credentialId = useAuthStore((s) => s.credentialId);
  const unlock = useAuthStore((s) => s.unlock);
  const t = useLocaleStore((s) => s.t);

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
      setError(t.auth.authFailed);
    }

    setIsAuthenticating(false);
  }, [credentialId, isAuthenticating, unlock, t.auth.authFailed]);

  return (
    <div className="min-h-app-screen flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
      {/* Lock icon with accent colour */}
      <div className="w-24 h-24 rounded-2xl flex items-center justify-center border shadow-xs"
        style={{
          backgroundColor: 'var(--ca-10)',
          borderColor: 'var(--ca-20)',
        }}
      >
        <Lock size={48} style={{ color: 'var(--ca)' }} aria-hidden="true" />
      </div>

      {/* Headline */}
      <div className="text-center space-y-3">
        <h1>
          <OpenTWQRLogo className="h-9 w-auto mx-auto" />
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
          {t.auth.promptDesc}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" aria-live="polite" className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Unlock button — accent colour for cohesive branding */}
      <button
        type="button"
        onClick={handleUnlock}
        disabled={isAuthenticating}
        className="w-full max-w-72 flex items-center justify-center gap-2.5 py-4 btn-accent font-semibold rounded-xl text-lg active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 mt-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      >
        <ShieldCheck size={22} aria-hidden="true" />
        {isAuthenticating ? t.auth.authenticating : t.auth.unlock}
      </button>
    </div>
  );
};
