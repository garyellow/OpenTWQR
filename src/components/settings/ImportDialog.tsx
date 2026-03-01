import { useState, useCallback } from 'react';
import { Check, Loader2, Lock, AlertCircle, Pencil } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useBanksStore } from '../../stores/useBanksStore';
import type { BankAccount } from '../../types';
import { AnimatedModal } from '../ui/AnimatedModal';
import { importBackup, isPasswordProtected } from '../../utils/backup';
import { haptic } from '../../utils/haptics';
import { generateId } from '../../utils/generateId';

interface ImportDialogProps {
  onClose: () => void;
  /** Optional: pre-fill the import text (e.g. from Web Share Target) */
  initialText?: string;
}

interface ImportCandidate {
  original: BankAccount;
  label: string;
  checked: boolean;
  isDuplicate: boolean;
  isEditing: boolean;
}

export const ImportDialog = ({ onClose, initialText = '' }: ImportDialogProps) => {
  const addAccount = useAppStore((s) => s.addAccount);
  const isDuplicate = useAppStore((s) => s.isDuplicate);
  const selectAccount = useAppStore((s) => s.selectAccount);
  const accounts = useAppStore((s) => s.accounts);
  const banks = useBanksStore((s) => s.banks);

  const [input, setInput] = useState(initialText);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  // Phase 2: preview
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);

  // Phase 3: success
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const getBankName = useCallback(
    (code: string) => banks.find((b) => b.code === code)?.name ?? code,
    [banks],
  );

  /* --- Phase 1: Decrypt --- */
  const handleDecrypt = useCallback(async () => {
    if (!input.trim()) {
      setError('請貼上備份字串');
      return;
    }

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

    // Build candidate list
    const items: ImportCandidate[] = result.accounts.map((acc) => {
      const dup = isDuplicate(acc.bankCode, acc.accountNumber);
      return {
        original: acc,
        label: acc.label || '',
        checked: !dup,
        isDuplicate: dup,
        isEditing: false,
      };
    });

    setCandidates(items);
    setIsImporting(false);
    haptic();
  }, [input, password, needsPassword, isDuplicate]);

  /* --- Phase 2: Toggle / edit candidates --- */
  const toggleCandidate = useCallback((index: number) => {
    setCandidates((prev) =>
      prev?.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c)) ?? null,
    );
  }, []);

  const updateCandidateLabel = useCallback((index: number, newLabel: string) => {
    setCandidates((prev) =>
      prev?.map((c, i) => (i === index ? { ...c, label: newLabel } : c)) ?? null,
    );
  }, []);

  const toggleEditing = useCallback((index: number) => {
    setCandidates((prev) =>
      prev?.map((c, i) => (i === index ? { ...c, isEditing: !c.isEditing } : c)) ?? null,
    );
  }, []);

  const selectAll = useCallback(() => {
    setCandidates((prev) => prev?.map((c) => ({ ...c, checked: true })) ?? null);
  }, []);

  const selectNewOnly = useCallback(() => {
    setCandidates((prev) =>
      prev?.map((c) => ({ ...c, checked: !c.isDuplicate })) ?? null,
    );
  }, []);

  /* --- Phase 2 → 3: Import selected --- */
  const handleImportSelected = useCallback(() => {
    if (!candidates) return;

    let added = 0;
    let firstNewId: string | null = null;

    for (const c of candidates) {
      if (!c.checked) continue;
      const newId = generateId();
      addAccount({
        id: newId,
        bankCode: c.original.bankCode,
        accountNumber: c.original.accountNumber,
        label: c.label || undefined,
        iconUrl: c.original.iconUrl || undefined,
      });
      if (!firstNewId) firstNewId = newId;
      added++;
    }

    if (firstNewId && accounts.length === 0) {
      selectAccount(firstNewId);
    }

    setImportedCount(added);
    haptic();
  }, [candidates, addAccount, selectAccount, accounts.length]);

  const checkedCount = candidates?.filter((c) => c.checked).length ?? 0;
  const newCount = candidates?.filter((c) => !c.isDuplicate).length ?? 0;

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

          {/* ---- Phase 1: Input ---- */}
          {candidates === null && importedCount === null && (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
                貼上先前匯出的加密字串
              </p>

              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError('');
                  setNeedsPassword(false);
                }}
                placeholder="OTWQR1-..."
                aria-label="匯入加密字串"
                rows={5}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 break-all resize-none focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs mb-4"
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
                        handleDecrypt();
                      }
                    }}
                    placeholder="輸入匯出時設定的密碼"
                    autoFocus
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs"
                  />
                </div>
              )}

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
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDecrypt}
                  disabled={isImporting || !input.trim()}
                  className="flex-2 py-4 rounded-xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      解密中…
                    </>
                  ) : (
                    '解密'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ---- Phase 2: Preview & Select ---- */}
          {candidates !== null && importedCount === null && (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
                共 {candidates.length} 個帳戶，{newCount} 個為新帳戶
              </p>

              {/* Quick filters */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  全選
                </button>
                <button
                  type="button"
                  onClick={selectNewOnly}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  只選新帳戶
                </button>
              </div>

              {/* Candidate list */}
              <div className="space-y-2 mb-6 max-h-[40svh] overflow-y-auto -mx-1 px-1">
                {candidates.map((c, i) => (
                  <div
                    key={`${c.original.bankCode}-${c.original.accountNumber}-${i}`}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      c.checked
                        ? 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                        : 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-800/50 opacity-60'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={c.checked}
                      aria-label={`${c.checked ? '取消選取' : '選取'} ${getBankName(c.original.bankCode)}`}
                      onClick={() => toggleCandidate(i)}
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                        c.checked
                          ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100'
                          : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                      }`}
                    >
                      {c.checked && <Check size={12} className="text-white dark:text-zinc-900" aria-hidden="true" />}
                    </button>

                    {/* Account info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {getBankName(c.original.bankCode)}
                        </span>
                        {c.isDuplicate && (
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                            已存在
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-wide">
                        {c.original.accountNumber}
                      </p>

                      {/* Label — inline editing */}
                      {c.isEditing ? (
                        <input
                          type="text"
                          value={c.label}
                          onChange={(e) => updateCandidateLabel(i, e.target.value)}
                          onBlur={() => toggleEditing(i)}
                          onKeyDown={(e) => { if (e.key === 'Enter') toggleEditing(i); }}
                          autoFocus
                          placeholder="帳戶暱稱（選填）"
                          className="mt-1.5 w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleEditing(i)}
                          className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-500"
                        >
                          <Pencil size={10} aria-hidden="true" />
                          <span>{c.label || '新增暱稱'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={checkedCount === 0}
                  className="flex-2 py-4 rounded-xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  匯入 {checkedCount} 個帳戶
                </button>
              </div>
            </>
          )}

          {/* ---- Phase 3: Success ---- */}
          {importedCount !== null && (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                </div>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  匯入完成
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  成功匯入 {importedCount} 個帳戶
                </p>
              </div>

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-4 rounded-xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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
