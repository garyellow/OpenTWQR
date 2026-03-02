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
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor:
              'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 12%, transparent)',
          }}
        >
          <Link2
            size={18}
            style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }}
            aria-hidden="true"
          />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {t.urlScheme.sectionTitle}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.urlScheme.sectionDesc}
          </p>
        </div>
      </div>

      {/* Configured banks list */}
      <div className="space-y-2">
        {configs.map((config) => {
          const bank = banks.find((b) => b.code === config.bankCode);
          return (
            <div
              key={config.bankCode}
              className="flex items-center gap-2 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => {
                  haptic();
                  setEditingBankCode(config.bankCode);
                }}
                className="flex-1 flex items-center gap-3 p-4 min-w-0 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 action-transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-sm">
                    {bank?.name || config.bankCode}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
                    {config.urlTemplate}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-zinc-400 shrink-0"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic();
                  setDeletingBankCode(config.bankCode);
                }}
                aria-label={t.common.delete}
                className="p-3 mr-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 action-transition shrink-0"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}

        {/* Add new button */}
        <button
          type="button"
          onClick={() => {
            haptic();
            setIsAdding(true);
          }}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300 action-transition text-sm font-medium"
        >
          <Plus size={18} aria-hidden="true" />
          {t.urlScheme.addBank}
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
          cardClass="max-w-sm p-6"
          ariaLabelledby="url-scheme-delete-title"
        >
          {(requestClose) => (
            <>
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
                  className="flex-1 py-3.5 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition"
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
                  className="flex-1 py-3.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-98 action-transition"
                >
                  {t.common.delete}
                </button>
              </div>
            </>
          )}
        </AnimatedModal>
      )}
    </section>
  );
};
