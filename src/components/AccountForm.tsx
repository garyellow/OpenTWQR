import { useState } from 'react';
import { BankSelect } from './BankSelect';
import type { BankAccount } from '../types';
import { isValidAccount } from '../utils/twqr';
import { Save, AlertCircle } from 'lucide-react';

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
      setError('Account number must be 10-16 digits');
      return;
    }

    onSubmit({
      bankCode,
      accountNumber,
      note,
    });
  };

  const handleBankChange = (code: string) => {
    setBankCode(code);
    setError('');
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 16));
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <BankSelect value={bankCode} onChange={handleBankChange} />

      <div>
        <label htmlFor="account-number" className="block text-zinc-400 text-sm font-medium mb-2 ml-1">
          Account Number
        </label>
        <div className="relative">
          <input
            id="account-number"
            name="accountNumber"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="0000000000000000…"
            value={accountNumber}
            onChange={handleAccountChange}
            aria-invalid={Boolean(error && !isValidAccount(accountNumber))}
            aria-describedby={error && !isValidAccount(accountNumber) ? 'account-form-error' : undefined}
            className="w-full bg-black/40 border border-zinc-700/50 rounded-2xl p-4 text-xl font-mono tracking-widest text-white placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-[border-color,box-shadow] shadow-inner"
          />
        </div>
        <p className="text-zinc-500 text-xs mt-2 ml-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
          10-16 digits
        </p>
      </div>

      <div>
        <label htmlFor="account-note" className="block text-zinc-400 text-sm font-medium mb-2 ml-1">
          Note (Optional)
        </label>
        <input
          id="account-note"
          name="note"
          type="text"
          autoComplete="off"
          placeholder="e.g. Rent, Salary…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-black/40 border border-zinc-700/50 rounded-2xl p-4 text-white placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-[border-color,box-shadow] shadow-inner"
        />
      </div>

      {error && (
        <div id="account-form-error" role="alert" aria-live="polite" className="flex items-center gap-3 text-red-400 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} className="shrink-0" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl font-medium text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white transition-colors border border-zinc-700/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-[2] py-4 rounded-2xl font-bold text-black bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-[background-color,transform] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <Save size={20} />
          Save Account
        </button>
      </div>
    </form>
  );
};
