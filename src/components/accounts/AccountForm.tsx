import { useState } from 'react';
import { BankSelect } from './BankSelect';
import { useAppStore } from '../../stores/useAppStore';
import { useBanksStore } from '../../stores/useBanksStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import type { BankAccount } from '../../types';
import { isValidAccount, isShortAccount, removeInvisibleChars } from '../../utils/twqr';
import { resolveIconSrc } from '../../utils/favicon';
import { AlertCircle, AlertTriangle, Globe } from 'lucide-react';

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
  const [iconUrl, setIconUrl] = useState(initialData?.iconUrl || '');
  const [iconError, setIconError] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [shortAccountWarning, setShortAccountWarning] = useState('');

  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((state) => state.banks);
  const selectedBank = banks.find((b) => b.code === bankCode);
  const bankUrlPlaceholder = selectedBank?.url || 'https://example.com/icon.png';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDuplicateWarning('');
    setShortAccountWarning('');

    if (!bankCode) {
      setError(t.form.selectBank);
      return;
    }

    if (!isValidAccount(accountNumber)) {
      if (isShortAccount(accountNumber)) {
        // Soft warning: shorter than standard but potentially valid (e.g. e-payment)
        setShortAccountWarning(t.form.shortAccountWarn(accountNumber.length));
        return;
      }
      setError(t.form.invalidAccount);
      return;
    }

    const state = useAppStore.getState();
    if (state.isDuplicate(bankCode, accountNumber, editingId)) {
      const num = accountNumber.replace(/^0+/, '');
      const newLabel = label || '';
      const exactMatch = state.accounts.some(
        (a) =>
          a.bankCode === bankCode &&
          a.accountNumber.replace(/^0+/, '') === num &&
          a.id !== editingId &&
          (a.label || '') === newLabel,
      );

      if (exactMatch) {
        setError(t.form.duplicateExact);
        return;
      }

      // Same bank + account but different label — ask for confirmation
      setDuplicateWarning(t.form.duplicateWarn);
      return;
    }

    onSubmit({ bankCode, accountNumber, label: label || undefined, iconUrl: iconUrl.trim() || undefined });
  };

  const resolvedIcon = resolveIconSrc(iconUrl);

  const inputClass =
    'w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <BankSelect
          value={bankCode}
          onChange={(code) => {
            setBankCode(code);
            setError('');
            setDuplicateWarning('');
            setShortAccountWarning('');
          }}
        />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-2 ml-1">
          {t.form.bankHint}
        </p>
      </div>

      <div>
        <label
          htmlFor="account-number"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          {t.form.accountLabel}
        </label>
        <input
          id="account-number"
          name="accountNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder={t.form.accountPlaceholder}
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(removeInvisibleChars(e.target.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 16));
            setError('');
            setDuplicateWarning('');
            setShortAccountWarning('');
          }}
          aria-invalid={Boolean(error && !isValidAccount(accountNumber))}
          aria-describedby={error && !isValidAccount(accountNumber) ? 'form-error' : undefined}
          className={`${inputClass} text-lg font-mono tracking-widest`}
        />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-2 ml-1">
          {t.form.accountHint}
        </p>
      </div>

      <div>
        <label
          htmlFor="account-label"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          {t.form.nicknameLabel}
        </label>
        <input
          id="account-label"
          name="label"
          type="text"
          autoComplete="off"
          placeholder={t.form.nicknamePlaceholder}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setDuplicateWarning('');
          }}
          className={inputClass}
        />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-2 ml-1">
          {t.form.nicknameHint}
        </p>
      </div>

      <div>
        <label
          htmlFor="account-icon-url"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 ml-1"
        >
          {t.form.iconLabel}
        </label>
        <div className="relative">
          {resolvedIcon && !iconError ? (
            <img
              src={resolvedIcon}
              alt=""
              onError={() => setIconError(true)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-sm object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" aria-hidden="true" />
          )}
          <input
            id="account-icon-url"
            name="iconUrl"
            type="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={bankUrlPlaceholder}
            value={iconUrl}
            onChange={(e) => {
              setIconUrl(e.target.value);
              setIconError(false);
            }}
            className={`${inputClass} pl-11`}
          />
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-2 ml-1">
          {t.form.iconHint}
        </p>
      </div>

      {error && (
        <div
          id="form-error"
          role="alert"
          aria-live="polite"
          className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none"
        >
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {shortAccountWarning && !error && !duplicateWarning && (
        <div
          role="alert"
          aria-live="polite"
          className="flex flex-col gap-3 bg-amber-50 dark:bg-amber-500/10 px-4 py-3.5 rounded-xl border border-amber-200/50 dark:border-amber-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
            <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
            <span className="font-medium">{shortAccountWarning}</span>
          </div>
          <div className="flex gap-2 ml-7.5">
            <button
              type="button"
              onClick={() => setShortAccountWarning('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => onSubmit({ bankCode, accountNumber, label: label || undefined, iconUrl: iconUrl.trim() || undefined })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
            >
              {t.form.saveShort}
            </button>
          </div>
        </div>
      )}

      {duplicateWarning && !error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex flex-col gap-3 bg-amber-50 dark:bg-amber-500/10 px-4 py-3.5 rounded-xl border border-amber-200/50 dark:border-amber-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
            <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
            <span className="font-medium">{duplicateWarning}</span>
          </div>
          <div className="flex gap-2 ml-7.5">
            <button
              type="button"
              onClick={() => setDuplicateWarning('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => onSubmit({ bankCode, accountNumber, label: label || undefined, iconUrl: iconUrl.trim() || undefined })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
            >
              {t.form.addAnyway}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          {t.form.saveAccount}
        </button>
      </div>
    </form>
  );
};
