import { useEffect, useMemo, useRef, useState } from 'react';
import { BankSelect } from './BankSelect';
import { useAppStore } from '../../stores/useAppStore';
import { useBanksStore } from '../../stores/useBanksStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import type { BankAccount } from '../../types';
import { isValidAccount, isShortAccount, removeInvisibleChars } from '../../utils/twqr';
import { resolveIconSrc } from '../../utils/favicon';
import { AlertCircle, Globe } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type PendingConfirmation = 'short-account' | 'duplicate' | null;
type ErrorTarget = 'bank' | 'account' | null;

interface AccountFormProps {
  initialData?: Partial<BankAccount>;
  /** When editing, pass the account id to exclude self from duplicate check */
  editingId?: string;
  onSubmit: (data: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const AccountForm = ({ initialData, editingId, onSubmit, onCancel, onDirtyChange }: AccountFormProps) => {
  const [bankCode, setBankCode] = useState(initialData?.bankCode || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [label, setLabel] = useState(initialData?.label || '');
  const [iconUrl, setIconUrl] = useState(initialData?.iconUrl || '');
  const [iconError, setIconError] = useState(false);
  const [error, setError] = useState('');
  const [errorTarget, setErrorTarget] = useState<ErrorTarget>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const bankTriggerRef = useRef<HTMLButtonElement>(null);
  const accountInputRef = useRef<HTMLInputElement>(null);

  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((state) => state.banks);
  const selectedBank = banks.find((b) => b.code === bankCode);
  const bankUrlPlaceholder = selectedBank?.url || 'https://example.com/icon.png';
  const initialValues = useMemo(() => ({
    bankCode: initialData?.bankCode || '',
    accountNumber: initialData?.accountNumber || '',
    label: initialData?.label || '',
    iconUrl: initialData?.iconUrl || '',
  }), [initialData?.accountNumber, initialData?.bankCode, initialData?.iconUrl, initialData?.label]);
  const isDirty = bankCode !== initialValues.bankCode
    || accountNumber !== initialValues.accountNumber
    || label !== initialValues.label
    || iconUrl !== initialValues.iconUrl;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const buildPayload = () => ({
    bankCode,
    accountNumber,
    label: label || undefined,
    iconUrl: iconUrl.trim() || undefined,
  });

  const clearError = () => {
    setError('');
    setErrorTarget(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setPendingConfirmation(null);

    if (!bankCode) {
      setError(t.form.selectBank);
      setErrorTarget('bank');
      bankTriggerRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!isValidAccount(accountNumber)) {
      if (isShortAccount(accountNumber)) {
        setPendingConfirmation('short-account');
        return;
      }
      setError(t.form.invalidAccount);
      setErrorTarget('account');
      accountInputRef.current?.focus({ preventScroll: true });
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
        setErrorTarget('account');
        accountInputRef.current?.focus({ preventScroll: true });
        return;
      }

      // Same bank + account but different label — ask for confirmation
      setPendingConfirmation('duplicate');
      return;
    }

    onSubmit(buildPayload());
  };

  const resolvedIcon = resolveIconSrc(iconUrl);
  const formErrorId = 'form-error';

  const inputClass =
    'w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <BankSelect
          value={bankCode}
          onChange={(code) => {
            setBankCode(code);
            clearError();
            setPendingConfirmation(null);
          }}
          triggerRef={bankTriggerRef}
          ariaInvalid={errorTarget === 'bank'}
          ariaDescribedBy={errorTarget === 'bank' ? formErrorId : undefined}
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
          ref={accountInputRef}
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
            clearError();
            setPendingConfirmation(null);
          }}
          aria-invalid={errorTarget === 'account'}
          aria-errormessage={errorTarget === 'account' ? formErrorId : undefined}
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
            setPendingConfirmation(null);
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
          id={formErrorId}
          role="alert"
          aria-live="polite"
          className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none"
        >
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <span className="font-medium">{error}</span>
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

      {pendingConfirmation === 'short-account' && (
        <ConfirmDialog
          title={t.form.shortAccountConfirmTitle}
          description={t.form.shortAccountWarn(accountNumber.length)}
          confirmLabel={t.form.saveShort}
          onConfirm={() => onSubmit(buildPayload())}
          onCancel={() => setPendingConfirmation(null)}
          variant="warning"
        />
      )}

      {pendingConfirmation === 'duplicate' && (
        <ConfirmDialog
          title={t.form.duplicateConfirmTitle}
          description={t.form.duplicateWarn}
          confirmLabel={t.form.addAnyway}
          onConfirm={() => onSubmit(buildPayload())}
          onCancel={() => setPendingConfirmation(null)}
          variant="warning"
        />
      )}
    </form>
  );
};
