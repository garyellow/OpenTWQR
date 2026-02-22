import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';
import { useBanksStore } from '../stores/useBanksStore';

interface BankSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export const BankSelect = ({ value, onChange, className }: BankSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const banks = useBanksStore((state) => state.banks);

  const selectedBank = useMemo(() => banks.find((bank) => bank.code === value), [banks, value]);

  const filteredBanks = useMemo(() => {
    const query = search.toLowerCase();
    return banks.filter(
      (bank) =>
        bank.name.toLowerCase().includes(query) || bank.code.includes(query)
    );
  }, [banks, search]);

  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frameId);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <div className={className}>
        <label htmlFor="bank-select-trigger" className="block text-zinc-400 text-sm font-medium mb-2 ml-1">
          Bank
        </label>
        <button
          id="bank-select-trigger"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-controls="bank-select-dialog"
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between p-4 bg-black/40 border border-zinc-700/50 rounded-2xl text-left hover:border-zinc-600 hover:bg-black/60 transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 shadow-inner group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-300 transition-colors">
              <Building2 size={24} />
            </div>
            {selectedBank ? (
              <div>
                <div className="font-bold text-white text-lg">{selectedBank.name}</div>
                <div className="text-sm text-zinc-500 font-mono tracking-wider">{selectedBank.code}</div>
              </div>
            ) : value ? (
              <div>
                <div className="font-bold text-amber-300 text-lg">Legacy bank code</div>
                <div className="text-sm text-zinc-400 font-mono tracking-wider">{value}</div>
              </div>
            ) : (
              <span className="text-zinc-500 font-medium text-lg">Select a bank</span>
            )}
          </div>
          <ChevronDown className="text-zinc-600 group-hover:text-zinc-400 transition-colors" size={24} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
             id="bank-select-dialog"
             role="dialog"
             aria-modal="true"
             aria-labelledby="bank-select-title"
             className="w-full h-[90vh] sm:h-[80vh] max-w-md bg-zinc-900 rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-10 duration-300 overscroll-contain"
             onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h2 id="bank-select-title" className="text-xl font-bold text-white">Select Bank</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close bank selector"
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <label htmlFor="bank-search" className="sr-only">Search banks by name or code</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                  id="bank-search"
                  ref={inputRef}
                  name="bankSearch"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Search by name or code…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-[border-color,box-shadow] text-lg"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              <div className="grid gap-1 pb-safe">
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => {
                      onChange(bank.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl transition-[background-color,border-color,color] ${
                      value === bank.code
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'hover:bg-zinc-800/50 text-zinc-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{bank.name}</span>
                    </div>
                    <span className={`font-mono text-sm px-2.5 py-1 rounded-lg font-medium tracking-wider ${
                      value === bank.code ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {bank.code}
                    </span>
                  </button>
                ))}

                {filteredBanks.length === 0 && (
                  <div className="py-20 text-center text-zinc-500 flex flex-col items-center gap-4">
                    <Search size={40} className="text-zinc-700" />
                    <p>No banks found matching "{search}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div
             className="absolute inset-0 -z-10"
             onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
};
