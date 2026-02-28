import { useState, useCallback, useRef, useEffect } from 'react';
import { Copy, Check, Loader2, Lock, AlertCircle, Share2 } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { AnimatedModal } from '../ui/AnimatedModal';
import { exportBackup } from '../../utils/backup';
import { haptic } from '../../utils/haptics';

export const ExportDialog = ({ onClose }: { onClose: () => void }) => {
  const accounts = useAppStore((s) => s.accounts);
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
      setError('沒有帳戶可以匯出');
      return;
    }

    if (password && password !== confirmPassword) {
      setError('密碼不一致');
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
      setError('複製失敗');
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
      setError('分享失敗');
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
            匯出帳戶
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
            所有帳戶將被加密為一段字串
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
                    設定密碼
                    <span className="font-normal text-zinc-400 dark:text-zinc-500">（選填）</span>
                  </label>
                  <input
                    id="export-password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="不設定密碼則留空"
                    autoComplete="new-password"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs"
                  />
                </div>
                {password && (
                  <div>
                    <label
                      htmlFor="export-confirm-password"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
                    >
                      確認密碼
                    </label>
                    <input
                      id="export-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="再次輸入密碼"
                      autoComplete="new-password"
                      className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs"
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4 leading-relaxed">
                {password
                  ? '你的帳戶資料將以 AES-256 加密，匯入時需輸入密碼。'
                  : '不設定密碼時，任何人取得此字串皆可匯入。'}
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
                  className="flex-1 py-4 rounded-2xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-2 py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      加密中…
                    </>
                  ) : (
                    '匯出'
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
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all resize-none focus-visible:outline-hidden"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 action-transition shadow-xs flex items-center justify-center gap-2 mb-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {copied ? (
                  <>
                    <Check size={18} aria-hidden="true" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy size={18} aria-hidden="true" />
                    複製加密字串
                  </>
                )}
              </button>

              {canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-4 rounded-2xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition flex items-center justify-center gap-2 mb-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {shared ? (
                    <>
                      <Check size={18} aria-hidden="true" />
                      已分享
                    </>
                  ) : (
                    <>
                      <Share2 size={18} aria-hidden="true" />
                      透過其他 App 分享
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                完成
              </button>
            </>
          )}
        </div>
      )}
    </AnimatedModal>
  );
};
