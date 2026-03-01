import { useState, useCallback, useRef, useEffect } from 'react';
import { Copy, Check, Loader2, Lock, AlertCircle, Share2 } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { AnimatedModal } from '../ui/AnimatedModal';
import { exportBackup } from '../../utils/backup';
import { haptic } from '../../utils/haptics';

export const ExportDialog = ({ onClose }: { onClose: () => void }) => {
  const accounts = useAppStore((s) => s.accounts);
  const t = useLocaleStore((s) => s.t);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const canShare = typeof navigator.share === 'function';
  const copyTimerRef = useRef<number | null>(null);
  const shareTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    };
  }, []);

  const handleExport = useCallback(async () => {
    if (accounts.length === 0) {
      setError(t.exportDialog.noAccounts);
      return;
    }

    if (password && password !== confirmPassword) {
      setError(t.exportDialog.passwordMismatch);
      return;
    }

    setIsExporting(true);
    setError('');

    const res = await exportBackup(accounts, password);
    if (res.ok) {
      setResult(res.data);
      haptic();
    } else {
      setError(res.error);
    }
    setIsExporting(false);
  }, [accounts, password, confirmPassword]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      haptic();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.exportDialog.copyFailed);
    }
  }, [result]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.share({ text: result });
      setShared(true);
      haptic();
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      shareTimerRef.current = window.setTimeout(() => setShared(false), 2000);
    } catch (err) {
      // User cancelled the share sheet — not an error
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t.exportDialog.shareFailed);
    }
  }, [result]);

  return (
    <AnimatedModal
      onClose={onClose}
      overlayClass="z-50"
      cardClass="max-w-md max-h-[90svh] overflow-y-auto"
      ariaLabelledby="export-title"
    >
      {(requestClose) => (
        <div className="p-6 sm:p-8">
          <h2
            id="export-title"
            className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2 text-center"
          >
            {t.exportDialog.title}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
            {t.exportDialog.subtitle}
          </p>

          {!result ? (
            <>
              {/* Password fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label
                    htmlFor="export-password"
                    className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
                  >
                    <Lock size={14} aria-hidden="true" />
                    {t.exportDialog.passwordLabel}
                    <span className="font-normal text-zinc-400 dark:text-zinc-500">{t.exportDialog.passwordOptional}</span>
                  </label>
                  <input
                    id="export-password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder={t.exportDialog.passwordPlaceholder}
                    autoComplete="new-password"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs"
                  />
                </div>
                {password && (
                  <div>
                    <label
                      htmlFor="export-confirm-password"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
                    >
                      {t.exportDialog.confirmPasswordLabel}
                    </label>
                    <input
                      id="export-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder={t.exportDialog.confirmPasswordPlaceholder}
                      autoComplete="new-password"
                      className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs"
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                {password
                  ? t.exportDialog.infoWithPassword
                  : t.exportDialog.infoWithoutPassword}
              </p>

              {error && (
                <div role="alert" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm mb-4">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      {t.exportDialog.encrypting}
                    </>
                  ) : (
                    t.exportDialog.export
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Result */}
              <div className="relative mb-4">
                <textarea
                  readOnly
                  value={result}
                  rows={6}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all resize-none focus-visible:outline-hidden"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs flex items-center justify-center gap-2 mb-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {copied ? (
                  <>
                    <Check size={18} aria-hidden="true" className="animate-in zoom-in-75 fade-in duration-150 motion-reduce:animate-none" />
                    {t.exportDialog.copied}
                  </>
                ) : (
                  <>
                    <Copy size={18} aria-hidden="true" />
                    {t.exportDialog.copyEncrypted}
                  </>
                )}
              </button>

              {canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition flex items-center justify-center gap-2 mb-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {shared ? (
                    <>
                      <Check size={18} aria-hidden="true" className="animate-in zoom-in-75 fade-in duration-150 motion-reduce:animate-none" />
                      {t.exportDialog.shared}
                    </>
                  ) : (
                    <>
                      <Share2 size={18} aria-hidden="true" />
                      {t.exportDialog.shareViaApp}
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {t.common.done}
              </button>
            </>
          )}
        </div>
      )}
    </AnimatedModal>
  );
};
