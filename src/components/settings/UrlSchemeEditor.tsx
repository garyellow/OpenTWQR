import { useState, useMemo, useRef, useCallback } from 'react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { BankSelect } from '../accounts/BankSelect';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useBanksStore } from '../../stores/useBanksStore';
import { X, HelpCircle, Link, Building2, ClipboardPaste, Smartphone, Package, ExternalLink, AlertCircle } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { parseIntentInput, buildIntentUrl, buildPackageOnlyUrl, isAndroid, normalizeIntentUrl, type ParsedIntent } from '../../utils/urlScheme';

type InputMode = 'package' | 'intent' | 'manual';

interface UrlSchemeEditorProps {
  /** Existing bank code for editing. Undefined for new entry. */
  bankCode?: string;
  onClose: () => void;
}

/**
 * Modal form for adding/editing a bank URL scheme configuration.
 *
 * On Android, offers three input modes:
 *   1. Package Name — simplest: just enter a package name to open the app.
 *   2. Import Intent — paste from Shortcut Maker to target a specific Activity.
 *   3. Manual URL — free-form URL template with placeholder support.
 *
 * On non-Android, only the manual URL mode is shown.
 */
export const UrlSchemeEditor = ({ bankCode: initialBankCode, onClose }: UrlSchemeEditorProps) => {
  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((s) => s.banks);
  const { configs, addConfig } = useUrlSchemeStore();

  const existingConfig = useMemo(
    () => (initialBankCode ? configs.find((c) => c.bankCode === initialBankCode) : undefined),
    [configs, initialBankCode],
  );

  const android = useMemo(() => isAndroid(), []);

  const [bankCode, setBankCode] = useState(existingConfig?.bankCode || '');
  const [urlTemplate, setUrlTemplate] = useState(existingConfig?.urlTemplate || '');
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');

  // Android input mode: when editing, default to manual to show existing URL
  const [mode, setMode] = useState<InputMode>(
    android && !existingConfig?.urlTemplate ? 'package' : 'manual',
  );

  // Package Name mode state
  const [packageInput, setPackageInput] = useState('');
  const [packageFallback, setPackageFallback] = useState(true);

  // Import Intent mode state
  const [importText, setImportText] = useState('');
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [parseError, setParseError] = useState(false);
  const [intentFallback, setIntentFallback] = useState(true);

  /** Captures requestClose for exit animation. */
  const requestCloseRef = useRef<(() => void) | null>(null);

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === bankCode),
    [banks, bankCode],
  );

  const handleSave = () => {
    if (!bankCode) {
      setError(t.urlScheme.errorSelectBank);
      return;
    }
    if (!urlTemplate.trim()) {
      setError(t.urlScheme.errorUrlTemplate);
      return;
    }
    haptic();
    addConfig({ bankCode, urlTemplate: normalizeIntentUrl(urlTemplate.trim()) });
    requestCloseRef.current?.();
  };

  const handleParse = useCallback(() => {
    const parsed = parseIntentInput(importText);
    if (parsed) {
      setParsedIntent(parsed);
      setParseError(false);
    } else {
      setParsedIntent(null);
      setParseError(true);
    }
  }, [importText]);

  const handlePasteAndParse = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      haptic();
      setImportText(text);
      setParseError(false);
      const parsed = parseIntentInput(text);
      if (parsed) {
        setParsedIntent(parsed);
      } else {
        setParsedIntent(null);
        setParseError(true);
      }
    } catch {
      // Clipboard permission denied — user can still manually paste into the textarea
    }
  }, []);

  const handleSaveIntent = useCallback(() => {
    if (!bankCode) {
      setError(t.urlScheme.errorSelectBank);
      return;
    }
    if (!parsedIntent) {
      setError(t.urlScheme.errorParseFirst);
      return;
    }
    haptic();
    const url = buildIntentUrl(parsedIntent, { fallback: intentFallback });
    addConfig({ bankCode, urlTemplate: normalizeIntentUrl(url) });
    requestCloseRef.current?.();
  }, [bankCode, parsedIntent, intentFallback, addConfig, t]);

  const handleSavePackage = useCallback(() => {
    if (!bankCode) {
      setError(t.urlScheme.errorSelectBank);
      return;
    }
    if (!packageInput.trim()) {
      setError(t.urlScheme.errorPackageName);
      return;
    }
    haptic();
    const url = buildPackageOnlyUrl(packageInput.trim(), { fallback: packageFallback });
    addConfig({ bankCode, urlTemplate: normalizeIntentUrl(url) });
    requestCloseRef.current?.();
  }, [bankCode, packageInput, packageFallback, addConfig, t]);

  return (
    <AnimatedModal
      onClose={onClose}
      overlayClass="z-50"
      cardClass="max-w-lg max-h-[90svh] overflow-y-auto"
      ariaLabelledby="url-scheme-editor-title"
    >
      {(requestClose) => {
        requestCloseRef.current = requestClose;
        return (
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="url-scheme-editor-title"
              className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              {initialBankCode ? t.urlScheme.editTitle : t.urlScheme.addTitle}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t.common.close}
              className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Bank selector — BankSelect (controlled) or static display */}
            {initialBankCode ? (
              /* Editing: show static bank info */
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1">
                  {t.form.bankLabel}
                </label>
                <div className="flex items-center gap-3 px-4 py-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl opacity-80">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-zinc-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedBank?.name || bankCode}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      {bankCode}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Adding: BankSelect component */
              <BankSelect value={bankCode} onChange={(v) => { setBankCode(v); setError(''); }} />
            )}

            {/* ─── Mode selector (Android only) ────────────── */}
            {android && (
              <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                {([
                  { key: 'package' as const, icon: <Package size={14} aria-hidden="true" />, label: t.urlScheme.modePackage },
                  { key: 'intent' as const, icon: <Smartphone size={14} aria-hidden="true" />, label: t.urlScheme.modeIntent },
                  { key: 'manual' as const, icon: <Link size={14} aria-hidden="true" />, label: t.urlScheme.modeManual },
                ]).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setMode(key); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                      mode === key
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* ─── Package Name Only mode ──────────────────── */}
            {mode === 'package' && android && (
              <div className="space-y-3.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t.urlScheme.packageDesc}
                </p>

                <div>
                  <label
                    htmlFor="package-name-input"
                    className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1.5"
                  >
                    {t.urlScheme.importPackage}
                  </label>
                  <input
                    id="package-name-input"
                    type="text"
                    value={packageInput}
                    onChange={(e) => { setPackageInput(e.target.value); setError(''); }}
                    placeholder="com.example.app"
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 input-transition shadow-xs font-mono"
                  />
                </div>

                <label className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    checked={packageFallback}
                    onChange={(e) => setPackageFallback(e.target.checked)}
                    className="w-4 h-4 rounded accent-current"
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t.urlScheme.importFallback}
                  </span>
                </label>

                {/* Preview */}
                {packageInput.trim() && (
                  <div className="px-3 py-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-700/50">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                      {t.urlScheme.importPreview}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 break-all leading-relaxed">
                      {buildPackageOnlyUrl(packageInput.trim(), { fallback: packageFallback })}
                    </p>
                  </div>
                )}

                {error && mode === 'package' && (
                  <div role="alert" aria-live="polite" className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
                    <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSavePackage}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold btn-accent active:scale-98 action-transition shadow-xs"
                >
                  {t.urlScheme.save}
                </button>
              </div>
            )}

            {/* ─── Import Intent mode (Shortcut Maker) ─────── */}
            {mode === 'intent' && android && (
              <div className="space-y-3.5">                {/* Quick launch — smart open or install */}
                <a
                  href="intent://#Intent;package=rk.android.app.shortcutmaker;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Drk.android.app.shortcutmaker;end"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-98 action-transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Smartphone size={16} className="text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-tight">
                      {t.urlScheme.importLaunchApp}
                    </p>
                  </div>
                  <ExternalLink size={14} className="text-zinc-400 dark:text-zinc-500 shrink-0 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" aria-hidden="true" />
                </a>                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t.urlScheme.importIntentDesc}
                </p>

                {/* Paste area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="import-intent-input"
                      className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    >
                      {t.urlScheme.importPasteLabel}
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteAndParse}
                      className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    >
                      <ClipboardPaste size={12} aria-hidden="true" />
                      {t.urlScheme.importPasteBtn}
                    </button>
                  </div>
                  <textarea
                    id="import-intent-input"
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setParseError(false);
                      setParsedIntent(null);
                    }}
                    placeholder={t.urlScheme.importPastePlaceholder}
                    rows={5}
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 input-transition shadow-xs font-mono resize-none"
                  />
                </div>

                {/* Parse button */}
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={!importText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-98 action-transition disabled:opacity-40 disabled:active:scale-100"
                >
                  <ClipboardPaste size={14} aria-hidden="true" />
                  {t.urlScheme.importParse}
                </button>

                {/* Parse error */}
                {parseError && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {t.urlScheme.importParseError}
                  </p>
                )}

                {/* Parsed result */}
                {parsedIntent && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t.urlScheme.importParsed}
                    </p>
                    <div className="space-y-1.5 text-xs">
                      {parsedIntent.action && (
                        <div className="flex gap-2">
                          <span className="text-zinc-500 dark:text-zinc-400 shrink-0 w-16">{t.urlScheme.importAction}</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200 break-all">{parsedIntent.action}</span>
                        </div>
                      )}
                      {parsedIntent.packageName && (
                        <div className="flex gap-2">
                          <span className="text-zinc-500 dark:text-zinc-400 shrink-0 w-16">{t.urlScheme.importPackage}</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200 break-all">{parsedIntent.packageName}</span>
                        </div>
                      )}
                      {parsedIntent.className && (
                        <div className="flex gap-2">
                          <span className="text-zinc-500 dark:text-zinc-400 shrink-0 w-16">{t.urlScheme.importClass}</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200 break-all">{parsedIntent.className}</span>
                        </div>
                      )}
                      {parsedIntent.dataUri && (
                        <div className="flex gap-2">
                          <span className="text-zinc-500 dark:text-zinc-400 shrink-0 w-16">{t.urlScheme.importData}</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200 break-all">{parsedIntent.dataUri}</span>
                        </div>
                      )}
                      {parsedIntent.extras && (
                        <div className="flex gap-2">
                          <span className="text-zinc-500 dark:text-zinc-400 shrink-0 w-16">{t.urlScheme.importExtras}</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200 break-all">
                            {Object.entries(parsedIntent.extras).map(([k, extra]) => `${extra.type}.${k}=${extra.value}`).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Fallback toggle */}
                    <label className="flex items-center gap-2.5 py-1">
                      <input
                        type="checkbox"
                        checked={intentFallback}
                        onChange={(e) => setIntentFallback(e.target.checked)}
                        className="w-4 h-4 rounded accent-current"
                      />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {t.urlScheme.importFallback}
                      </span>
                    </label>

                    {/* Preview */}
                    <div className="px-3 py-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-700/50">
                      <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                        {t.urlScheme.importPreview}
                      </p>
                      <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 break-all leading-relaxed">
                        {buildIntentUrl(parsedIntent, { fallback: intentFallback })}
                      </p>
                    </div>
                  </div>
                )}

                {error && mode === 'intent' && (
                  <div role="alert" aria-live="polite" className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
                    <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {/* Save button — always visible so validation errors can surface */}
                <button
                  type="button"
                  onClick={handleSaveIntent}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold btn-accent active:scale-98 action-transition shadow-xs"
                >
                  {t.urlScheme.save}
                </button>
              </div>
            )}

            {/* ─── Manual URL template ─────────────────────── */}
            {mode === 'manual' && (
              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label
                    htmlFor="url-template-input"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {t.urlScheme.urlLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
                    aria-label={t.urlScheme.placeholderHelp}
                    aria-expanded={showHelp}
                  >
                    <HelpCircle size={16} aria-hidden="true" />
                  </button>
                </div>
                <input
                  id="url-template-input"
                  type="text"
                  value={urlTemplate}
                  onChange={(e) => { setUrlTemplate(e.target.value); setError(''); }}
                  placeholder={t.urlScheme.urlPlaceholder}
                  autoComplete="off"
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs font-mono"
                />

                {/* Placeholder help panel */}
                {showHelp && (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 text-xs space-y-1.5">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm mb-2">
                      {t.urlScheme.placeholderTitle}
                    </p>
                    <p className="flex items-baseline gap-2">
                      <code className="bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 rounded font-mono text-zinc-800 dark:text-zinc-200 shrink-0">
                        {'{account}'}
                      </code>
                      <span className="text-zinc-600 dark:text-zinc-400">{t.urlScheme.phAccount}</span>
                    </p>
                    <p className="flex items-baseline gap-2">
                      <code className="bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 rounded font-mono text-zinc-800 dark:text-zinc-200 shrink-0">
                        {'{paddedAccount}'}
                      </code>
                      <span className="text-zinc-600 dark:text-zinc-400">{t.urlScheme.phPaddedAccount}</span>
                    </p>
                    <p className="flex items-baseline gap-2">
                      <code className="bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 rounded font-mono text-zinc-800 dark:text-zinc-200 shrink-0">
                        {'{bankCode}'}
                      </code>
                      <span className="text-zinc-600 dark:text-zinc-400">{t.urlScheme.phBankCode}</span>
                    </p>
                    <p className="flex items-baseline gap-2">
                      <code className="bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 rounded font-mono text-zinc-800 dark:text-zinc-200 shrink-0">
                        {'{amount}'}
                      </code>
                      <span className="text-zinc-600 dark:text-zinc-400">{t.urlScheme.phAmount}</span>
                    </p>
                    <p className="flex items-baseline gap-2">
                      <code className="bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 rounded font-mono text-zinc-800 dark:text-zinc-200 shrink-0">
                        {'{amountCents}'}
                      </code>
                      <span className="text-zinc-600 dark:text-zinc-400">{t.urlScheme.phAmountCents}</span>
                    </p>
                    <p className="flex items-baseline gap-2">
                      <code className="bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 rounded font-mono text-zinc-800 dark:text-zinc-200 shrink-0">
                        {'{note}'}
                      </code>
                      <span className="text-zinc-600 dark:text-zinc-400">{t.urlScheme.phNote}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Save — only shown in manual mode; package and intent modes have inline save buttons */}
            {mode === 'manual' && (
              <>
                {error && (
                  <div role="alert" aria-live="polite" className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
                    <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-4 btn-accent font-semibold rounded-xl active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.urlScheme.save}
                </button>
              </>
            )}
          </div>
        </div>
        );
      }}
    </AnimatedModal>
  );
};
