import { Delete } from 'lucide-react';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  maxAmount?: number;
}

export const AmountInput = ({ value, onChange, maxAmount = 200000 }: AmountInputProps) => {
  const handleDigit = (digit: string) => {
    const newValue = value + digit;
    const numericValue = parseInt(newValue, 10);

    if (Number.isNaN(numericValue) || numericValue === 0) return;

    const normalized = numericValue.toString();
    if (normalized.length > 9 || numericValue > maxAmount) return;

    onChange(normalized);
  };

  const handleBackspace = () => {
    onChange(value.length <= 1 ? '' : value.slice(0, -1));
  };

  const formattedAmount = value ? new Intl.NumberFormat().format(parseInt(value, 10)) : '';

  const digitBtnClass =
    'h-16 rounded-xl text-2xl font-medium text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 active:bg-zinc-300 dark:active:bg-zinc-700 active:scale-95 transition-[background-color,transform] border border-zinc-200 dark:border-zinc-800';

  return (
    <div className="w-full max-w-xs mx-auto space-y-3">
      {/* Amount display */}
      <div className="flex flex-col items-center py-6">
        <span className="text-zinc-500 text-sm font-medium mb-2">Transfer Amount</span>
        <div className="flex items-baseline gap-1" aria-live="polite" aria-atomic="true">
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">$</span>
          <span
            className={`text-5xl font-bold ${value ? 'text-zinc-900 dark:text-white' : 'text-zinc-300 dark:text-zinc-700'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formattedAmount || '0'}
          </span>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear amount"
            className="mt-3 px-4 py-1.5 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2 select-none">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num.toString())}
            className={digitBtnClass}
          >
            {num}
          </button>
        ))}
        <button type="button" onClick={() => handleDigit('00')} className={digitBtnClass}>
          00
        </button>
        <button type="button" onClick={() => handleDigit('0')} className={digitBtnClass}>
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          aria-label="Delete one digit"
          className="h-16 rounded-xl text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 active:scale-95 transition-[background-color,transform] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
        >
          <Delete size={24} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
