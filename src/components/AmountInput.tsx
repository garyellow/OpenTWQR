import { Delete, X } from 'lucide-react';

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
    'h-16 sm:h-14 rounded-2xl text-3xl sm:text-2xl font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-800 transition-colors flex items-center justify-center';

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
      {/* Amount display */}
      <div className="flex flex-col items-center justify-center min-h-[120px] relative">
        <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-2">轉帳金額</span>
        <div className="flex items-center justify-center w-full relative" aria-live="polite" aria-atomic="true">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold text-emerald-600 dark:text-emerald-400">$</span>
            <span
              className={`text-6xl font-semibold tracking-tight ${
                value ? 'text-zinc-900 dark:text-white' : 'text-zinc-300 dark:text-zinc-700'
              }`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formattedAmount || '0'}
            </span>
          </div>
          {/* Clear button - absolute positioned to avoid layout shift */}
          <div className="absolute right-0 flex items-center justify-center w-12 h-12">
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="清除金額"
              className={`p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-[opacity,transform,background-color,color] ${
                value ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
              }`}
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-2 select-none px-4">
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
          aria-label="刪除一位數字"
          className="h-16 sm:h-14 rounded-2xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-800 transition-colors flex items-center justify-center"
        >
          <Delete size={28} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
