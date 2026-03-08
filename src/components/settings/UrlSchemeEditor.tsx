import { useState, useMemo, useRef, useCallback } from 'react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { BankSelect } from '../accounts/BankSelect';
import { InfoTip } from '../ui/InfoTip';
import { useUrlSchemeStore, type BankUrlConfig } from '../../stores/useUrlSchemeStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useBanksStore } from '../../stores/useBanksStore';
import { X, Link, Building2, ClipboardPaste, Smartphone, ExternalLink, AlertCircle, FileText } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { parseIntentInput, buildIntentUrl, isAndroid, normalizeIntentUrl, parseManifestXml, type ParsedIntent, type ManifestDeepLink } from '../../utils/urlScheme';

type InputMode = 'intent' | 'manifest' | 'manual';

interface UrlSchemeEditorProps {
  /** Existing bank code for editing. Undefined for new entry. */
  bankCode?: string;
  onClose: () => void;
}

/**
 * Modal form for adding/editing a bank URL scheme configuration.
 *
 * On Android, offers three input modes:
 *   1. Intent Parse — paste from Shortcut Maker to target a specific Activity.
 *   2. Manifest — paste AndroidManifest.xml from App Manager to auto-detect BROWSABLE deep links.
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
  const [sameInstitutionOnly, setSameInstitutionOnly] = useState(existingConfig?.sameInstitutionOnly ?? false);
  const [launchUrl, setLaunchUrl] = useState(existingConfig?.launchUrl || '');
  const [error, setError] = useState('');

  // Android input mode: when editing, default to manual to show existing URL
  const [mode, setMode] = useState<InputMode>(
    android && !existingConfig?.urlTemplate ? 'intent' : 'manual',
  );

  // Intent Parse mode state
  const [importText, setImportText] = useState('');
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [parseError, setParseError] = useState(false);
  const [intentFallback, setIntentFallback] = useState(true);

  // Manifest mode state
  const [manifestText, setManifestText] = useState('');
  const [manifestLinks, setManifestLinks] = useState<ManifestDeepLink[]>([]);
  const [manifestParseError, setManifestParseError] = useState(false);
  const [selectedLinkIdx, setSelectedLinkIdx] = useState<number>(0);
  const [manifestFallback, setManifestFallback] = useState(true);

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
    const config: BankUrlConfig = { bankCode, urlTemplate: normalizeIntentUrl(urlTemplate.trim()) };
    if (sameInstitutionOnly) config.sameInstitutionOnly = true;
    if (sameInstitutionOnly && launchUrl.trim()) config.launchUrl = normalizeIntentUrl(launchUrl.trim());
    addConfig(config);
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

  const handleParseManifest = useCallback(() => {
    const links = parseManifestXml(manifestText);
    if (links.length > 0) {
      setManifestLinks(links);
      setManifestParseError(false);
      setSelectedLinkIdx(0);
    } else {
      setManifestLinks([]);
      setManifestParseError(true);
    }
  }, [manifestText]);

  const handlePasteAndParseManifest = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      haptic();
      setManifestText(text);
      setManifestParseError(false);
      const links = parseManifestXml(text);
      if (links.length > 0) {
        setManifestLinks(links);
        setSelectedLinkIdx(0);
      } else {
        setManifestLinks([]);
        setManifestParseError(true);
      }
    } catch {
      // Clipboard permission denied
    }
  }, []);

  const handleSaveManifest = useCallback(() => {
    if (!bankCode) {
      setError(t.urlScheme.errorSelectBank);
      return;
    }
    if (manifestLinks.length === 0) {
      setError(t.urlScheme.errorParseManifestFirst);
      return;
    }
    haptic();
    const link = manifestLinks[selectedLinkIdx];
    // Build an intent:// URL so Chrome can use the fallback mechanism
    const intentParsed: ParsedIntent = {
      action: 'android.intent.action.VIEW',
      packageName: link.packageName,
      dataUri: link.url,
    };
    const url = buildIntentUrl(intentParsed, { fallback: manifestFallback });
    const config: BankUrlConfig = { bankCode, urlTemplate: normalizeIntentUrl(url) };
    if (sameInstitutionOnly) config.sameInstitutionOnly = true;
    if (sameInstitutionOnly && launchUrl.trim()) config.launchUrl = normalizeIntentUrl(launchUrl.trim());
    addConfig(config);
    requestCloseRef.current?.();
  }, [bankCode, manifestLinks, selectedLinkIdx, manifestFallback, sameInstitutionOnly, launchUrl, addConfig, t]);

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
    const config: BankUrlConfig = { bankCode, urlTemplate: normalizeIntentUrl(url) };
    if (sameInstitutionOnly) config.sameInstitutionOnly = true;
    if (sameInstitutionOnly && launchUrl.trim()) config.launchUrl = normalizeIntentUrl(launchUrl.trim());
    addConfig(config);
    requestCloseRef.current?.();
  }, [bankCode, parsedIntent, intentFallback, sameInstitutionOnly, launchUrl, addConfig, t]);

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
                  { key: 'intent' as const, icon: <Smartphone size={14} aria-hidden="true" />, label: t.urlScheme.modeIntent },
                  { key: 'manifest' as const, icon: <FileText size={14} aria-hidden="true" />, label: t.urlScheme.modeManifest },
                  { key: 'manual' as const, icon: <Link size={14} aria-hidden="true" />, label: t.urlScheme.modeManual },
                ]).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setMode(key); setError(''); setParseError(false); setManifestParseError(false); }}
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

            {/* ─── Intent Parse mode (Shortcut Maker) ─────── */}
            {mode === 'intent' && android && (
              <div className="space-y-3.5">
                {/* Quick launch — smart open or install */}
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
                </a>

                {/* Paste area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor="import-intent-input"
                        className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
                      >
                        {t.urlScheme.importPasteLabel}
                      </label>
                      <InfoTip
                        title={t.urlScheme.modeIntent}
                        content={t.urlScheme.importIntentDesc}
                        size={12}
                      />
                    </div>
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

              </div>
            )}

            {/* ─── Manifest mode (AppManager) ──────────────── */}
            {mode === 'manifest' && android && (
              <div className="space-y-3.5">
                {/* Quick launch — smart open or install */}
                <a
                  href="intent://#Intent;package=io.github.muntashirakon.AppManager;S.browser_fallback_url=https%3A%2F%2Ff-droid.org%2Fpackages%2Fio.github.muntashirakon.AppManager%2F;end"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:scale-98 action-transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={16} className="text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-tight">
                      {t.urlScheme.manifestLaunchApp}
                    </p>
                  </div>
                  <ExternalLink size={14} className="text-zinc-400 dark:text-zinc-500 shrink-0 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" aria-hidden="true" />
                </a>

                {/* Paste area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor="manifest-input"
                        className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
                      >
                        {t.urlScheme.manifestPasteLabel}
                      </label>
                      <InfoTip
                        title={t.urlScheme.modeManifest}
                        content={t.urlScheme.manifestDesc}
                        size={12}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handlePasteAndParseManifest}
                      className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    >
                      <ClipboardPaste size={12} aria-hidden="true" />
                      {t.urlScheme.importPasteBtn}
                    </button>
                  </div>
                  <textarea
                    id="manifest-input"
                    value={manifestText}
                    onChange={(e) => {
                      setManifestText(e.target.value);
                      setManifestParseError(false);
                      setManifestLinks([]);
                    }}
                    placeholder={t.urlScheme.manifestPastePlaceholder}
                    rows={5}
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 input-transition shadow-xs font-mono resize-none"
                  />
                </div>

                {/* Parse button */}
                <button
                  type="button"
                  onClick={handleParseManifest}
                  disabled={!manifestText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-98 action-transition disabled:opacity-40 disabled:active:scale-100"
                >
                  <ClipboardPaste size={14} aria-hidden="true" />
                  {t.urlScheme.importParse}
                </button>

                {/* Parse error */}
                {manifestParseError && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {t.urlScheme.manifestParseError}
                  </p>
                )}

                {/* Parsed results — deep link picker */}
                {manifestLinks.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t.urlScheme.manifestResultTitle} ({manifestLinks.length})
                    </p>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {manifestLinks.map((link, i) => (
                        <label
                          key={`${link.activityName}-${link.url}-${i}`}
                          className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            selectedLinkIdx === i
                              ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80'
                              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="manifest-link"
                            checked={selectedLinkIdx === i}
                            onChange={() => setSelectedLinkIdx(i)}
                            className="mt-0.5 w-3.5 h-3.5 accent-current shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-zinc-800 dark:text-zinc-200 break-all leading-relaxed">
                              {link.url}
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 break-all">
                              {link.activityName}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Fallback toggle */}
                    <label className="flex items-center gap-2.5 py-1">
                      <input
                        type="checkbox"
                        checked={manifestFallback}
                        onChange={(e) => setManifestFallback(e.target.checked)}
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
                        {buildIntentUrl(
                          { action: 'android.intent.action.VIEW', packageName: manifestLinks[selectedLinkIdx]?.packageName, dataUri: manifestLinks[selectedLinkIdx]?.url },
                          { fallback: manifestFallback },
                        )}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ─── Manual URL template ─────────────────────── */}
            {mode === 'manual' && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 ml-1">
                  <label
                    htmlFor="url-template-input"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {t.urlScheme.urlLabel}
                  </label>
                  <InfoTip title={t.urlScheme.placeholderHelp} size={12}>
                    <div className="space-y-1.5 text-xs">
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
                  </InfoTip>
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
              </div>
            )}

            {/* ─── Same-institution toggle + launch URL + save (shared across all modes) ─── */}
            <div className="space-y-3.5">
              <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-xs">
                {/* Toggle row — outer div carries hover/transition; only the switch button is interactive */}
                <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.urlScheme.sameInstitutionOnlyLabel}</span>
                    <InfoTip
                      title={t.urlScheme.sameInstitutionOnlyLabel}
                      content={t.urlScheme.sameInstitutionOnlyHint}
                      size={12}
                    />
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sameInstitutionOnly}
                    onClick={() => { haptic(); setSameInstitutionOnly(!sameInstitutionOnly); }}
                    aria-label={t.urlScheme.sameInstitutionOnlyLabel}
                    className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-zinc-900 ${sameInstitutionOnly ? '' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                    style={sameInstitutionOnly ? { backgroundColor: 'light-dark(var(--accent), var(--accent-dark))' } : undefined}
                  >
                    <div className={`absolute top-0.75 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${sameInstitutionOnly ? 'translate-x-5.25' : 'translate-x-0.75'}`} />
                  </button>
                </div>

                {sameInstitutionOnly && (
                  <div className="px-4 pt-3 pb-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    <label
                      htmlFor="launch-url-input"
                      className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1.5 ml-1"
                    >
                      {t.urlScheme.launchUrlLabel}
                    </label>
                    <input
                      id="launch-url-input"
                      type="text"
                      value={launchUrl}
                      onChange={(e) => setLaunchUrl(e.target.value)}
                      placeholder={t.urlScheme.launchUrlPlaceholder}
                      autoComplete="off"
                      className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 input-transition shadow-xs font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 ml-1 leading-relaxed">{t.urlScheme.launchUrlHint}</p>
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" aria-live="polite" className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
                  <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <button
                type="button"
                onClick={mode === 'intent' ? handleSaveIntent : mode === 'manifest' ? handleSaveManifest : handleSave}
                className="w-full py-4 btn-accent font-semibold rounded-xl active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {t.urlScheme.save}
              </button>
            </div>
          </div>
        </div>
        );
      }}
    </AnimatedModal>
  );
};
