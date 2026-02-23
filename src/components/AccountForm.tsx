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
      setError('請選擇銀行');
      return;
    }

    if (!isValidAccount(accountNumber)) {
      setError('帳號必須為 10–16 位數字');
      return;
    }

    onSubmit({ bankCode, accountNumber, note });
  };

  const inputClass =
    'w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl px-4 py-4 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white focus-visible:border-zinc-900 dark:focus-visible:border-white transition-all shadow-sm';

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
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          帳號
        </label>
        <input
          id="account-number"
          name="accountNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="0000000000000000..."
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 16));
            setError('');
          }}
          aria-invalid={Boolean(error && !isValidAccount(accountNumber))}
          aria-describedby={error && !isValidAccount(accountNumber) ? 'form-error' : undefined}
          className={`${inputClass} text-lg font-mono tracking-widest`}
        />
        <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-2 ml-1">10–16 位數字</p>
      </div>

      <div>
        <label
          htmlFor="account-note"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          備註（選填）
        </label>
        <input
          id="account-note"
          name="note"
          type="text"
          autoComplete="off"
          placeholder="例如：房租、薪資..."
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
          className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 rounded-2xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200"
        >
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="flex-[2] py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-sm"
        >
          儲存帳戶
        </button>
      </div>
    </form>
  );
};
