import { useState, useMemo, useRef } from 'react';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';
import { useBanksStore } from '../../stores/useBanksStore';
import { AnimatedModal } from '../ui/AnimatedModal';

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
          className="w-full flex items-center justify-between px-4 py-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 action-transition shadow-xs group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-100 dark:border-zinc-700/50">
              <Building2
                size={20}
                className="text-zinc-400 dark:text-zinc-500"
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
        <AnimatedModal
          onClose={() => { setIsOpen(false); setSearch(''); }}
          overlayClass="z-70"
          cardClass="max-h-[85svh] max-w-md flex flex-col"
          ariaLabelledby="bank-title"
          initialFocusRef={inputRef}
        >
          {(requestClose) => (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-col gap-4 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 id="bank-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    選擇銀行
                  </h2>
                  <button
                    type="button"
                    onClick={requestClose}
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
                    aria-label="搜尋銀行名稱或代碼"
                    placeholder="搜尋銀行名稱或代碼…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3.5 pl-11 pr-4 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Bank list */}
              <div className="flex-1 overflow-y-auto p-3 overscroll-contain">
                <div className="space-y-1 pb-safe">
                  {search && filteredBanks.length > 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 px-2 pb-2" aria-live="polite">
                      找到 {filteredBanks.length} 家銀行
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
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                        value === bank.code
                          ? 'chip-accent shadow-xs'
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
            </>
          )}
        </AnimatedModal>
      )}
    </>
  );
};
