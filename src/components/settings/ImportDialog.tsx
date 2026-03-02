import { useState, useCallback } from 'react';
import { Check, Loader2, Lock, AlertCircle, Pencil } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
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
  const updateAccount = useAppStore((s) => s.updateAccount);
  const isDuplicate = useAppStore((s) => s.isDuplicate);
  const selectAccount = useAppStore((s) => s.selectAccount);
  const accounts = useAppStore((s) => s.accounts);
  const banks = useBanksStore((s) => s.banks);
  const t = useLocaleStore((s) => s.t);

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
      setError(t.importDialog.emptyInput);
      return;
    }

    const isProtected = isPasswordProtected(input);
    if (isProtected === null) {
      setError(t.importDialog.invalidString);
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
          setError(t.importDialog.wrongPassword);
          break;
        case 'invalid':
          setError(t.importDialog.invalidString);
          break;
        case 'decrypt-error':
          setError(t.importDialog.decryptError);
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
  }, [input, password, needsPassword, isDuplicate, t]);

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

  /**
   * Phase 2 → 3: Commit selected candidates.
   * - New accounts are added with a fresh generated ID.
   * - Existing accounts (same bankCode + accountNumber) have their label
   *   overwritten only when the incoming label differs from the stored one;
   *   identical accounts are silently skipped.
   * `processed` counts both additions and label updates so the success screen
   * accurately reflects the number of changes made.
   */
  const handleImportSelected = useCallback(() => {
    if (!candidates) return;

    let processed = 0;
    let firstNewId: string | null = null;

    for (const c of candidates) {
      if (!c.checked) continue;

      if (!c.isDuplicate) {
        // New account — add with a fresh id
        const newId = generateId();
        addAccount({
          id: newId,
          bankCode: c.original.bankCode,
          accountNumber: c.original.accountNumber,
          label: c.label || undefined,
          iconUrl: c.original.iconUrl || undefined,
        });
        if (!firstNewId) firstNewId = newId;
        processed++;
      } else {
        // Existing account — find by bankCode + accountNumber and update label
        const normalised = c.original.accountNumber.replace(/^0+/, '');
        const existing = accounts.find(
          (a) =>
            a.bankCode === c.original.bankCode &&
            a.accountNumber.replace(/^0+/, '') === normalised,
        );
        if (existing) {
          const incomingLabel = c.label || undefined;
          const existingLabel = existing.label || undefined;
          if (incomingLabel !== existingLabel) {
            // Labels differ — overwrite
            updateAccount(existing.id, { label: incomingLabel });
            processed++;
          }
          // else: identical — no-op, no count
        }
      }
    }

    // accounts.length reflects the pre-import snapshot (closure capture).
    // Auto-select the first newly added account only if the list was empty before.
    if (firstNewId && accounts.length === 0) {
      selectAccount(firstNewId);
    }

    setImportedCount(processed);
    haptic();
  }, [candidates, addAccount, updateAccount, selectAccount, accounts]);

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
            {t.importDialog.title}
          </h2>

          {/* ---- Phase 1: Input ---- */}
          {candidates === null && importedCount === null && (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
                {t.importDialog.subtitle}
              </p>

              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError('');
                  setNeedsPassword(false);
                }}
                placeholder={t.importDialog.inputPlaceholder}
                aria-label={t.importDialog.inputLabel}
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
                    {t.importDialog.passwordLabel}
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
                    placeholder={t.importDialog.passwordPlaceholder}
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
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDecrypt}
                  disabled={isImporting || !input.trim()}
                  className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      {t.importDialog.decrypting}
                    </>
                  ) : (
                    t.importDialog.decrypt
                  )}
                </button>
              </div>
            </>
          )}

          {/* ---- Phase 2: Preview & Select ---- */}
          {candidates !== null && importedCount === null && (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
                {t.importDialog.summary(candidates.length, newCount)}
              </p>

              {/* Quick filters */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.importDialog.selectAll}
                </button>
                <button
                  type="button"
                  onClick={selectNewOnly}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.importDialog.selectNewOnly}
                </button>
              </div>

              {/* Candidate list */}
              <div className="space-y-2 mb-6 max-h-[40svh] overflow-y-auto -mx-1 px-1">
                {candidates.map((c, i) => (
                  <div
                    key={`${c.original.bankCode}-${c.original.accountNumber}-${i}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={c.checked}
                    aria-label={t.importDialog.selectLabel(c.checked, getBankName(c.original.bankCode))}
                    onClick={() => toggleCandidate(i)}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleCandidate(i); } }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer select-none ${
                      c.checked
                        ? 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                        : 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-800/50 opacity-60'
                    }`}
                  >
                    {/* Checkbox — click handled by parent card row */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={c.checked}
                      aria-label={t.importDialog.selectLabel(c.checked, getBankName(c.original.bankCode))}
                      onClick={(e) => e.stopPropagation()}
                      tabIndex={-1}
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                        c.checked
                          ? 'border-transparent'
                          : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                      }`}
                      style={c.checked ? {
                        backgroundColor: 'light-dark(var(--accent), var(--accent-dark))',
                        borderColor: 'light-dark(var(--accent), var(--accent-dark))',
                      } : undefined}
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
                            {t.importDialog.existing}
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
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); toggleEditing(i); } }}
                          autoFocus
                          placeholder={t.importDialog.nicknamePlaceholder}
                          className="mt-1.5 w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleEditing(i); }}
                          className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-500"
                        >
                          <Pencil size={10} aria-hidden="true" />
                          <span>{c.label || t.importDialog.addNickname}</span>
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
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={checkedCount === 0}
                  className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.importDialog.importCount(checkedCount)}
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
                  {t.importDialog.successTitle}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t.importDialog.successDesc(importedCount)}
                </p>
              </div>

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
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
