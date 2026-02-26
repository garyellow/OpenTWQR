import { useState, useCallback } from 'react';
import { Download, Upload, Copy, Check, Loader2, Lock, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { AnimatedModal } from '../ui/AnimatedModal';
import { exportBackup, importBackup, isPasswordProtected } from '../../utils/backup';
import { haptic } from '../../utils/haptics';

/**
 * Import/Export section for the Settings page.
 * Provides encrypted backup string generation and import with password support.
 */
export const BackupSection = () => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1 mb-3">
        資料備份
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Upload size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">匯出帳戶</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              產生加密字串，可複製保存或傳送
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Download size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">匯入帳戶</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              貼上加密字串以還原帳戶資料
            </p>
          </div>
        </button>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Export Dialog                                                       */
/* ------------------------------------------------------------------ */

const ExportDialog = ({ onClose }: { onClose: () => void }) => {
  const accounts = useAppStore((s) => s.accounts);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('複製失敗');
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
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm"
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
                      className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm"
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
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm mb-4">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-4 rounded-2xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-[2] py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all resize-none focus-visible:outline-none"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2 mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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

/* ------------------------------------------------------------------ */
/*  Import Dialog                                                      */
/* ------------------------------------------------------------------ */

interface ImportDialogProps {
  onClose: () => void;
  /** Optional: pre-fill the import text (e.g. from empty-state paste) */
  initialText?: string;
}

export const ImportDialog = ({ onClose, initialText = '' }: ImportDialogProps) => {
  const addAccount = useAppStore((s) => s.addAccount);
  const isDuplicate = useAppStore((s) => s.isDuplicate);
  const selectAccount = useAppStore((s) => s.selectAccount);
  const accounts = useAppStore((s) => s.accounts);

  const [input, setInput] = useState(initialText);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);

  const handleImport = useCallback(async () => {
    if (!input.trim()) {
      setError('請貼上備份字串');
      return;
    }

    // Quick check if password is needed
    const isProtected = isPasswordProtected(input);
    if (isProtected === null) {
      setError('無效的備份字串');
      return;
    }

    if (isProtected && !needsPassword) {
      setNeedsPassword(true);
      return;
    }

    setIsImporting(true);
    setError('');

    const result = await importBackup(input, isProtected ? password : undefined);

    if (!result.ok) {
      switch (result.error) {
        case 'need-password':
          setNeedsPassword(true);
          break;
        case 'wrong-password':
          setError('密碼錯誤');
          break;
        case 'invalid':
          setError('無效的備份字串');
          break;
        case 'decrypt-error':
          setError('解密失敗，字串可能已損壞');
          break;
      }
      setIsImporting(false);
      return;
    }

    // Merge accounts, skip duplicates
    let added = 0;
    let skipped = 0;
    let firstNewId: string | null = null;

    for (const acc of result.accounts) {
      if (isDuplicate(acc.bankCode, acc.accountNumber)) {
        skipped++;
        continue;
      }
      // Generate new ID to avoid conflicts
      const newId = crypto.randomUUID();
      addAccount({ ...acc, id: newId });
      if (!firstNewId) firstNewId = newId;
      added++;
    }

    // Select the first newly added account if no account was previously selected
    if (firstNewId && accounts.length === 0) {
      selectAccount(firstNewId);
    }

    setImportedCount(added);
    setSkippedCount(skipped);
    setIsImporting(false);
    haptic();
  }, [input, password, needsPassword, isDuplicate, addAccount, selectAccount, accounts.length]);

  return (
    <AnimatedModal
      onClose={onClose}
      overlayClass="z-50"
      cardClass="max-w-md max-h-[90svh] overflow-y-auto"
      ariaLabelledby="import-title"
    >
      {(requestClose) => (
        <div className="p-6 sm:p-8">
          <h2
            id="import-title"
            className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2 text-center"
          >
            匯入帳戶
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
            貼上先前匯出的加密字串
          </p>

          {importedCount === null ? (
            <>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError('');
                  setNeedsPassword(false);
                }}
                placeholder="OTWQR1-..."
                rows={5}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-sm font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 break-all resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm mb-4"
              />

              {needsPassword && (
                <div className="mb-4">
                  <label
                    htmlFor="import-password"
                    className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
                  >
                    <Lock size={14} aria-hidden="true" />
                    輸入密碼
                  </label>
                  <input
                    id="import-password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isImporting) {
                        e.preventDefault();
                        handleImport();
                      }
                    }}
                    placeholder="輸入匯出時設定的密碼"
                    autoFocus
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm mb-4">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-4 rounded-2xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting || !input.trim()}
                  className="flex-[2] py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      解密中…
                    </>
                  ) : (
                    '匯入'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  匯入完成
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  成功匯入 {importedCount} 個帳戶
                  {skippedCount > 0 && `，略過 ${skippedCount} 個重複帳戶`}
                </p>
              </div>

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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
