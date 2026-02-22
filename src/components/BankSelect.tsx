import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';
import { BANKS } from '../data/banks';

interface BankSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export const BankSelect = ({ value, onChange, className }: BankSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBank = useMemo(() => BANKS.find((b) => b.code === value), [value]);

  const filteredBanks = useMemo(() => {
    const query = search.toLowerCase();
    return BANKS.filter(
      (bank) =>
        bank.name.toLowerCase().includes(query) || bank.code.includes(query)
    );
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
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
          className="w-full flex items-center justify-between p-4 bg-black/40 border border-zinc-700/50 rounded-2xl text-left hover:border-zinc-600 hover:bg-black/60 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-inner group"
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
             className="w-full h-[90vh] sm:h-[80vh] max-w-md bg-zinc-900 rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-10 duration-300"
             onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white">Select Bank</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search by name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all text-lg"
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
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
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
