import { useRef, type AnimationEvent } from 'react';
import { X, Clipboard, Link2, Lock, Clock, Loader2 } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLocaleStore } from '../../stores/useLocaleStore';
import type { ExpiryOption } from '../../types';

interface LinkSettingsDialogProps {
  isClosing: boolean;
  onClose: () => void;
  onAnimationEnd: (e: AnimationEvent) => void;
  action: 'copy' | 'share';
  expiry: ExpiryOption;
  setExpiry: (v: ExpiryOption) => void;
  password: string;
  setPassword: (v: string) => void;
  isEncrypting: boolean;
  onConfirm: () => void;
}

/** Expiry & password dialog for encrypted share links. */
export const LinkSettingsDialog = ({
  isClosing,
  onClose,
  onAnimationEnd,
  action,
  expiry,
  setExpiry,
  password,
  setPassword,
  isEncrypting,
  onConfirm,
}: LinkSettingsDialogProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, !isClosing);
  const t = useLocaleStore((s) => s.t);

  return (
    <div className="fixed inset-0 z-85">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm motion-reduce:animate-none ${
          isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-150'
        }`}
        onClick={() => !isEncrypting && onClose()}
        aria-hidden="true"
      />

      {/* Card centering */}
      <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-none">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-settings-title"
        className={`pointer-events-auto app-modal-shell relative w-full max-w-sm bg-white dark:bg-zinc-900 shadow-2xl motion-reduce:animate-none p-6 overflow-y-auto overscroll-contain max-h-app-modal-tight ${
          isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'
        }`}
        onAnimationEnd={onAnimationEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 id="link-settings-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t.linkSettings.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isEncrypting}
            aria-label={t.common.close}
            className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Expiry options */}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            <Clock size={16} aria-hidden="true" />
            {t.linkSettings.expiryLabel}
          </label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.linkSettings.expiryLabel}>
            {([0, 600, 3600, 86400] as const).map((val) => {
              const label = t.linkSettings.expiryOptions[val] ?? String(val);
              return (
              <button
                key={val}
                type="button"
                role="radio"
                aria-checked={expiry === val}
                onClick={() => setExpiry(val)}
                disabled={isEncrypting}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium action-transition ${
                  expiry === val
                    ? 'chip-accent shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                } disabled:opacity-50`}
              >
                {label}
              </button>
              );
            })}
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label
            className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3"
            htmlFor="link-password-input"
          >
            <Lock size={16} aria-hidden="true" />
            {t.linkSettings.passwordLabel}
            <span className="font-normal text-zinc-400 dark:text-zinc-500">{t.linkSettings.passwordOptional}</span>
          </label>
          <input
            type="password"
            id="link-password-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isEncrypting) {
                e.preventDefault();
                onConfirm();
              }
            }}
            disabled={isEncrypting}
            placeholder={t.linkSettings.passwordPlaceholder}
            autoComplete="new-password"
            className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs disabled:opacity-50"
          />
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isEncrypting}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          {isEncrypting ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              {t.linkSettings.creating}
            </>
          ) : (
            <>
              {action === 'copy' ? (
                <Clipboard size={18} aria-hidden="true" />
              ) : (
                <Link2 size={18} aria-hidden="true" />
              )}
              {action === 'copy' ? t.linkSettings.copyLinkAction : t.linkSettings.shareLinkAction}
            </>
          )}
        </button>
      </div>
      </div>
    </div>
  );
};
