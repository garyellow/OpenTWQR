import { useState, useCallback, useRef, useEffect } from 'react';
import { Copy, Check, Loader2, Lock, AlertCircle, Share2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { AnimatedModal } from '../ui/AnimatedModal';
import { exportBackup } from '../../utils/backup';
import type { BackupStyle, BackupPreferences, ExportOptions } from '../../utils/backup';
import { haptic } from '../../utils/haptics';

interface ExportDialogProps {
  onClose: () => void;
}

export const ExportDialog = ({ onClose }: ExportDialogProps) => {
  const accounts = useAppStore((s) => s.accounts);
  const t = useLocaleStore((s) => s.t);
  const urlConfigs = useUrlSchemeStore((s) => s.configs);
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

  // Category selection — default all checked
  const [includeAccounts, setIncludeAccounts] = useState(true);
  // Style: accent colour + QR
  const [includeAccentColor, setIncludeAccentColor] = useState(true);
  const [includeQR, setIncludeQR] = useState(true);
  const [styleExpanded, setStyleExpanded] = useState(false);
  // Preferences: appearance mode + locale
  const [includePrefsMode, setIncludePrefsMode] = useState(true);
  const [includePrefsLocale, setIncludePrefsLocale] = useState(true);
  const [prefsExpanded, setPrefsExpanded] = useState(false);
  // Payment links
  const [includePaymentLinks, setIncludePaymentLinks] = useState(true);

  // Derived helpers
  const anyStyleChecked = includeAccentColor || includeQR;
  const allStyleChecked = includeAccentColor && includeQR;
  const anyPrefsChecked = includePrefsMode || includePrefsLocale;
  const allPrefsChecked = includePrefsMode && includePrefsLocale;
  const nothingSelected =
    !includeAccounts && !anyStyleChecked && !anyPrefsChecked &&
    !(includePaymentLinks && urlConfigs.length > 0);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    };
  }, []);

  const toggleAllStyle = useCallback(() => {
    const newVal = !allStyleChecked;
    setIncludeAccentColor(newVal);
    setIncludeQR(newVal);
  }, [allStyleChecked]);

  const toggleAllPrefs = useCallback(() => {
    const newVal = !allPrefsChecked;
    setIncludePrefsMode(newVal);
    setIncludePrefsLocale(newVal);
  }, [allPrefsChecked]);

  const handleExport = useCallback(async () => {
    if (nothingSelected) return;

    if (password && password !== confirmPassword) {
      setError(t.exportDialog.passwordMismatch);
      return;
    }

    setIsExporting(true);
    setError('');

    // Build style snapshot
    let style: BackupStyle | undefined;
    if (anyStyleChecked) {
      style = {};
      if (includeAccentColor) {
        const ts = useThemeStore.getState();
        style.accentHue = ts.accentHue;
        style.accentEnabled = ts.accentEnabled;
      }
      if (includeQR) {
        const qs = useQRSettingsStore.getState();
        style.qr = {
          logoType: qs.logoType,
          showAccount: qs.showAccount,
          showBankName: qs.showBankName,
          customName: qs.customName,
          dotStyle: qs.dotStyle,
          eyeStyle: qs.eyeStyle,
          errorLevel: qs.errorLevel,
        };
      }
    }

    // Build preferences snapshot
    let preferences: BackupPreferences | undefined;
    if (anyPrefsChecked) {
      preferences = {};
      if (includePrefsMode) {
        const ts = useThemeStore.getState();
        preferences.mode = ts.mode;
      }
      if (includePrefsLocale) {
        const ls = useLocaleStore.getState();
        preferences.locale = ls.userLocale;
      }
    }

    const options: ExportOptions = {};
    if (includeAccounts && accounts.length > 0) options.accounts = accounts;
    if (style && Object.keys(style).length > 0) options.style = style;
    if (preferences && Object.keys(preferences).length > 0) options.preferences = preferences;
    if (includePaymentLinks && urlConfigs.length > 0) options.paymentLinks = urlConfigs;

    const res = await exportBackup(options, password);
    if (res.ok) {
      setResult(res.data);
      haptic();
      try { localStorage.setItem('opentwqr-last-backup', String(Date.now())); } catch { /* noop */ }
    } else {
      setError(t.exportDialog.exportFailed);
    }
    setIsExporting(false);
  }, [
    accounts, password, confirmPassword, nothingSelected,
    anyStyleChecked, anyPrefsChecked,
    includeAccounts, includeAccentColor, includeQR,
    includePrefsMode, includePrefsLocale, includePaymentLinks,
    urlConfigs, t,
  ]);

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
  }, [result, t]);

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
  }, [result, t]);

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
              {/* Category selection */}
              <div className="space-y-2 mb-6">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 mb-2">
                  {t.exportDialog.categoriesLabel}
                </p>

                {/* 銀行帳戶 */}
                {accounts.length > 0 && (
                  <CategoryCheckbox
                    checked={includeAccounts}
                    onChange={() => setIncludeAccounts(!includeAccounts)}
                    label={t.exportDialog.catAccounts}
                    description={t.exportDialog.catAccountsDesc(accounts.length)}
                  />
                )}

                {/* 風格 — expandable: accent + QR */}
                <ExpandableCategory
                  anyChecked={anyStyleChecked}
                  allChecked={allStyleChecked}
                  onToggleAll={toggleAllStyle}
                  label={t.exportDialog.catStyle}
                  expanded={styleExpanded}
                  onToggleExpand={() => setStyleExpanded(!styleExpanded)}
                  expandLabel={t.common}
                >
                  <SubCategoryCheckbox
                    checked={includeAccentColor}
                    onChange={() => setIncludeAccentColor(!includeAccentColor)}
                    label={t.exportDialog.catStyleAccent}
                  />
                  <SubCategoryCheckbox
                    checked={includeQR}
                    onChange={() => setIncludeQR(!includeQR)}
                    label={t.exportDialog.catStyleQR}
                  />
                </ExpandableCategory>

                {/* 偏好設定 — expandable: mode + locale */}
                <ExpandableCategory
                  anyChecked={anyPrefsChecked}
                  allChecked={allPrefsChecked}
                  onToggleAll={toggleAllPrefs}
                  label={t.exportDialog.catPreferences}
                  expanded={prefsExpanded}
                  onToggleExpand={() => setPrefsExpanded(!prefsExpanded)}
                  expandLabel={t.common}
                >
                  <SubCategoryCheckbox
                    checked={includePrefsMode}
                    onChange={() => setIncludePrefsMode(!includePrefsMode)}
                    label={t.exportDialog.catPrefsMode}
                  />
                  <SubCategoryCheckbox
                    checked={includePrefsLocale}
                    onChange={() => setIncludePrefsLocale(!includePrefsLocale)}
                    label={t.exportDialog.catPrefsLocale}
                  />
                </ExpandableCategory>

                {/* 支付 App 連結 */}
                {urlConfigs.length > 0 && (
                  <CategoryCheckbox
                    checked={includePaymentLinks}
                    onChange={() => setIncludePaymentLinks(!includePaymentLinks)}
                    label={t.exportDialog.catPaymentLinks(urlConfigs.length)}
                  />
                )}
              </div>

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
                    autoFocus
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
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
                      className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
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
                  disabled={isExporting || nothingSelected}
                  className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      {t.exportDialog.exporting}
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
                    {t.exportDialog.copyBackup}
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

/* ------------------------------------------------------------------ */
/*  Shared checkbox components                                         */
/* ------------------------------------------------------------------ */

function CheckboxIcon({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
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

function CategoryCheckbox({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={checked}
      onClick={onChange}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(); } }}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-colors ${
        checked
          ? 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
          : 'bg-zinc-50 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-800/50 opacity-60'
      }`}
    >
      <CheckboxIcon checked={checked} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        {description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function ExpandableCategory({
  anyChecked, allChecked, onToggleAll, label, expanded, onToggleExpand, expandLabel, children,
}: {
  anyChecked: boolean;
  allChecked: boolean;
  onToggleAll: () => void;
  label: string;
  expanded: boolean;
  onToggleExpand: () => void;
  expandLabel: { expand?: string; collapse?: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={anyChecked}
        onClick={onToggleAll}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggleAll(); } }}
        className={`flex items-center gap-3 p-3 cursor-pointer select-none transition-colors ${
          anyChecked
            ? 'bg-white dark:bg-zinc-900/50'
            : 'bg-zinc-50 dark:bg-zinc-900/20 opacity-60'
        }`}
      >
        <CheckboxIcon checked={allChecked} indeterminate={anyChecked && !allChecked} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
          aria-label={expanded ? (expandLabel.collapse ?? 'Collapse') : (expandLabel.expand ?? 'Expand')}
        >
          {expanded
            ? <ChevronDown size={16} aria-hidden="true" />
            : <ChevronRight size={16} aria-hidden="true" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800/50 pl-5">
          {children}
        </div>
      )}
    </div>
  );
}

function SubCategoryCheckbox({ checked, onChange, label }: {
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
      <CheckboxIcon checked={checked} />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </div>
  );
}
