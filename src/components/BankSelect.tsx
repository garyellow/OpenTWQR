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
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          銀行
        </label>
        <button
          id="bank-select-trigger"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between px-4 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-[background-color,border-color,box-shadow] shadow-sm group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-700/50">
              <Building2
                size={20}
                className="text-zinc-500 dark:text-zinc-400"
                aria-hidden="true"
              />
            </div>
            {selectedBank ? (
              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-base">
                  {selectedBank.name}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{selectedBank.code}</div>
              </div>
            ) : value ? (
              <div className="min-w-0">
                <div className="font-semibold text-amber-600 dark:text-amber-400 truncate text-base">
                  舊版銀行代碼
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">{value}</div>
              </div>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 text-base">請選擇銀行…</span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
            <ChevronDown
              size={18}
              className="text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
          </div>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-title"
            className="w-full h-[85vh] sm:h-[75vh] max-w-md bg-white dark:bg-zinc-900 rounded-t-[2rem] sm:rounded-3xl flex flex-col shadow-2xl border-t border-zinc-200/50 dark:border-zinc-800/50 sm:border overscroll-contain animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-4 shrink-0">
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto sm:hidden" />
              <div className="flex items-center justify-between">
                <h2 id="bank-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  選擇銀行
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="關閉"
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
                  placeholder="搜尋銀行名稱或代碼…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl py-3.5 pl-11 pr-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white focus-visible:border-zinc-900 dark:focus-visible:border-white transition-[border-color,box-shadow,background-color,color] shadow-sm"
                />
              </div>
            </div>

            {/* Bank list */}
            <div className="flex-1 overflow-y-auto p-3 overscroll-contain">
              <div className="space-y-1 pb-safe">
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      onChange(bank.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-[background-color,color,box-shadow] ${
                      value === bank.code
                        ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-medium truncate text-base">{bank.name}</span>
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
                    <p>找不到「{search}」的搜尋結果</p>
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
