import { useState, useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AmountInput } from '../components/AmountInput';
import { QRDisplay } from '../components/QRDisplay';
import { generateTWQR } from '../utils/twqr';
import { Wallet, QrCode, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useBanksStore } from '../stores/useBanksStore';
import { ThemeToggle } from '../components/ThemeToggle';

export const ReceivePage = () => {
  const [amount, setAmount] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const { accounts, selectedAccountId } = useAppStore();
  const banks = useBanksStore((state) => state.banks);
  const navigate = useNavigate();

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId],
  );

  const bankName = useMemo(() => {
    return banks.find((b) => b.code === selectedAccount?.bankCode)?.name || '';
  }, [banks, selectedAccount]);

  const qrString = useMemo(() => {
    if (!selectedAccount) return null;
    const numAmount = amount ? parseInt(amount, 10) : 0;
    return generateTWQR({
      bankCode: selectedAccount.bankCode,
      accountNumber: selectedAccount.accountNumber,
      amount: numAmount,
      note: selectedAccount.note,
    });
  }, [selectedAccount, amount]);

  /* ---------- Empty state ---------- */
  if (accounts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <Wallet size={36} className="text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Welcome to OpenTWQR</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Add a bank account to start generating payment QR codes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/accounts')}
          className="w-full max-w-xs py-3.5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black font-semibold rounded-xl text-lg hover:bg-emerald-700 dark:hover:bg-emerald-400 active:scale-[0.98] transition-[background-color,transform]"
        >
          Add Bank Account
        </button>
      </div>
    );
  }

  /* ---------- Main layout ---------- */
  return (
    <div className="min-h-screen flex flex-col px-safe">
      <a
        href="#receive-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        Skip to main content
      </a>

      <main id="receive-main" className="flex-1 flex flex-col p-5 max-w-md mx-auto w-full gap-5 pb-safe">
        {/* Header */}
        <header className="flex justify-between items-center pt-safe">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Receive</h1>
          <ThemeToggle />
        </header>

        {/* Account selector */}
        <Link
          to="/accounts"
          className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {selectedAccount?.bankCode.substring(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-white truncate">
              {bankName || 'My Account'}
            </p>
            <p className="text-sm text-zinc-500 font-mono mt-0.5 tracking-wider">
              {selectedAccount?.accountNumber
                .slice(-4)
                .padStart(selectedAccount.accountNumber.length, '•')}
            </p>
          </div>
          <ChevronRight
            size={18}
            className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0"
            aria-hidden="true"
          />
        </Link>

        {/* Amount input & generate button */}
        <div className="flex-1 flex flex-col justify-end gap-4">
          <AmountInput value={amount} onChange={setAmount} />

          <div className="pb-4">
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black font-semibold rounded-xl text-lg hover:bg-emerald-700 dark:hover:bg-emerald-400 active:scale-[0.98] transition-[background-color,transform]"
            >
              <QrCode size={22} aria-hidden="true" />
              Generate QR Code
            </button>
          </div>
        </div>
      </main>

      {showQR && qrString && (
        <QRDisplay
          value={qrString}
          amount={amount ? parseInt(amount, 10) : undefined}
          bankName={bankName}
          accountNumber={selectedAccount?.accountNumber}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};
