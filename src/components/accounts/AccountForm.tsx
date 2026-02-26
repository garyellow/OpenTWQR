import { useState } from 'react';
import { BankSelect } from './BankSelect';
import { useAppStore } from '../../stores/useAppStore';
import type { BankAccount } from '../../types';
import { isValidAccount } from '../../utils/twqr';
import { AlertCircle } from 'lucide-react';

interface AccountFormProps {
  initialData?: Partial<BankAccount>;
  /** When editing, pass the account id to exclude self from duplicate check */
  editingId?: string;
  onSubmit: (data: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
}

export const AccountForm = ({ initialData, editingId, onSubmit, onCancel }: AccountFormProps) => {
  const [bankCode, setBankCode] = useState(initialData?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [label, setLabel] = useState(initialData?.label || '');
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

    if (useAppStore.getState().isDuplicate(bankCode, accountNumber, editingId)) {
      setError('此銀行帳號已存在');
      return;
    }

    onSubmit({ bankCode, accountNumber, label: label || undefined });
  };

  const inputClass =
    'w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm';

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
          placeholder="0000000000000000…"
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
          htmlFor="account-label"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          帳戶暱稱（選填）
        </label>
        <input
          id="account-label"
          name="label"
          type="text"
          autoComplete="off"
          placeholder="例如：郵局、薪轉戶…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
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
          className="flex-1 py-4 rounded-2xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          取消
        </button>
        <button
          type="submit"
          className="flex-[2] py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          儲存帳戶
        </button>
      </div>
    </form>
  );
};
