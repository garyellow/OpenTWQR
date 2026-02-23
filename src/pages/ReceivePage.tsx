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
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8 bg-white dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <Wallet size={48} className="text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">歡迎使用 OpenTWQR</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto leading-relaxed text-lg">
            新增銀行帳戶即可開始產生收款 QR Code。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/accounts')}
          className="w-full max-w-xs py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-sm mt-4"
        >
          新增銀行帳戶
        </button>
      </div>
    );
  }

  /* ---------- Main layout ---------- */
  return (
    <div className="min-h-screen flex flex-col px-safe bg-white dark:bg-zinc-950">
      <a
        href="#receive-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        跳至主要內容
      </a>

      <main id="receive-main" className="flex-1 flex flex-col max-w-md mx-auto w-full pb-safe">
        {/* Header */}
        <header className="flex justify-between items-center p-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">收款</h1>
          <ThemeToggle />
        </header>

        {/* Account selector */}
        <div className="px-5 mb-2">
          <Link
            to="/accounts"
            className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors group active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm border border-zinc-100 dark:border-zinc-700/50">
              {selectedAccount?.bankCode.substring(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-white truncate text-base">
                {bankName || '我的帳戶'}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 tracking-wider">
                {selectedAccount?.accountNumber
                  .slice(-4)
                  .padStart(selectedAccount.accountNumber.length, '•')}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
              <ChevronRight
                size={18}
                className="text-zinc-500 dark:text-zinc-400"
                aria-hidden="true"
              />
            </div>
          </Link>
        </div>

        {/* Amount input & generate button */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex-1 flex items-center justify-center">
            <AmountInput value={amount} onChange={setAmount} />
          </div>

          <div className="p-5 pt-2">
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-sm"
            >
              <QrCode size={22} aria-hidden="true" />
              產生 QR Code
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
