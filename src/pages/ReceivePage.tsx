import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AmountInput } from '../components/AmountInput';
import { QRDisplay } from '../components/QRDisplay';
import { AnimatedModal } from '../components/AnimatedModal';
import { generateTWQR, maskAccount } from '../utils/twqr';
import { Wallet, QrCode, ChevronRight, MessageSquare, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useBanksStore } from '../stores/useBanksStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { haptic } from '../utils/haptics';

export const ReceivePage = () => {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { accounts, selectedAccountId, isHydrated } = useAppStore();
  const banks = useBanksStore((state) => state.banks);
  const navigate = useNavigate();

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId],
  );

  const bankName = useMemo(() => {
    return banks.find((b) => b.code === selectedAccount?.bankCode)?.name || '';
  }, [banks, selectedAccount]);

  /* ---------- QR string generation ---------- */
  const qrString = useMemo(() => {
    if (!selectedAccount) return null;
    const numAmount = amount ? parseInt(amount, 10) : 0;
    return generateTWQR({
      bankCode: selectedAccount.bankCode,
      accountNumber: selectedAccount.accountNumber,
      amount: numAmount,
      note: note || undefined,
    });
  }, [selectedAccount, amount, note]);

  /* ---------- Share data for encrypted sharing ---------- */
  const shareData = useMemo(() => {
    if (!selectedAccount) return undefined;
    const numAmount = amount ? parseInt(amount, 10) : 0;
    return {
      bankCode: selectedAccount.bankCode,
      accountNumber: selectedAccount.accountNumber,
      amount: numAmount > 0 ? numAmount : undefined,
      note: note || undefined,
    };
  }, [selectedAccount, amount, note]);

  const handleCloseQR = useCallback(() => {
    setShowQR(false);
  }, []);

  /* ---------- Hydrating from IndexedDB ---------- */
  if (!isHydrated) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  /* ---------- Empty state ---------- */
  if (accounts.length === 0) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <Wallet size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">歡迎使用 OpenTWQR</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto leading-relaxed text-lg">
            新增銀行帳戶即可開始產生收款 QR Code。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/accounts', { viewTransition: true })}
          className="w-full max-w-xs py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          新增銀行帳戶
        </button>
      </div>
    );
  }

  /* ---------- Main layout ---------- */
  return (
    <div className="h-svh flex flex-col overflow-hidden px-safe bg-zinc-50 dark:bg-zinc-950">
      <a
        href="#receive-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-white dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        跳至主要內容
      </a>

      <main id="receive-main" className="flex-1 flex flex-col min-h-0 max-w-md mx-auto w-full pb-safe">
        {/* Header */}
        <header className="shrink-0 flex justify-between items-center p-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">收款</h1>
          <ThemeToggle />
        </header>

        {/* Account selector */}
        <div className="shrink-0 px-5 mb-2">
          <Link
            to="/accounts"
            viewTransition
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700/50">
              {selectedAccount.bankCode.substring(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-base">
                {selectedAccount.label || bankName || '我的帳戶'}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 tracking-wider">
                {maskAccount(selectedAccount.accountNumber)}
              </p>
              {selectedAccount.label && bankName && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                  {bankName}（{selectedAccount.bankCode}）
                </p>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
              <ChevronRight
                size={18}
                className="text-zinc-400 dark:text-zinc-500"
                aria-hidden="true"
              />
            </div>
          </Link>
        </div>

        {/* Amount input, transaction note & generate button */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
            <AmountInput value={amount} onChange={setAmount} />

            {/* Transaction note toggle */}
            <div className="w-full max-w-sm mx-auto px-4">
              <button
                type="button"
                onClick={() => setShowNoteInput(true)}
                className="flex items-center gap-2 mx-auto text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-3 min-h-[44px]"
              >
                <MessageSquare size={16} aria-hidden="true" />
                <span>{note ? `備註：${note}` : '新增交易備註'}</span>
              </button>
            </div>
          </div>

          <div className="shrink-0 p-5 pt-2">
            <button
              type="button"
              onClick={() => {
                haptic();
                setShowQR(true);
              }}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <QrCode size={22} aria-hidden="true" />
              產生 QR Code
            </button>
          </div>
        </div>
      </main>

      {/* Note input modal — AnimatedModal */}
      {showNoteInput && (
        <AnimatedModal
          onClose={() => setShowNoteInput(false)}
          overlayClass="z-50"
          cardClass="max-w-sm p-6"
          ariaLabelledby="note-modal-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 id="note-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  交易備註
                </h2>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label="關閉"
                  className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  id="note-modal-input"
                  aria-label="交易備註"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      requestClose();
                    }
                  }}
                  placeholder="輸入備註，最多 20 字…"
                  autoFocus
                  autoComplete="off"
                  maxLength={20}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 pr-14 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none">
                  {note.length}/20
                </span>
              </div>
              <div className="flex gap-3 mt-4">
                {note && (
                  <button
                    type="button"
                    onClick={() => {
                      setNote('');
                      requestClose();
                    }}
                    className="flex-1 py-4 rounded-2xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                  >
                    清除備註
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-[2] py-4 rounded-2xl font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  確認
                </button>
              </div>
            </>
          )}
        </AnimatedModal>
      )}

      {showQR && qrString && shareData && (
        <QRDisplay
          value={qrString}
          amount={amount ? parseInt(amount, 10) : undefined}
          bankName={bankName}
          accountNumber={selectedAccount.accountNumber}
          note={note || undefined}
          shareData={shareData}
          onClose={handleCloseQR}
        />
      )}
    </div>
  );
};
