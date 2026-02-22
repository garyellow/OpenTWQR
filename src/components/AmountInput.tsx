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

    // Ignore input that results in zero (prevents leading zeros)
    if (Number.isNaN(numericValue) || numericValue === 0) return;

    const normalized = numericValue.toString();

    // Limit length and amount
    if (normalized.length > 9) return;
    if (numericValue > maxAmount) return;

    onChange(normalized);
  };

  const handleBackspace = () => {
    if (value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const formattedAmount = value ? new Intl.NumberFormat().format(parseInt(value, 10)) : '';

  return (
    <div className="space-y-4 w-full max-w-xs mx-auto">
      {/* Amount Display */}
      <div className="flex flex-col items-center justify-center py-8">
        <span className="text-zinc-500 font-medium mb-3 text-sm uppercase tracking-wider">Transfer Amount</span>
        <div className="flex items-baseline justify-center gap-1 w-full overflow-hidden" aria-live="polite" aria-atomic="true">
          <span className="text-4xl text-emerald-500 font-bold">$</span>
          <span className={`text-6xl font-bold tracking-tighter ${value ? 'text-white' : 'text-zinc-700'}`}>
            {formattedAmount || '0'}
          </span>
        </div>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear amount"
            className="mt-4 h-11 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800/60"
          >
            Clear
          </button>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 select-none px-2 pb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num.toString())}
            className="h-20 w-full rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 text-3xl font-medium text-white active:bg-zinc-700 active:scale-95 transition-[background-color,color,transform] border border-zinc-800/50 flex items-center justify-center shadow-sm"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleDigit('00')}
          className="h-20 w-full rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 text-3xl font-medium text-white active:bg-zinc-700 active:scale-95 transition-[background-color,color,transform] border border-zinc-800/50 flex items-center justify-center shadow-sm"
        >
          00
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-20 w-full rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 text-3xl font-medium text-white active:bg-zinc-700 active:scale-95 transition-[background-color,color,transform] border border-zinc-800/50 flex items-center justify-center shadow-sm"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          aria-label="Delete one digit"
          className="h-20 w-full rounded-2xl bg-zinc-900/30 hover:bg-zinc-800/50 text-zinc-400 active:bg-zinc-700 active:text-white active:scale-95 transition-[background-color,color,transform] border border-zinc-800/30 flex items-center justify-center shadow-sm"
        >
          <Delete size={28} />
        </button>
      </div>
    </div>
  );
};
