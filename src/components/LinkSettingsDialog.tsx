import { useRef, type AnimationEvent } from 'react';
import { X, Clipboard, Link2, Lock, Clock, Loader2 } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { ExpiryOption } from '../types';

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

  return (
    <div
      className={`fixed inset-0 z-[85] flex items-center justify-center p-5 motion-reduce:animate-none ${
        isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-150'
      }`}
      onClick={() => !isEncrypting && onClose()}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-settings-title"
        className={`relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl motion-reduce:animate-none p-6 overflow-y-auto max-h-[calc(100svh-2.5rem)] ${
          isClosing ? 'animate-out zoom-out-95 fade-out duration-150' : 'animate-in zoom-in-95 duration-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 id="link-settings-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            分享連結設定
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isEncrypting}
            aria-label="關閉"
            className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Expiry options */}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            <Clock size={16} aria-hidden="true" />
            連結到期時間
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              [0, '不限制'],
              [600, '10 分鐘'],
              [3600, '1 小時'],
              [86400, '1 天'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setExpiry(val)}
                disabled={isEncrypting}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  expiry === val
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                } disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label
            className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3"
            htmlFor="link-password-input"
          >
            <Lock size={16} aria-hidden="true" />
            連結密碼
            <span className="font-normal text-zinc-400 dark:text-zinc-500">（選填）</span>
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
            placeholder="不設定密碼則留空"
            autoComplete="new-password"
            className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm disabled:opacity-50"
          />
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isEncrypting}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          {isEncrypting ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              加密中…
            </>
          ) : (
            <>
              {action === 'copy' ? (
                <Clipboard size={18} aria-hidden="true" />
              ) : (
                <Link2 size={18} aria-hidden="true" />
              )}
              {action === 'copy' ? '複製連結' : '分享連結'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
