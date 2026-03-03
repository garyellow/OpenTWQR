import { useState, useCallback, useMemo } from 'react';
import { Check, Loader2, Lock, AlertCircle, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useThemeStore, applyTheme, applyAccentHue } from '../../stores/useThemeStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useBanksStore } from '../../stores/useBanksStore';
import type { BankAccount } from '../../types';
import type { BankUrlConfig } from '../../stores/useUrlSchemeStore';
import { AnimatedModal } from '../ui/AnimatedModal';
import { importBackup, isPasswordProtected } from '../../utils/backup';
import type { BackupStyle, BackupPreferences } from '../../utils/backup';
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

/**
 * Apply style categories from backup to stores.
 */
function applyBackupStyle(s: BackupStyle, sel: { accent: boolean; qr: boolean }) {
  if (sel.accent && (s.accentHue !== undefined || s.accentEnabled !== undefined)) {
    const ts = useThemeStore.getState();
    if (s.accentHue !== undefined) {
      ts.setAccentHue(s.accentHue);
      applyAccentHue(s.accentHue);
    }
    if (s.accentEnabled !== undefined) {
      ts.setAccentEnabled(s.accentEnabled);
    }
  }
  if (sel.qr && s.qr) {
    const qs = useQRSettingsStore.getState();
    qs.setLogoType(s.qr.logoType);
    qs.setShowAccount(s.qr.showAccount);
    qs.setShowBankName(s.qr.showBankName);
    qs.setCustomName(s.qr.customName);
    qs.setDotStyle(s.qr.dotStyle);
    qs.setEyeStyle(s.qr.eyeStyle);
    qs.setErrorLevel(s.qr.errorLevel);
  }
}

/**
 * Apply preferences categories from backup to stores.
 */
function applyBackupPreferences(p: BackupPreferences, sel: { mode: boolean; locale: boolean }) {
  if (sel.mode && p.mode !== undefined) {
    const ts = useThemeStore.getState();
    ts.setMode(p.mode);
    applyTheme(p.mode);
  }
  if (sel.locale && p.locale !== undefined) {
    const ls = useLocaleStore.getState();
    ls.setLocale(p.locale);
  }
}

export const ImportDialog = ({ onClose, initialText = '' }: ImportDialogProps) => {
  const addAccount = useAppStore((s) => s.addAccount);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const isDuplicate = useAppStore((s) => s.isDuplicate);
  const selectAccount = useAppStore((s) => s.selectAccount);
  const accounts = useAppStore((s) => s.accounts);
  const banks = useBanksStore((s) => s.banks);
  const t = useLocaleStore((s) => s.t);
  const existingUrlConfigs = useUrlSchemeStore((s) => s.configs);

  const [input, setInput] = useState(initialText);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  // Phase 2: preview
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [includeAccounts, setIncludeAccounts] = useState(true);

  // Style from backup
  const [importedStyle, setImportedStyle] = useState<BackupStyle | null>(null);
  const [styleSelection, setStyleSelection] = useState({ accent: true, qr: true });
  const [styleExpanded, setStyleExpanded] = useState(false);

  // Preferences from backup
  const [importedPreferences, setImportedPreferences] = useState<BackupPreferences | null>(null);
  const [prefsSelection, setPrefsSelection] = useState({ mode: true, locale: true });
  const [prefsExpanded, setPrefsExpanded] = useState(false);

  // Payment links from backup
  const [importedPaymentLinks, setImportedPaymentLinks] = useState<BankUrlConfig[] | null>(null);
  const [includePaymentLinks, setIncludePaymentLinks] = useState(true);
  // Per-item conflict decisions: bankCode → 'overwrite' | 'keep'
  const [paymentLinkDecisions, setPaymentLinkDecisions] = useState<Record<string, 'overwrite' | 'keep'>>({});

  // Phase 3: success
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [settingsApplied, setSettingsApplied] = useState(false);

  const getBankName = useCallback(
    (code: string) => banks.find((b) => b.code === code)?.name ?? code,
    [banks],
  );

  // Derived helpers for Style
  const hasStyleAccent = importedStyle && (importedStyle.accentHue !== undefined || importedStyle.accentEnabled !== undefined);
  const hasStyleQR = importedStyle?.qr !== undefined;
  const anyStyleSelected = importedStyle && (
    (hasStyleAccent && styleSelection.accent) || (hasStyleQR && styleSelection.qr)
  );
  const allStyleSelected = importedStyle && (
    (!hasStyleAccent || styleSelection.accent) && (!hasStyleQR || styleSelection.qr)
  );
  const toggleAllStyle = useCallback(() => {
    const newVal = !allStyleSelected;
    setStyleSelection({ accent: newVal, qr: newVal });
  }, [allStyleSelected]);

  // Derived helpers for Preferences
  const hasPrefsMode = importedPreferences?.mode !== undefined;
  const hasPrefsLocale = importedPreferences?.locale !== undefined;
  const anyPrefsSelected = importedPreferences && (
    (hasPrefsMode && prefsSelection.mode) || (hasPrefsLocale && prefsSelection.locale)
  );
  const allPrefsSelected = importedPreferences && (
    (!hasPrefsMode || prefsSelection.mode) && (!hasPrefsLocale || prefsSelection.locale)
  );
  const toggleAllPrefs = useCallback(() => {
    const newVal = !allPrefsSelected;
    setPrefsSelection({ mode: newVal, locale: newVal });
  }, [allPrefsSelected]);

  // Conflict detection for payment links
  const existingCodes = useMemo(
    () => new Set(existingUrlConfigs.map((c) => c.bankCode)),
    [existingUrlConfigs],
  );
  const conflictingLinks = importedPaymentLinks?.filter((l) => existingCodes.has(l.bankCode)) ?? [];
  const nonConflictingLinks = importedPaymentLinks?.filter((l) => !existingCodes.has(l.bankCode)) ?? [];

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
          setError(t.importDialog.importError);
          break;
      }
      setIsImporting(false);
      return;
    }

    // Build candidate list from accounts (if present)
    if (result.accounts && result.accounts.length > 0) {
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
      setIncludeAccounts(true);
    }

    // Capture style (if present)
    if (result.style) {
      setImportedStyle(result.style);
      setStyleSelection({ accent: true, qr: true });
    }

    // Capture preferences (if present)
    if (result.preferences) {
      setImportedPreferences(result.preferences);
      setPrefsSelection({ mode: true, locale: true });
    }

    // Capture payment links (if present)
    if (result.paymentLinks && result.paymentLinks.length > 0) {
      setImportedPaymentLinks(result.paymentLinks);
      setIncludePaymentLinks(true);
      // Default: 'overwrite' for conflicts
      const defaultDecisions: Record<string, 'overwrite' | 'keep'> = {};
      for (const link of result.paymentLinks) {
        if (existingCodes.has(link.bankCode)) {
          defaultDecisions[link.bankCode] = 'overwrite';
        }
      }
      setPaymentLinkDecisions(defaultDecisions);
    }

    setIsImporting(false);
    haptic();
  }, [input, password, needsPassword, isDuplicate, existingCodes, t]);

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
   */
  const handleImportSelected = useCallback(() => {
    let processed = 0;
    let firstNewId: string | null = null;

    // Import accounts if user chose to include them
    if (candidates && includeAccounts) {
      for (const c of candidates) {
        if (!c.checked) continue;

        if (!c.isDuplicate) {
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
              updateAccount(existing.id, { label: incomingLabel });
              processed++;
            }
          }
        }
      }
    }

    if (firstNewId && accounts.length === 0) {
      selectAccount(firstNewId);
    }

    // Apply style
    let didApplySettings = false;
    if (importedStyle && anyStyleSelected) {
      applyBackupStyle(importedStyle, styleSelection);
      didApplySettings = true;
    }

    // Apply preferences
    if (importedPreferences && anyPrefsSelected) {
      applyBackupPreferences(importedPreferences, prefsSelection);
      didApplySettings = true;
    }

    // Apply payment links
    if (importedPaymentLinks && includePaymentLinks) {
      const us = useUrlSchemeStore.getState();
      for (const link of importedPaymentLinks) {
        const isConflict = existingCodes.has(link.bankCode);
        if (!isConflict) {
          us.addConfig(link);
          didApplySettings = true;
        } else {
          const decision = paymentLinkDecisions[link.bankCode] ?? 'overwrite';
          if (decision === 'overwrite') {
            us.addConfig(link); // addConfig should overwrite existing for same bankCode
            didApplySettings = true;
          }
          // else 'keep' → skip
        }
      }
    }

    setImportedCount(processed);
    setSettingsApplied(didApplySettings);
    haptic();
  }, [
    candidates, includeAccounts, addAccount, updateAccount, selectAccount, accounts,
    importedStyle, anyStyleSelected, styleSelection,
    importedPreferences, anyPrefsSelected, prefsSelection,
    importedPaymentLinks, includePaymentLinks, paymentLinkDecisions, existingCodes,
  ]);

  const checkedCount = candidates?.filter((c) => c.checked).length ?? 0;
  const newCount = candidates?.filter((c) => !c.isDuplicate).length ?? 0;
  const hasAnythingToImport =
    (candidates && includeAccounts && checkedCount > 0) ||
    anyStyleSelected ||
    anyPrefsSelected ||
    (importedPaymentLinks && includePaymentLinks && importedPaymentLinks.length > 0);

  // Phase control: phase 1 = nothing loaded yet; phase 2 = preview; phase 3 = success
  const isPhase2 = (candidates !== null || importedStyle !== null || importedPreferences !== null || importedPaymentLinks !== null) && importedCount === null;
  const isPhase1 = !isPhase2 && importedCount === null;

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
          {isPhase1 && (
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
                className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 break-all resize-none focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs mb-4"
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
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
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
                      {t.importDialog.importing}
                    </>
                  ) : (
                    t.importDialog.import
                  )}
                </button>
              </div>
            </>
          )}

          {/* ---- Phase 2: Preview & Select ---- */}
          {isPhase2 && (
            <>
              {/* Accounts section */}
              {candidates && candidates.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={includeAccounts}
                      onClick={() => setIncludeAccounts(!includeAccounts)}
                      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                        includeAccounts
                          ? 'border-transparent'
                          : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                      }`}
                      style={includeAccounts ? {
                        backgroundColor: 'light-dark(var(--accent), var(--accent-dark))',
                        borderColor: 'light-dark(var(--accent), var(--accent-dark))',
                      } : undefined}
                    >
                      {includeAccounts && <Check size={12} className="text-white dark:text-zinc-900" aria-hidden="true" />}
                    </button>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t.importDialog.catAccounts}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t.importDialog.summary(candidates.length, newCount)}
                    </span>
                  </div>

                  {includeAccounts && (
                    <>
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
                      <div className="space-y-2 mb-4 max-h-[30svh] overflow-y-auto -mx-1 px-1">
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
                    </>
                  )}
                </>
              )}

              {/* Style section */}
              {importedStyle && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-3">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={!!anyStyleSelected}
                    onClick={toggleAllStyle}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleAllStyle(); } }}
                    className={`flex items-center gap-3 p-3 cursor-pointer select-none transition-colors ${
                      anyStyleSelected
                        ? 'bg-white dark:bg-zinc-900/50'
                        : 'bg-zinc-50 dark:bg-zinc-900/20 opacity-60'
                    }`}
                  >
                    <ImportCheckboxIcon checked={!!allStyleSelected} indeterminate={!!anyStyleSelected && !allStyleSelected} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {t.importDialog.catStyle}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setStyleExpanded(!styleExpanded); }}
                      className="p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                      aria-label={styleExpanded ? t.common.collapse : t.common.expand}
                    >
                      {styleExpanded
                        ? <ChevronDown size={16} aria-hidden="true" />
                        : <ChevronRight size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  {styleExpanded && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800/50 pl-5">
                      {hasStyleAccent && (
                        <ImportSubCheckbox
                          checked={styleSelection.accent}
                          onChange={() => setStyleSelection((p) => ({ ...p, accent: !p.accent }))}
                          label={t.importDialog.catStyleAccent}
                        />
                      )}
                      {hasStyleQR && (
                        <ImportSubCheckbox
                          checked={styleSelection.qr}
                          onChange={() => setStyleSelection((p) => ({ ...p, qr: !p.qr }))}
                          label={t.importDialog.catStyleQR}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Preferences section */}
              {importedPreferences && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-3">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={!!anyPrefsSelected}
                    onClick={toggleAllPrefs}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleAllPrefs(); } }}
                    className={`flex items-center gap-3 p-3 cursor-pointer select-none transition-colors ${
                      anyPrefsSelected
                        ? 'bg-white dark:bg-zinc-900/50'
                        : 'bg-zinc-50 dark:bg-zinc-900/20 opacity-60'
                    }`}
                  >
                    <ImportCheckboxIcon checked={!!allPrefsSelected} indeterminate={!!anyPrefsSelected && !allPrefsSelected} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {t.importDialog.catPreferences}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPrefsExpanded(!prefsExpanded); }}
                      className="p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                      aria-label={prefsExpanded ? t.common.collapse : t.common.expand}
                    >
                      {prefsExpanded
                        ? <ChevronDown size={16} aria-hidden="true" />
                        : <ChevronRight size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  {prefsExpanded && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800/50 pl-5">
                      {hasPrefsMode && (
                        <ImportSubCheckbox
                          checked={prefsSelection.mode}
                          onChange={() => setPrefsSelection((p) => ({ ...p, mode: !p.mode }))}
                          label={t.importDialog.catPrefsMode}
                        />
                      )}
                      {hasPrefsLocale && (
                        <ImportSubCheckbox
                          checked={prefsSelection.locale}
                          onChange={() => setPrefsSelection((p) => ({ ...p, locale: !p.locale }))}
                          label={t.importDialog.catPrefsLocale}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment links section */}
              {importedPaymentLinks && importedPaymentLinks.length > 0 && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={includePaymentLinks}
                    onClick={() => setIncludePaymentLinks(!includePaymentLinks)}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIncludePaymentLinks(!includePaymentLinks); } }}
                    className={`flex items-center gap-3 p-3 cursor-pointer select-none transition-colors ${
                      includePaymentLinks
                        ? 'bg-white dark:bg-zinc-900/50'
                        : 'bg-zinc-50 dark:bg-zinc-900/20 opacity-60'
                    }`}
                  >
                    <ImportCheckboxIcon checked={includePaymentLinks} />
                    <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t.importDialog.catPaymentLinks(importedPaymentLinks.length)}
                    </span>
                  </div>

                  {/* Per-item conflict resolution */}
                  {includePaymentLinks && conflictingLinks.length > 0 && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800/50">
                      {conflictingLinks.map((link) => (
                        <div key={link.bankCode} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 truncate">
                            {getBankName(link.bankCode)}
                          </span>
                          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                            {t.importDialog.paymentLinkConflict}
                          </span>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPaymentLinkDecisions((p) => ({ ...p, [link.bankCode]: 'overwrite' }))}
                              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                                (paymentLinkDecisions[link.bankCode] ?? 'overwrite') === 'overwrite'
                                  ? 'chip-accent'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {t.importDialog.paymentLinkOverwrite}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentLinkDecisions((p) => ({ ...p, [link.bankCode]: 'keep' }))}
                              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                                paymentLinkDecisions[link.bankCode] === 'keep'
                                  ? 'chip-accent'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {t.importDialog.paymentLinkKeep}
                            </button>
                          </div>
                        </div>
                      ))}
                      {nonConflictingLinks.length > 0 && (
                        <div className="px-3 pb-2">
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {t.importDialog.paymentLinksNewDesc(nonConflictingLinks.length)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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
                  onClick={handleImportSelected}
                  disabled={!hasAnythingToImport}
                  className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.importDialog.confirmImport}
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
                {settingsApplied && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t.importDialog.settingsApplied}
                  </p>
                )}
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

/* ------------------------------------------------------------------ */
/*  Shared checkbox components                                         */
/* ------------------------------------------------------------------ */

function ImportCheckboxIcon({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  const active = checked || indeterminate;
  return (
    <span
      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        active ? 'border-transparent' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
      }`}
      style={active ? {
        backgroundColor: 'light-dark(var(--accent), var(--accent-dark))',
        borderColor: 'light-dark(var(--accent), var(--accent-dark))',
      } : undefined}
    >
      {checked && <Check size={12} className="text-white dark:text-zinc-900" aria-hidden="true" />}
      {indeterminate && !checked && (
        <span className="w-2.5 h-0.5 rounded-full bg-white dark:bg-zinc-900" />
      )}
    </span>
  );
}

function ImportSubCheckbox({ checked, onChange, label }: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={checked}
      onClick={onChange}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(); } }}
      className={`flex items-center gap-3 p-2.5 cursor-pointer select-none transition-colors ${
        checked ? '' : 'opacity-50'
      }`}
    >
      <ImportCheckboxIcon checked={checked} />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </div>
  );
}
