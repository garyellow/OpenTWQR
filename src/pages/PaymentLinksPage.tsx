import { useState, useCallback, useMemo } from 'react';
import { useUrlSchemeStore } from '../stores/useUrlSchemeStore';
import { useBanksStore } from '../stores/useBanksStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { UrlSchemeEditor } from '../components/settings/UrlSchemeEditor';
import { AnimatedModal } from '../components/ui/AnimatedModal';
import { ArrowLeft, Plus, Link2, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../utils/haptics';

/**
 * Full-page management screen for payment app integrations.
 * Mirrors AccountsPage patterns: sticky header, sorted list, modals for add/edit/delete.
 * Accessed from Settings → "支付 App 連動" row.
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
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goBack}
              aria-label={t.common.back}
              className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t.urlScheme.manageTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            aria-label={t.urlScheme.addLabel}
            className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main id="payment-links-main" className="flex-1 p-5 max-w-md lg:max-w-lg mx-auto w-full">
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

                    {/* Delete button */}
                    <div className="border-l border-zinc-100 dark:border-zinc-800/50 flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          haptic();
                          setDeletingBankCode(config.bankCode);
                        }}
                        aria-label={t.common.delete}
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
    </div>
  );
};
