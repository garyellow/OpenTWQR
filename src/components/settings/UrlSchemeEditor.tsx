import { useState, useMemo, useRef } from 'react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { BankSelect } from '../accounts/BankSelect';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useBanksStore } from '../../stores/useBanksStore';
import { X, HelpCircle, Building2 } from 'lucide-react';
import { haptic } from '../../utils/haptics';

interface UrlSchemeEditorProps {
  /** Existing bank code for editing. Undefined for new entry. */
  bankCode?: string;
  onClose: () => void;
}

/**
 * Modal form for adding/editing a bank URL scheme configuration.
 */
export const UrlSchemeEditor = ({ bankCode: initialBankCode, onClose }: UrlSchemeEditorProps) => {
  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((s) => s.banks);
  const { configs, addConfig } = useUrlSchemeStore();

  const existingConfig = useMemo(
    () => (initialBankCode ? configs.find((c) => c.bankCode === initialBankCode) : undefined),
    [configs, initialBankCode],
  );

  const [bankCode, setBankCode] = useState(existingConfig?.bankCode || '');
  const [urlTemplate, setUrlTemplate] = useState(existingConfig?.urlTemplate || '');
  const [showHelp, setShowHelp] = useState(false);

  /** Captures the AnimatedModal's requestClose so handleSave triggers the exit animation. */
  const requestCloseRef = useRef<(() => void) | null>(null);

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === bankCode),
    [banks, bankCode],
  );

  const handleSave = () => {
    if (!bankCode || !urlTemplate.trim()) return;
    haptic();
    addConfig({ bankCode, urlTemplate: urlTemplate.trim() });
    requestCloseRef.current?.();
  };

  const isValid = bankCode && urlTemplate.trim();

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
              <BankSelect value={bankCode} onChange={setBankCode} />
            )}

            {/* URL template */}
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
                onChange={(e) => setUrlTemplate(e.target.value)}
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

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className="w-full py-4 btn-accent font-semibold rounded-xl active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              {t.urlScheme.save}
            </button>
          </div>
        </div>
        );
      }}
    </AnimatedModal>
  );
};
