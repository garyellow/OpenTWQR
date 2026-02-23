import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';
import { useBanksStore } from '../stores/useBanksStore';

interface BankSelectProps {
  value: string;
  onChange: (code: string) => void;
}

export const BankSelect = ({ value, onChange }: BankSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const banks = useBanksStore((state) => state.banks);

  const selectedBank = useMemo(() => banks.find((b) => b.code === value), [banks, value]);

  const filteredBanks = useMemo(() => {
    const q = search.toLowerCase();
    return banks.filter((b) => b.name.toLowerCase().includes(q) || b.code.includes(q));
  }, [banks, search]);

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <>
      <div>
        <label
          htmlFor="bank-select-trigger"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
        >
          Bank
        </label>
        <button
          id="bank-select-trigger"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Building2
              size={20}
              className="text-zinc-400 dark:text-zinc-500 shrink-0"
              aria-hidden="true"
            />
            {selectedBank ? (
              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-white truncate">
                  {selectedBank.name}
                </div>
                <div className="text-xs text-zinc-500 font-mono">{selectedBank.code}</div>
              </div>
            ) : value ? (
              <div className="min-w-0">
                <div className="font-semibold text-amber-600 dark:text-amber-300 truncate">
                  Legacy bank code
                </div>
                <div className="text-xs text-zinc-500 font-mono">{value}</div>
              </div>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500">Select a bank\u2026</span>
            )}
          </div>
          <ChevronDown
            size={18}
            className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0"
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-title"
            className="w-full h-[85vh] sm:h-[75vh] max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-xl border-t border-zinc-200 dark:border-zinc-800 sm:border overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <h2 id="bank-title" className="text-lg font-bold text-zinc-900 dark:text-white">
                Select Bank
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <label htmlFor="bank-search" className="sr-only">
                Search banks
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
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
                  placeholder="Search by name or code\u2026"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-[border-color,box-shadow]"
                />
              </div>
            </div>

            {/* Bank list */}
            <div className="flex-1 overflow-y-auto p-2 overscroll-contain">
              <div className="space-y-0.5 pb-safe">
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      onChange(bank.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      value === bank.code
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-medium truncate">{bank.name}</span>
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ml-2 ${
                        value === bank.code
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {bank.code}
                    </span>
                  </button>
                ))}

                {filteredBanks.length === 0 && (
                  <div className="py-16 text-center text-zinc-400">
                    <Search
                      size={32}
                      className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600"
                      aria-hidden="true"
                    />
                    <p>No banks found for &ldquo;{search}&rdquo;</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
