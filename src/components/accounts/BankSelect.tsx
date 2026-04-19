import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';
import { useBanksStore } from '../../stores/useBanksStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useAnimatedToggle } from '../../hooks/useAnimatedToggle';
import { stripCompanySuffix } from '../../utils/twqr';

interface BankSelectProps {
  value: string;
  onChange: (code: string) => void;
}

/**
 * Bank selector trigger + full-screen solid panel.
 *
 * Uses a solid-background fixed overlay (not a semi-transparent backdrop modal)
 * so it never shows a ghost frame when used inside another modal.
 */
export const BankSelect = ({ value, onChange }: BankSelectProps) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const banks = useBanksStore((state) => state.banks);
  const t = useLocaleStore((s) => s.t);
  const panelToggle = useAnimatedToggle({ historyBack: true });

  const selectedBank = useMemo(() => banks.find((b) => b.code === value), [banks, value]);

  const filteredBanks = useMemo(() => {
    const q = search.toLowerCase();
    return banks.filter(
      (b) =>
        stripCompanySuffix(b.name).toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.code.includes(q),
    );
  }, [banks, search]);

  const open = useCallback(() => {
    setSearch('');
    panelToggle.open();
  }, [panelToggle]);

  const requestClose = useCallback(() => {
    panelToggle.close(() => setSearch(''));
  }, [panelToggle]);

  useEffect(() => {
    if (!panelToggle.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelToggle.isOpen, requestClose]);

  useEffect(() => {
    if (panelToggle.isOpen && !panelToggle.isClosing) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [panelToggle.isClosing, panelToggle.isOpen]);

  useFocusTrap(panelRef, panelToggle.isOpen && !panelToggle.isClosing);

  return (
    <>
      {/* Trigger button */}
      <div>
        <label
          htmlFor="bank-select-trigger"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          {t.form.bankLabel}
        </label>
        <button
          id="bank-select-trigger"
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          aria-expanded={panelToggle.isOpen}
          className="w-full flex items-center justify-between px-4 py-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 action-transition shadow-xs group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            </div>
            {selectedBank ? (
              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-base">
                  {stripCompanySuffix(selectedBank.name)}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  {selectedBank.code}
                </div>
              </div>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 text-base">
                {t.form.bankPlaceholder}
              </span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
            <ChevronDown size={18} className="text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
          </div>
        </button>
      </div>

      {/* Full-screen solid panel — solid bg prevents ghost frames from parent modals */}
      {panelToggle.isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bank-panel-title"
          className={`fixed inset-0 z-200 bg-white dark:bg-zinc-900 flex flex-col motion-reduce:animate-none ${
            panelToggle.isClosing
              ? 'animate-out slide-out-to-bottom-4 fade-out duration-200'
              : 'animate-in slide-in-from-bottom-4 fade-in duration-200'
          }`}
          onAnimationEnd={panelToggle.onAnimationEnd}
        >
          {/* Header */}
          <div className="p-5 pt-[max(1.25rem,env(safe-area-inset-top))] border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <h2
                id="bank-panel-title"
                className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                {t.bankSelect.title}
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

            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={18}
                aria-hidden="true"
              />
              <input
                id="bank-search"
                ref={inputRef}
                name="bankSearch"
                type="text"
                autoComplete="off"
                spellCheck={false}
                aria-label={t.bankSelect.searchLabel}
                placeholder={t.bankSelect.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3.5 pl-11 pr-4 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition"
              />
            </div>
          </div>

          {/* Bank list */}
          <div className="flex-1 overflow-y-auto p-3 overscroll-contain">
            <div className="space-y-1 pb-safe max-w-md mx-auto">
              {search && filteredBanks.length > 0 && (
                <p
                  className="text-xs text-zinc-500 dark:text-zinc-400 px-2 pb-2"
                  aria-live="polite"
                >
                  {t.bankSelect.found(filteredBanks.length)}
                </p>
              )}
              {filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => {
                    onChange(bank.code);
                    requestClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
                    value === bank.code
                      ? 'chip-accent shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="font-medium truncate text-base">
                    {stripCompanySuffix(bank.name)}
                  </span>
                  <span
                    className={`font-mono text-sm px-2.5 py-1 rounded-lg shrink-0 ml-3 ${
                      value === bank.code
                        ? 'bg-white/20 dark:bg-black/10 text-white dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {bank.code}
                  </span>
                </button>
              ))}

              {filteredBanks.length === 0 && (
                <div className="py-20 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                    <Search size={24} aria-hidden="true" />
                  </div>
                  <p>{t.bankSelect.noResult(search)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
