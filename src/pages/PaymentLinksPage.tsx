import { useState, useCallback, useMemo } from 'react';
import { useUrlSchemeStore } from '../stores/useUrlSchemeStore';
import { useBanksStore } from '../stores/useBanksStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { UrlSchemeEditor } from '../components/settings/UrlSchemeEditor';
import { AnimatedModal } from '../components/ui/AnimatedModal';
import { ArrowLeft, Plus, Link2, ChevronRight, Trash2, FlaskConical, Building2, X, CircleHelp, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../utils/haptics';
import { buildBankUrl, isAndroid } from '../utils/urlScheme';

/**
 * Full-page management screen for transfer app integrations.
 * Mirrors AccountsPage patterns: sticky header, sorted list, modals for add/edit/delete.
 * Accessed from Settings → "轉帳 App 連動" row.
 */
export const PaymentLinksPage = () => {
  const t = useLocaleStore((s) => s.t);
  const navigate = useNavigate();
  const configs = useUrlSchemeStore((s) => s.configs);
  const removeConfig = useUrlSchemeStore((s) => s.removeConfig);
  const banks = useBanksStore((s) => s.banks);

  const [editingBankCode, setEditingBankCode] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingBankCode, setDeletingBankCode] = useState<string | null>(null);
  const [testingBankCode, setTestingBankCode] = useState<string | null>(null);
  const [testBankCode, setTestBankCode] = useState('');
  const [testAccount, setTestAccount] = useState('');
  const [testAmount, setTestAmount] = useState('');
  const [testNote, setTestNote] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<'intent' | 'manifest'>('intent');
  const android = useMemo(() => isAndroid(), []);

  const sortedConfigs = useMemo(
    () => [...configs].sort((a, b) => a.bankCode.localeCompare(b.bankCode)),
    [configs],
  );

  const deletingConfig = deletingBankCode
    ? configs.find((c) => c.bankCode === deletingBankCode)
    : null;
  const deletingBank = deletingConfig
    ? banks.find((b) => b.code === deletingConfig.bankCode)
    : null;

  const testingConfig = testingBankCode
    ? configs.find((c) => c.bankCode === testingBankCode)
    : null;
  const testingBank = testingConfig
    ? banks.find((b) => b.code === testingConfig.bankCode)
    : null;

  /** Build the test URL from user-provided data — account is optional */
  const testUrl = useMemo(() => {
    if (!testingConfig) return '';
    return buildBankUrl(testingConfig.urlTemplate, {
      bankCode: testBankCode || testingConfig.bankCode,
      account: testAccount,
      paddedAccount: testAccount.padStart(16, '0'),
      amount: testAmount ? Number(testAmount) : 0,
      note: testNote,
    });
  }, [testingConfig, testBankCode, testAccount, testAmount, testNote]);

  const goBack = useCallback(() => {
    navigate('/settings', { viewTransition: true });
  }, [navigate]);

  return (
    <div className="min-h-svh flex flex-col px-safe bg-zinc-50 dark:bg-zinc-950 pb-safe">
      <a
        href="#payment-links-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        {t.common.skipToMain}
      </a>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goBack}
              aria-label={t.common.back}
              title={t.common.back}
              className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t.urlScheme.manageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {android && (
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              aria-label={t.urlScheme.guideTitle}
              title={t.urlScheme.guideTitle}
              className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <CircleHelp size={20} aria-hidden="true" />
            </button>
            )}
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              aria-label={t.urlScheme.addLabel}
              title={t.urlScheme.addBank}
              className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="payment-links-main" className="flex-1 px-6 py-5 max-w-md lg:max-w-lg mx-auto w-full">
        {configs.length === 0 ? (
          /* Empty state — mirrors AccountsPage */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center shadow-xs">
              <Link2 size={48} aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
                {t.urlScheme.emptyTitle}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-pretty">
                {t.urlScheme.emptyHint}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full max-w-72 py-4 btn-accent font-semibold rounded-xl active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 mt-4"
            >
              {t.urlScheme.addBank}
            </button>
          </div>
        ) : (
          /* Config list — row style sorted by bankCode */
          <div className="space-y-8 pb-24">
            <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {sortedConfigs.map((config) => {
                const bank = banks.find((b) => b.code === config.bankCode);
                return (
                  <div key={config.bankCode} className="flex items-stretch">
                    {/* Row — tap to edit */}
                    <button
                      type="button"
                      onClick={() => {
                        haptic();
                        setEditingBankCode(config.bankCode);
                      }}
                      className="flex-1 flex items-center gap-3 p-4 min-w-0 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 12%, transparent)' }}
                      >
                        <Link2
                          size={18}
                          style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">
                          {bank?.name || config.bankCode}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
                          {config.urlTemplate}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-600 shrink-0" aria-hidden="true" />
                    </button>

                    {/* Test & Delete buttons */}
                    <div className="border-l border-zinc-100 dark:border-zinc-800/50 flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          haptic();
                          setTestBankCode('');
                          setTestAccount('');
                          setTestAmount('');
                          setTestNote('');
                          setTestingBankCode(config.bankCode);
                        }}
                        aria-label={t.urlScheme.testLabel}
                        title={t.urlScheme.testLabel}
                        className="p-4 text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                      >
                        <FlaskConical size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          haptic();
                          setDeletingBankCode(config.bankCode);
                        }}
                        aria-label={t.common.delete}
                        title={t.common.delete}
                        className="p-4 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Editor modal */}
      {(isAdding || editingBankCode) && (
        <UrlSchemeEditor
          bankCode={editingBankCode || undefined}
          onClose={() => {
            setIsAdding(false);
            setEditingBankCode(null);
          }}
        />
      )}

      {/* Delete confirmation modal — mirrors AccountsPage pattern */}
      {deletingConfig && (
        <AnimatedModal
          onClose={() => setDeletingBankCode(null)}
          overlayClass="z-60"
          cardClass="max-w-sm p-6"
          ariaLabelledby="payment-link-delete-title"
          ariaDescribedby="payment-link-delete-desc"
        >
          {(requestClose) => (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-5 mx-auto">
                <Trash2 size={24} className="text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
              <h2
                id="payment-link-delete-title"
                className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-center"
              >
                {t.urlScheme.deleteTitle}
              </h2>
              <p
                id="payment-link-delete-desc"
                className="mt-3 text-zinc-500 dark:text-zinc-400 text-center leading-relaxed text-pretty"
              >
                {t.urlScheme.deleteConfirm}
              </p>
              <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-4 py-3 break-all border border-zinc-200/50 dark:border-zinc-700/50 text-center space-y-1">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {deletingBank?.name || deletingConfig.bankCode}
                </p>
                <p className="font-mono text-xs">{deletingConfig.urlTemplate}</p>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic();
                    removeConfig(deletingBankCode!);
                    requestClose();
                  }}
                  className="flex-1 py-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-600 dark:focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.delete}
                </button>
              </div>
            </>
          )}
        </AnimatedModal>
      )}

      {/* Test modal */}
      {testingConfig && (
        <AnimatedModal
          onClose={() => setTestingBankCode(null)}
          overlayClass="z-60"
          cardClass="max-w-sm max-h-[90svh] overflow-y-auto"
          ariaLabelledby="payment-link-test-title"
          ariaDescribedby="payment-link-test-desc"
        >
          {(requestClose) => (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                    <FlaskConical size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <h2
                    id="payment-link-test-title"
                    className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug"
                  >
                    {t.urlScheme.testTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label={t.common.close}
                  className="p-2.5 -mr-2 -mt-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <p
                id="payment-link-test-desc"
                className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed"
              >
                {t.urlScheme.testDesc}
              </p>

              <div className="space-y-4">
                {/* Fixed bank info */}
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {testingBank?.name || testingConfig.bankCode}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      {t.urlScheme.phBankCode}：{testingConfig.bankCode}
                    </p>
                  </div>
                </div>

                {/* Institution code input */}
                <div>
                  <label
                    htmlFor="test-bankcode-input"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
                  >
                    {t.urlScheme.testBankCodeLabel}
                  </label>
                  <input
                    id="test-bankcode-input"
                    type="text"
                    inputMode="numeric"
                    value={testBankCode}
                    onChange={(e) => setTestBankCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder={t.urlScheme.testBankCodePlaceholder}
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs font-mono"
                  />
                </div>

                {/* Account input */}
                <div>
                  <label
                    htmlFor="test-account-input"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
                  >
                    {t.urlScheme.testAccountLabel}
                  </label>
                  <input
                    id="test-account-input"
                    type="text"
                    inputMode="numeric"
                    value={testAccount}
                    onChange={(e) => setTestAccount(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder={t.urlScheme.testAccountPlaceholder}
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs font-mono"
                  />
                </div>

                {/* Amount input */}
                <div>
                  <label
                    htmlFor="test-amount-input"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
                  >
                    {t.urlScheme.testAmountLabel}
                  </label>
                  <input
                    id="test-amount-input"
                    type="text"
                    inputMode="numeric"
                    value={testAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      if (raw === '') { setTestAmount(''); return; }
                      setTestAmount(String(Math.min(Number(raw), 2_000_000)));
                    }}
                    placeholder={t.urlScheme.testAmountPlaceholder}
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs font-mono"
                  />
                </div>

                {/* Note input */}
                <div>
                  <label
                    htmlFor="test-note-input"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
                  >
                    {t.urlScheme.testNoteLabel}
                  </label>
                  <input
                    id="test-note-input"
                    type="text"
                    value={testNote}
                    onChange={(e) => setTestNote(e.target.value.slice(0, 19))}
                    placeholder={t.urlScheme.testNotePlaceholder}
                    autoComplete="off"
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
                  />
                </div>

                {/* URL preview */}
                {testUrl && (
                  <div className="px-3.5 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                      {t.urlScheme.testPreviewLabel}
                    </p>
                    <p className="font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all">
                      {testUrl}
                    </p>
                  </div>
                )}

                {/* App not supported hint */}
                <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                  {t.urlScheme.testAppHint}
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.cancel}
                </button>
                {testUrl ? (
                  <a
                    href={testUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      haptic();
                      requestClose();
                    }}
                    className="flex-1 py-3.5 rounded-xl font-semibold text-center btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                  >
                    {t.urlScheme.testOpen}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3.5 rounded-xl font-semibold btn-accent shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t.urlScheme.testOpen}
                  </button>
                )}
              </div>
            </div>
          )}
        </AnimatedModal>
      )}

      {/* Guide modal — step-by-step instructions for both Intent Parse and Manifest methods */}
      {showGuide && (
        <AnimatedModal
          onClose={() => { setShowGuide(false); setGuideTab('intent'); }}
          overlayClass="z-60"
          cardClass="max-w-sm max-h-[90svh] overflow-y-auto"
          ariaLabelledby="payment-link-guide-title"
        >
          {(requestClose) => (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 12%, transparent)' }}
                  >
                    <CircleHelp size={18} style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }} aria-hidden="true" />
                  </div>
                  <h2
                    id="payment-link-guide-title"
                    className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug"
                  >
                    {t.urlScheme.guideTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label={t.common.close}
                  className="p-2.5 -mr-2 -mt-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Tab selector */}
              <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden mb-5">
                {([
                  { key: 'intent' as const, label: t.urlScheme.guideTabIntent },
                  { key: 'manifest' as const, label: t.urlScheme.guideTabManifest },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setGuideTab(key)}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                      guideTab === key
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Intent Parse guide ── */}
              {guideTab === 'intent' && (
                <>
                  <ol className="space-y-5">
                    {/* Step 1 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">1</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideStep1Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideStep1Desc}</p>
                        <a
                          href="intent://#Intent;package=rk.android.app.shortcutmaker;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Drk.android.app.shortcutmaker;end"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors"
                          style={{
                            color: 'light-dark(var(--accent), var(--accent-dark))',
                            borderColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 30%, transparent)',
                            backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 8%, transparent)',
                          }}
                        >
                          <Smartphone size={13} aria-hidden="true" />
                          {t.urlScheme.guideStep1Launch}
                        </a>
                      </div>
                    </li>

                    {/* Step 2 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">2</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideStep2Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideStep2Desc}</p>
                      </div>
                    </li>

                    {/* Step 3 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">3</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideStep3Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideStep3Desc}</p>
                      </div>
                    </li>

                    {/* Step 4 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">4</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideStep4Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideStep4Desc}</p>
                      </div>
                    </li>
                  </ol>

                  <p className="mt-5 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2.5 border border-amber-200/50 dark:border-amber-500/20">
                    {t.urlScheme.guideNote}
                  </p>
                </>
              )}

              {/* ── Manifest guide ── */}
              {guideTab === 'manifest' && (
                <>
                  <ol className="space-y-5">
                    {/* Step 1 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">1</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideManifestStep1Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideManifestStep1Desc}</p>
                        <a
                          href="intent://#Intent;package=io.github.muntashirakon.AppManager;S.browser_fallback_url=https%3A%2F%2Ff-droid.org%2Fpackages%2Fio.github.muntashirakon.AppManager%2F;end"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors"
                          style={{
                            color: 'light-dark(var(--accent), var(--accent-dark))',
                            borderColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 30%, transparent)',
                            backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 8%, transparent)',
                          }}
                        >
                          <Smartphone size={13} aria-hidden="true" />
                          {t.urlScheme.guideManifestStep1Launch}
                        </a>
                      </div>
                    </li>

                    {/* Step 2 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">2</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideManifestStep2Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideManifestStep2Desc}</p>
                      </div>
                    </li>

                    {/* Step 3 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">3</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideManifestStep3Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideManifestStep3Desc}</p>
                      </div>
                    </li>

                    {/* Step 4 */}
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">4</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.urlScheme.guideManifestStep4Title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.urlScheme.guideManifestStep4Desc}</p>
                      </div>
                    </li>
                  </ol>

                  <p className="mt-5 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2.5 border border-amber-200/50 dark:border-amber-500/20">
                    {t.urlScheme.guideManifestNote}
                  </p>
                </>
              )}

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-3.5 mt-6 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {t.common.understand}
              </button>
            </div>
          )}
        </AnimatedModal>
      )}
    </div>
  );
};
