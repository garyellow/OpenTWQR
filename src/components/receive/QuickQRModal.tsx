import { useState, useMemo, useCallback } from 'react';
import { QrCode, Save, X, AlertCircle } from 'lucide-react';
import { BankSelect } from '../accounts/BankSelect';
import { AnimatedModal } from '../ui/AnimatedModal';
import { QRDisplay } from './QRDisplay';
import { generateTWQR, isValidAccount, normalizeAccountNumber, stripCompanySuffix } from '../../utils/twqr';
import { useBanksStore } from '../../stores/useBanksStore';
import { useAppStore } from '../../stores/useAppStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { resolveIconSrc } from '../../utils/favicon';
import { generateId } from '../../utils/generateId';
import { haptic } from '../../utils/haptics';

interface QuickQRModalProps {
  onClose: () => void;
}

/**
 * Quick QR Code generator — enter bank + account number + optional amount,
 * generate a QR Code immediately without creating a saved account first.
 * Offers a "Save this account" action after generation.
 */
export const QuickQRModal = ({ onClose }: QuickQRModalProps) => {
  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((state) => state.banks);
  const addAccount = useAppStore((s) => s.addAccount);
  const selectAccount = useAppStore((s) => s.selectAccount);

  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const bank = useMemo(() => banks.find((b) => b.code === bankCode), [banks, bankCode]);
  const bankName = stripCompanySuffix(bank?.name || '');
  const bankIconUrl = useMemo(() => resolveIconSrc(bank?.url), [bank]);

  const numAmount = useMemo(() => {
    const n = parseInt(amount, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  const qrString = useMemo(() => {
    if (!bankCode || !isValidAccount(accountNumber)) return null;
    return generateTWQR({
      bankCode,
      accountNumber,
      amount: numAmount,
    });
  }, [bankCode, accountNumber, numAmount]);

  const shareData = useMemo(() => {
    if (!bankCode || !isValidAccount(accountNumber)) return undefined;
    return {
      bankCode,
      accountNumber,
      amount: numAmount > 0 ? numAmount : undefined,
    };
  }, [bankCode, accountNumber, numAmount]);

  const handleGenerate = useCallback(() => {
    setError('');

    if (!bankCode) {
      setError(t.form.selectBank);
      return;
    }

    if (!isValidAccount(accountNumber)) {
      setError(t.form.invalidAccount);
      return;
    }

    haptic();
    setHasGenerated(true);
    setShowQR(true);
  }, [bankCode, accountNumber, t]);

  const handleSave = useCallback(() => {
    if (saved || !bankCode || !isValidAccount(accountNumber)) return;

    haptic();
    const state = useAppStore.getState();
    if (state.isDuplicate(bankCode, accountNumber)) {
      // Already exists — switch to the existing account instead of creating a duplicate.
      const existing = state.accounts.find(
        (a) =>
          a.bankCode === bankCode &&
          a.accountNumber.replace(/^0+/, '') === accountNumber.replace(/^0+/, ''),
      );
      if (existing) selectAccount(existing.id);
    } else {
      const id = generateId();
      addAccount({ id, bankCode, accountNumber });
      selectAccount(id);
    }
    setSaved(true);
  }, [saved, bankCode, accountNumber, addAccount, selectAccount]);

  const inputClass =
    'w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs';

  return (
    <>
      <AnimatedModal
        onClose={onClose}
        overlayClass="z-50"
        cardClass="max-w-sm"
        ariaLabelledby="quick-qr-title"
        disableFocusTrap={showQR}
      >
        {(requestClose) => (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2
                id="quick-qr-title"
                className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                {t.receive.quickAccessTitle}
              </h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label={t.common.close}
                className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.receive.quickAccessDesc}
            </p>

            {/* Bank selector */}
            <BankSelect value={bankCode} onChange={(code) => { setBankCode(code); setError(''); setSaved(false); setHasGenerated(false); }} />

            {/* Account number */}
            <div>
              <label
                htmlFor="quick-account"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
              >
                {t.form.accountLabel}
              </label>
              <input
                id="quick-account"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(normalizeAccountNumber(e.target.value));
                  setError('');
                  setSaved(false);
                  setHasGenerated(false);
                }}
                placeholder={t.form.accountPlaceholder}
                maxLength={16}
                className={inputClass}
              />
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 ml-1">
                {t.form.accountHint}
              </p>
            </div>

            {/* Amount (optional) */}
            <div>
              <label
                htmlFor="quick-amount"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
              >
                {t.amount.label}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-sm font-medium pointer-events-none">
                  NT$
                </span>
                <input
                  id="quick-amount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="0"
                  className={`${inputClass} pl-12`}
                />
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 ml-1">
                {t.amount.zeroHint}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" aria-live="polite" className="flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none">
                <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              {/* Save button — only visible after first QR generation */}
              {hasGenerated && qrString && !saved && (
                <button
                  type="button"
                  onClick={handleSave}
                  aria-label={t.receive.quickAccessSave}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  <Save size={18} aria-hidden="true" />
                  <span>{t.receive.quickAccessSave}</span>
                </button>
              )}
              {saved && (
                <div className="flex items-center px-4 py-3.5 rounded-xl text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10">
                  {t.receive.quickAccessSaved}
                </div>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 btn-accent font-semibold rounded-xl active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                <QrCode size={18} aria-hidden="true" />
                {t.receive.quickAccessGenerate}
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* QR Display overlay */}
      {showQR && qrString && shareData && (
        <QRDisplay
          value={qrString}
          amount={numAmount || undefined}
          bankName={bankName}
          accountNumber={accountNumber}
          bankCode={bankCode}
          note={undefined}
          shareData={shareData}
          onClose={() => setShowQR(false)}
          bankIconUrl={bankIconUrl}
        />
      )}
    </>
  );
};
