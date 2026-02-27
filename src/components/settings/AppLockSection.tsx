import { useState, useCallback, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore, LOCK_TIMEOUT_OPTIONS } from '../../stores/useAuthStore';
import { isWebAuthnSupported, registerCredential } from '../../utils/authLock';

/**
 * App lock toggle + lock timeout selector for the Settings page.
 * Handles WebAuthn credential registration and auth store updates.
 */
export const AppLockSection = () => {
  const authEnabled = useAuthStore((s) => s.isEnabled);
  const lockTimeout = useAuthStore((s) => s.lockTimeout);
  const enableAuth = useAuthStore((s) => s.enable);
  const disableAuth = useAuthStore((s) => s.disable);
  const setLockTimeout = useAuthStore((s) => s.setLockTimeout);

  const [webAuthnAvailable, setWebAuthnAvailable] = useState<boolean | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    isWebAuthnSupported().then(setWebAuthnAvailable);
  }, []);

  const handleToggleLock = useCallback(async () => {
    if (authBusy) return;
    if (authEnabled) {
      disableAuth();
      return;
    }
    setAuthBusy(true);
    const credentialId = await registerCredential();
    if (credentialId) enableAuth(credentialId);
    setAuthBusy(false);
  }, [authEnabled, authBusy, enableAuth, disableAuth]);

  // Don't render if WebAuthn is not available
  if (webAuthnAvailable === false) return null;
  // Still checking availability
  if (webAuthnAvailable === null) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1 mb-3">
        安全性
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {/* App Lock Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={authEnabled}
          onClick={handleToggleLock}
          disabled={authBusy}
          className="w-full flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <ShieldCheck size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">App 鎖定</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                使用裝置驗證保護帳戶資料
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <div
            aria-hidden="true"
            className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors duration-200 ${
              authEnabled
                ? 'bg-green-500 dark:bg-green-500'
                : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          >
            <div
              className={`absolute top-0.75 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                authEnabled ? 'translate-x-5.25' : 'translate-x-0.75'
              }`}
            />
          </div>
        </button>

        {/* Lock Timeout Selector — only visible when lock is enabled */}
        {authEnabled && (
          <div className="p-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              背景鎖定時間
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              切換到背景超過此時間後，需重新驗證身分
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="背景鎖定時間">
              {LOCK_TIMEOUT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={lockTimeout === value}
                  onClick={() => setLockTimeout(value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                    lockTimeout === value
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
