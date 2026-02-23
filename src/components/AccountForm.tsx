import { useState } from 'react';
import { BankSelect } from './BankSelect';
import type { BankAccount } from '../types';
import { isValidAccount } from '../utils/twqr';
import { AlertCircle } from 'lucide-react';

interface AccountFormProps {
  initialData?: Partial<BankAccount>;
  onSubmit: (data: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
}

export const AccountForm = ({ initialData, onSubmit, onCancel }: AccountFormProps) => {
  const [bankCode, setBankCode] = useState(initialData?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankCode) {
      setError('Please select a bank');
      return;
    }

    if (!isValidAccount(accountNumber)) {
      setError('Account number must be 10\u201316 digits');
      return;
    }

    onSubmit({ bankCode, accountNumber, note });
  };

  const inputClass =
    'w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-[border-color,box-shadow]';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <BankSelect
        value={bankCode}
        onChange={(code) => {
          setBankCode(code);
          setError('');
        }}
      />

      <div>
        <label
          htmlFor="account-number"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
        >
          Account Number
        </label>
        <input
          id="account-number"
          name="accountNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="0000000000000000\u2026"
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 16));
            setError('');
          }}
          aria-invalid={Boolean(error && !isValidAccount(accountNumber))}
          aria-describedby={error && !isValidAccount(accountNumber) ? 'form-error' : undefined}
          className={`${inputClass} text-lg font-mono tracking-widest`}
        />
        <p className="text-zinc-400 text-xs mt-1.5">10\u201316 digits</p>
      </div>

      <div>
        <label
          htmlFor="account-note"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5"
        >
          Note (Optional)
        </label>
        <input
          id="account-note"
          name="note"
          type="text"
          autoComplete="off"
          placeholder="e.g. Rent, Salary\u2026"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <div
          id="form-error"
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/20 text-sm"
        >
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-[2] py-3.5 rounded-xl font-semibold text-white dark:text-black bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 active:scale-[0.98] transition-[background-color,transform]"
        >
          Save Account
        </button>
      </div>
    </form>
  );
};
