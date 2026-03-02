import { useState } from 'react';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useBanksStore } from '../../stores/useBanksStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { UrlSchemeEditor } from './UrlSchemeEditor';
import { AnimatedModal } from '../ui/AnimatedModal';
import { Link2, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { haptic } from '../../utils/haptics';

export const UrlSchemeSection = () => {
  const t = useLocaleStore((s) => s.t);
  const configs = useUrlSchemeStore((s) => s.configs);
  const removeConfig = useUrlSchemeStore((s) => s.removeConfig);
  const banks = useBanksStore((s) => s.banks);
  const [editingBankCode, setEditingBankCode] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingBankCode, setDeletingBankCode] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        {t.urlScheme.sectionTitle}
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">

        {/* Configured banks */}
        {configs.map((config) => {
          const bank = banks.find((b) => b.code === config.bankCode);
          return (
            <div key={config.bankCode} className="flex items-stretch">
              {/* Edit row */}
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

              {/* Delete button — separated by a subtle divider */}
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

        {/* Add new — styled as a standard settings row */}
        <button
          type="button"
          onClick={() => {
            haptic();
            setIsAdding(true);
          }}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Plus size={18} className="text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
          </div>
          <p className="font-medium text-zinc-500 dark:text-zinc-400 text-sm">
            {t.urlScheme.addBank}
          </p>
        </button>
      </div>

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

      {/* Delete confirmation modal */}
      {deletingBankCode && (
        <AnimatedModal
          onClose={() => setDeletingBankCode(null)}
          overlayClass="z-50"
          cardClass="max-w-sm"
          ariaLabelledby="url-scheme-delete-title"
        >
          {(requestClose) => (
            <div className="p-5">
              <h2
                id="url-scheme-delete-title"
                className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2"
              >
                {t.urlScheme.deleteTitle}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                {t.urlScheme.deleteConfirm}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic();
                    removeConfig(deletingBankCode);
                    requestClose();
                  }}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-sm text-white bg-red-500 hover:bg-red-600 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {t.common.delete}
                </button>
              </div>
            </div>
          )}
        </AnimatedModal>
      )}
    </div>
  );
};
