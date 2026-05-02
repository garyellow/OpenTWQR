import { useState, useCallback, useMemo, useEffect } from 'react';
import { Check, Loader2, Lock, AlertCircle, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useThemeStore, applyTheme } from '../../stores/useThemeStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useBanksStore } from '../../stores/useBanksStore';
import type { BankAccount } from '../../types';
import type { BankUrlConfig } from '../../stores/useUrlSchemeStore';
import { importBackup, isPasswordProtected } from '../../utils/backup';
import type { BackupStyle, BackupPreferences } from '../../utils/backup';
import { haptic } from '../../utils/haptics';
import { generateId } from '../../utils/generateId';
import { shouldAutoFocusTextInput } from '../../utils/shouldAutoFocusTextInput';

interface ImportTaskContentProps {
  onCancel: () => void;
  onComplete: () => void;
  initialText?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface ImportCandidate {
  original: BankAccount;
  label: string;
  checked: boolean;
  isDuplicate: boolean;
  isEditing: boolean;
}

function applyBackupStyle(style: BackupStyle, selection: { accent: boolean; qr: boolean }) {
  if (selection.accent && (style.accentHue !== undefined || style.accentEnabled !== undefined)) {
    const themeState = useThemeStore.getState();
    if (style.accentHue !== undefined) {
      themeState.setAccentHue(style.accentHue);
    }
    if (style.accentEnabled !== undefined) {
      themeState.setAccentEnabled(style.accentEnabled);
    }
  }

  if (selection.qr && style.qr) {
    const qrState = useQRSettingsStore.getState();
    qrState.setLogoType(style.qr.logoType);
    qrState.setShowAccount(style.qr.showAccount);
    qrState.setShowBankName(style.qr.showBankName);
    qrState.setCustomName(style.qr.customName);
    qrState.setDotStyle(style.qr.dotStyle);
    qrState.setEyeStyle(style.qr.eyeStyle);
  }
}

function applyBackupPreferences(preferences: BackupPreferences, selection: { mode: boolean; locale: boolean }) {
  if (selection.mode && preferences.mode !== undefined) {
    const themeState = useThemeStore.getState();
    themeState.setMode(preferences.mode);
    applyTheme(preferences.mode);
  }

  if (selection.locale && preferences.locale !== undefined) {
    const localeState = useLocaleStore.getState();
    localeState.setLocale(preferences.locale);
  }
}

export const ImportTaskContent = ({
  onCancel,
  onComplete,
  initialText = '',
  onDirtyChange,
}: ImportTaskContentProps) => {
  const addAccount = useAppStore((s) => s.addAccount);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const isDuplicate = useAppStore((s) => s.isDuplicate);
  const selectAccount = useAppStore((s) => s.selectAccount);
  const accounts = useAppStore((s) => s.accounts);
  const banks = useBanksStore((s) => s.banks);
  const t = useLocaleStore((s) => s.t);
  const existingUrlConfigs = useUrlSchemeStore((s) => s.configs);
  const allowAutoFocus = useMemo(() => shouldAutoFocusTextInput(), []);

  const [input, setInput] = useState(initialText);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [includeAccounts, setIncludeAccounts] = useState(true);

  const [importedStyle, setImportedStyle] = useState<BackupStyle | null>(null);
  const [styleSelection, setStyleSelection] = useState({ accent: true, qr: true });
  const [styleExpanded, setStyleExpanded] = useState(false);

  const [importedPreferences, setImportedPreferences] = useState<BackupPreferences | null>(null);
  const [prefsSelection, setPrefsSelection] = useState({ mode: true, locale: true });
  const [prefsExpanded, setPrefsExpanded] = useState(false);

  const [importedPaymentLinks, setImportedPaymentLinks] = useState<BankUrlConfig[] | null>(null);
  const [includePaymentLinks, setIncludePaymentLinks] = useState(true);
  const [paymentLinkDecisions, setPaymentLinkDecisions] = useState<Record<string, 'overwrite' | 'keep'>>({});

  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [settingsApplied, setSettingsApplied] = useState(false);

  const isDirty = importedCount === null && Boolean(
    input.trim() ||
    password ||
    needsPassword ||
    candidates !== null ||
    importedStyle !== null ||
    importedPreferences !== null ||
    importedPaymentLinks !== null ||
    styleExpanded ||
    prefsExpanded
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const getBankName = useCallback(
    (code: string) => banks.find((bank) => bank.code === code)?.name ?? code,
    [banks],
  );

  const hasStyleAccent = importedStyle && (importedStyle.accentHue !== undefined || importedStyle.accentEnabled !== undefined);
  const hasStyleQR = importedStyle?.qr !== undefined;
  const anyStyleSelected = importedStyle && (
    (hasStyleAccent && styleSelection.accent) || (hasStyleQR && styleSelection.qr)
  );
  const allStyleSelected = importedStyle && (
    (!hasStyleAccent || styleSelection.accent) && (!hasStyleQR || styleSelection.qr)
  );

  const hasPrefsMode = importedPreferences?.mode !== undefined;
  const hasPrefsLocale = importedPreferences?.locale !== undefined;
  const anyPrefsSelected = importedPreferences && (
    (hasPrefsMode && prefsSelection.mode) || (hasPrefsLocale && prefsSelection.locale)
  );
  const allPrefsSelected = importedPreferences && (
    (!hasPrefsMode || prefsSelection.mode) && (!hasPrefsLocale || prefsSelection.locale)
  );

  const existingCodes = useMemo(
    () => new Set(existingUrlConfigs.map((config) => config.bankCode)),
    [existingUrlConfigs],
  );
  const conflictingLinks = importedPaymentLinks?.filter((link) => existingCodes.has(link.bankCode)) ?? [];
  const nonConflictingLinks = importedPaymentLinks?.filter((link) => !existingCodes.has(link.bankCode)) ?? [];

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
        case 'unsupported-browser':
          setError(t.importDialog.unsupportedBrowser);
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

    if (result.accounts && result.accounts.length > 0) {
      const items: ImportCandidate[] = result.accounts.map((account) => {
        const duplicate = isDuplicate(account.bankCode, account.accountNumber);
        return {
          original: account,
          label: account.label || '',
          checked: !duplicate,
          isDuplicate: duplicate,
          isEditing: false,
        };
      });
      setCandidates(items);
      setIncludeAccounts(true);
    }

    if (result.style) {
      setImportedStyle(result.style);
      setStyleSelection({ accent: true, qr: true });
    }

    if (result.preferences) {
      setImportedPreferences(result.preferences);
      setPrefsSelection({ mode: true, locale: true });
    }

    if (result.paymentLinks && result.paymentLinks.length > 0) {
      setImportedPaymentLinks(result.paymentLinks);
      setIncludePaymentLinks(true);
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
  }, [existingCodes, input, isDuplicate, needsPassword, password, t]);

  const toggleCandidate = useCallback((index: number) => {
    setCandidates((prev) =>
      prev?.map((candidate, candidateIndex) => (
        candidateIndex === index ? { ...candidate, checked: !candidate.checked } : candidate
      )) ?? null,
    );
  }, []);

  const updateCandidateLabel = useCallback((index: number, newLabel: string) => {
    setCandidates((prev) =>
      prev?.map((candidate, candidateIndex) => (
        candidateIndex === index ? { ...candidate, label: newLabel } : candidate
      )) ?? null,
    );
  }, []);

  const toggleEditing = useCallback((index: number) => {
    setCandidates((prev) =>
      prev?.map((candidate, candidateIndex) => (
        candidateIndex === index ? { ...candidate, isEditing: !candidate.isEditing } : candidate
      )) ?? null,
    );
  }, []);

  const selectAll = useCallback(() => {
    setCandidates((prev) => prev?.map((candidate) => ({ ...candidate, checked: true })) ?? null);
  }, []);

  const selectNewOnly = useCallback(() => {
    setCandidates((prev) =>
      prev?.map((candidate) => ({ ...candidate, checked: !candidate.isDuplicate })) ?? null,
    );
  }, []);

  const handleImportSelected = useCallback(() => {
    let processed = 0;
    let firstNewId: string | null = null;

    if (candidates && includeAccounts) {
      for (const candidate of candidates) {
        if (!candidate.checked) continue;

        if (!candidate.isDuplicate) {
          const newId = generateId();
          addAccount({
            id: newId,
            bankCode: candidate.original.bankCode,
            accountNumber: candidate.original.accountNumber,
            label: candidate.label || undefined,
            iconUrl: candidate.original.iconUrl || undefined,
          });
          if (!firstNewId) firstNewId = newId;
          processed++;
        } else {
          const normalized = candidate.original.accountNumber.replace(/^0+/, '');
          const existing = accounts.find(
            (account) =>
              account.bankCode === candidate.original.bankCode &&
              account.accountNumber.replace(/^0+/, '') === normalized,
          );
          if (existing) {
            const incomingLabel = candidate.label || undefined;
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

    let didApplySettings = false;
    if (importedStyle && anyStyleSelected) {
      applyBackupStyle(importedStyle, styleSelection);
      didApplySettings = true;
    }

    if (importedPreferences && anyPrefsSelected) {
      applyBackupPreferences(importedPreferences, prefsSelection);
      didApplySettings = true;
    }

    if (importedPaymentLinks && includePaymentLinks) {
      const urlSchemeState = useUrlSchemeStore.getState();
      for (const link of importedPaymentLinks) {
        const isConflict = existingCodes.has(link.bankCode);
        if (!isConflict) {
          urlSchemeState.addConfig(link);
          didApplySettings = true;
          continue;
        }

        const decision = paymentLinkDecisions[link.bankCode] ?? 'overwrite';
        if (decision === 'overwrite') {
          urlSchemeState.addConfig(link);
          didApplySettings = true;
        }
      }
    }

    setImportedCount(processed);
    setSettingsApplied(didApplySettings);
    haptic();
  }, [
    accounts,
    addAccount,
    anyPrefsSelected,
    anyStyleSelected,
    candidates,
    existingCodes,
    importedPaymentLinks,
    importedPreferences,
    importedStyle,
    includeAccounts,
    includePaymentLinks,
    paymentLinkDecisions,
    prefsSelection,
    selectAccount,
    styleSelection,
    updateAccount,
  ]);

  const checkedCount = candidates?.filter((candidate) => candidate.checked).length ?? 0;
  const newCount = candidates?.filter((candidate) => !candidate.isDuplicate).length ?? 0;
  const hasAnythingToImport =
    (candidates && includeAccounts && checkedCount > 0) ||
    anyStyleSelected ||
    anyPrefsSelected ||
    (importedPaymentLinks && includePaymentLinks && importedPaymentLinks.length > 0);

  const isPhase2 = (candidates !== null || importedStyle !== null || importedPreferences !== null || importedPaymentLinks !== null) && importedCount === null;
  const isPhase1 = !isPhase2 && importedCount === null;

  return (
    <div className="space-y-6">
      {isPhase1 && (
        <>
          <textarea
            value={input}
            name="backupString"
            onChange={(event) => {
              setInput(event.target.value);
              setError('');
              setNeedsPassword(false);
            }}
            placeholder={t.importDialog.inputPlaceholder}
            aria-label={t.importDialog.inputLabel}
            rows={5}
            autoFocus={!needsPassword && allowAutoFocus}
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 break-all resize-none focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
          />

          {needsPassword && (
            <div>
              <label
                htmlFor="import-password"
                className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
              >
                <Lock size={14} aria-hidden="true" />
                {t.importDialog.passwordLabel}
              </label>
              <input
                id="import-password"
                name="importPassword"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isImporting) {
                    event.preventDefault();
                    handleDecrypt();
                  }
                }}
                placeholder={t.importDialog.passwordPlaceholder}
                autoFocus={allowAutoFocus}
                autoComplete="off"
                className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
              />
            </div>
          )}

          {error && (
            <div role="alert" aria-live="polite" className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
              <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
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

      {isPhase2 && (
        <>
          {candidates && candidates.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={includeAccounts}
                  aria-label={t.importDialog.catAccounts}
                  onClick={() => setIncludeAccounts(!includeAccounts)}
                  className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                    includeAccounts
                      ? 'border-transparent'
                      : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                  }`}
                  style={includeAccounts ? {
                    backgroundColor: 'var(--ca)',
                    borderColor: 'var(--ca)',
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
                  <div className="flex gap-2">
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

                  <div className="space-y-2 max-h-app-30 overflow-y-auto -mx-1 px-1">
                    {candidates.map((candidate, index) => (
                      <div
                        key={`${candidate.original.bankCode}-${candidate.original.accountNumber}-${index}`}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                          candidate.checked
                            ? 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                            : 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-800/50 opacity-60'
                        }`}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={candidate.checked}
                          aria-label={t.importDialog.selectLabel(candidate.checked, getBankName(candidate.original.bankCode))}
                          onClick={() => toggleCandidate(index)}
                          className="-ml-1 -mt-1 flex h-11 w-11 shrink-0 items-start justify-center rounded-lg pt-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                        >
                          <span
                            aria-hidden="true"
                            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              candidate.checked
                                ? 'border-transparent'
                                : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                            }`}
                            style={candidate.checked ? {
                              backgroundColor: 'var(--ca)',
                              borderColor: 'var(--ca)',
                            } : undefined}
                          >
                            {candidate.checked && <Check size={12} className="text-white dark:text-zinc-900" aria-hidden="true" />}
                          </span>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {getBankName(candidate.original.bankCode)}
                            </span>
                            {candidate.isDuplicate && (
                              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                {t.importDialog.existing}
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tracking-wide">
                            {candidate.original.accountNumber}
                          </p>

                          {candidate.isEditing ? (
                            <input
                              type="text"
                              name={`candidateLabel-${index}`}
                              value={candidate.label}
                              onChange={(event) => updateCandidateLabel(index, event.target.value)}
                              onBlur={() => toggleEditing(index)}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  toggleEditing(index);
                                }
                              }}
                              autoFocus={allowAutoFocus}
                              placeholder={t.importDialog.nicknamePlaceholder}
                              className="mt-1.5 w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleEditing(index);
                              }}
                              className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-500"
                            >
                              <Pencil size={10} aria-hidden="true" />
                              <span>{candidate.label || t.importDialog.addNickname}</span>
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

          {importedStyle && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div
                className={`flex items-center transition-colors ${
                  anyStyleSelected
                    ? 'bg-white dark:bg-zinc-900/50'
                    : 'bg-zinc-50 dark:bg-zinc-900/20 opacity-60'
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allStyleSelected ? true : anyStyleSelected ? 'mixed' : false}
                  onClick={() => setStyleSelection({ accent: !allStyleSelected, qr: !allStyleSelected })}
                  className="flex flex-1 items-center gap-3 p-3 text-left select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <ImportCheckboxIcon checked={!!allStyleSelected} indeterminate={!!anyStyleSelected && !allStyleSelected} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.importDialog.catStyle}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setStyleExpanded(!styleExpanded)}
                  className="mr-2 p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                  aria-label={styleExpanded ? t.common.collapse : t.common.expand}
                >
                  {styleExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                </button>
              </div>
              {styleExpanded && (
                <div className="border-t border-zinc-100 dark:border-zinc-800/50 pl-5">
                  {hasStyleAccent && (
                    <ImportSubCheckbox
                      checked={styleSelection.accent}
                      onChange={() => setStyleSelection((prev) => ({ ...prev, accent: !prev.accent }))}
                      label={t.importDialog.catStyleAccent}
                    />
                  )}
                  {hasStyleQR && (
                    <ImportSubCheckbox
                      checked={styleSelection.qr}
                      onChange={() => setStyleSelection((prev) => ({ ...prev, qr: !prev.qr }))}
                      label={t.importDialog.catStyleQR}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {importedPreferences && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div
                className={`flex items-center transition-colors ${
                  anyPrefsSelected
                    ? 'bg-white dark:bg-zinc-900/50'
                    : 'bg-zinc-50 dark:bg-zinc-900/20 opacity-60'
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allPrefsSelected ? true : anyPrefsSelected ? 'mixed' : false}
                  onClick={() => setPrefsSelection({ mode: !allPrefsSelected, locale: !allPrefsSelected })}
                  className="flex flex-1 items-center gap-3 p-3 text-left select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <ImportCheckboxIcon checked={!!allPrefsSelected} indeterminate={!!anyPrefsSelected && !allPrefsSelected} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.importDialog.catPreferences}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPrefsExpanded(!prefsExpanded)}
                  className="mr-2 p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                  aria-label={prefsExpanded ? t.common.collapse : t.common.expand}
                >
                  {prefsExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                </button>
              </div>
              {prefsExpanded && (
                <div className="border-t border-zinc-100 dark:border-zinc-800/50 pl-5">
                  {hasPrefsMode && (
                    <ImportSubCheckbox
                      checked={prefsSelection.mode}
                      onChange={() => setPrefsSelection((prev) => ({ ...prev, mode: !prev.mode }))}
                      label={t.importDialog.catPrefsMode}
                    />
                  )}
                  {hasPrefsLocale && (
                    <ImportSubCheckbox
                      checked={prefsSelection.locale}
                      onChange={() => setPrefsSelection((prev) => ({ ...prev, locale: !prev.locale }))}
                      label={t.importDialog.catPrefsLocale}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {importedPaymentLinks && importedPaymentLinks.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <button
                type="button"
                role="checkbox"
                aria-checked={includePaymentLinks}
                onClick={() => setIncludePaymentLinks(!includePaymentLinks)}
                className={`w-full flex items-center gap-3 p-3 text-left select-none transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                  includePaymentLinks
                    ? 'bg-white dark:bg-zinc-900/50'
                    : 'bg-zinc-50 dark:bg-zinc-900/20 opacity-60'
                }`}
              >
                <ImportCheckboxIcon checked={includePaymentLinks} />
                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {t.importDialog.catPaymentLinks(importedPaymentLinks.length)}
                </span>
              </button>

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
                          onClick={() => setPaymentLinkDecisions((prev) => ({ ...prev, [link.bankCode]: 'overwrite' }))}
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
                          onClick={() => setPaymentLinkDecisions((prev) => ({ ...prev, [link.bankCode]: 'keep' }))}
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
              onClick={onCancel}
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

      {importedCount !== null && (
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check size={32} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t.importDialog.successTitle}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.importDialog.successDesc(importedCount)}
            </p>
            {settingsApplied && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t.importDialog.settingsApplied}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="w-full py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {t.common.done}
          </button>
        </div>
      )}
    </div>
  );
};

function ImportCheckboxIcon({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  const active = checked || indeterminate;
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        active ? 'border-transparent' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
      }`}
      style={active ? {
        backgroundColor: 'var(--ca)',
        borderColor: 'var(--ca)',
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
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`w-full flex items-center gap-3 p-2.5 text-left select-none transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${checked ? '' : 'opacity-50'}`}
    >
      <ImportCheckboxIcon checked={checked} />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </button>
  );
}
