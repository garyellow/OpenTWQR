import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AmountInput } from '../components/AmountInput';
import { QRDisplay } from '../components/QRDisplay';
import { generateTWQR } from '../utils/twqr';
import { buildShareUrl, parseShareHash } from '../utils/share';
import { Wallet, QrCode, ChevronRight, MessageSquare, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useBanksStore } from '../stores/useBanksStore';
import { ThemeToggle } from '../components/ThemeToggle';

export const ReceivePage = () => {
  const [initialShared] = useState(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    const parsed = parseShareHash(hash);
    if (parsed) window.history.replaceState(null, '', window.location.pathname);
    return parsed;
  });
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showQR, setShowQR] = useState(initialShared !== null);
  const [sharedDismissed, setSharedDismissed] = useState(false);
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

  /* ---------- Shared link handling (pure derivation, no useEffect) ---------- */
  const sharedData = useMemo(() => {
    if (!initialShared || sharedDismissed) return null;
    const bank = banks.find((b) => b.code === initialShared.bankCode);
    return {
      bankCode: initialShared.bankCode,
      accountNumber: initialShared.accountNumber,
      bankName: bank?.name || initialShared.bankCode,
      amount: initialShared.amount,
      note: initialShared.note,
    };
  }, [initialShared, banks, sharedDismissed]);

  const isSharedMode = sharedData !== null && showQR;

  /* ---------- QR string generation ---------- */
  const qrString = useMemo(() => {
    if (isSharedMode && sharedData) {
      return generateTWQR({
        bankCode: sharedData.bankCode,
        accountNumber: sharedData.accountNumber,
        amount: sharedData.amount ?? 0,
        note: sharedData.note,
      });
    }

    if (!selectedAccount) return null;
    const numAmount = amount ? parseInt(amount, 10) : 0;
    return generateTWQR({
      bankCode: selectedAccount.bankCode,
      accountNumber: selectedAccount.accountNumber,
      amount: numAmount,
      note: note || undefined,
    });
  }, [selectedAccount, amount, note, isSharedMode, sharedData]);

  /* ---------- Share URL for current settings ---------- */
  const shareUrl = useMemo(() => {
    if (isSharedMode && sharedData) {
      return buildShareUrl({
        bankCode: sharedData.bankCode,
        accountNumber: sharedData.accountNumber,
        amount: sharedData.amount,
        note: sharedData.note,
      });
    }

    if (!selectedAccount) return '';
    const numAmount = amount ? parseInt(amount, 10) : 0;
    return buildShareUrl({
      bankCode: selectedAccount.bankCode,
      accountNumber: selectedAccount.accountNumber,
      amount: numAmount > 0 ? numAmount : undefined,
      note: note || undefined,
    });
  }, [isSharedMode, sharedData, selectedAccount, amount, note]);

  /* ---------- QR display props ---------- */
  const qrDisplayProps = useMemo(() => {
    if (isSharedMode && sharedData) {
      return {
        bankName: sharedData.bankName,
        accountNumber: sharedData.accountNumber,
        amount: sharedData.amount,
        note: sharedData.note,
      };
    }
    return {
      bankName,
      accountNumber: selectedAccount?.accountNumber,
      amount: amount ? parseInt(amount, 10) : undefined,
      note: note || undefined,
    };
  }, [isSharedMode, sharedData, bankName, selectedAccount, amount, note]);

  const handleCloseQR = useCallback(() => {
    setShowQR(false);
    if (isSharedMode) {
      setSharedDismissed(true);
    }
  }, [isSharedMode]);

  /* ---------- Empty state ---------- */
  if (accounts.length === 0 && !isSharedMode) {
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
          onClick={() => navigate('/accounts')}
          className="w-full max-w-xs py-4 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 active:scale-[0.98] transition-[transform,background-color,color,box-shadow] shadow-sm mt-4"
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
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors group active:scale-[0.98] shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700/50">
              {selectedAccount?.bankCode.substring(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-base">
                {selectedAccount?.label || bankName || '我的帳戶'}
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

            {/* Transaction note toggle & input */}
            <div className="w-full max-w-sm mx-auto px-4">
              {showNoteInput ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      id="note-input"
                      name="note"
                      aria-label="交易備註"
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 20))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setShowNoteInput(false);
                        }
                      }}
                      placeholder="最多 20 字…"
                      autoFocus
                      autoComplete="off"
                      maxLength={20}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl px-4 py-3 text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-[border-color,box-shadow,background-color,color] shadow-sm"
                    />
                    {note && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                        {note.length}/20
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNote('');
                      setShowNoteInput(false);
                    }}
                    aria-label="取消備註"
                    className="p-3 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNoteInput(true)}
                  className="flex items-center gap-2 mx-auto text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-3 min-h-[44px]"
                >
                  <MessageSquare size={16} aria-hidden="true" />
                  <span>{note ? `備註：${note}` : '新增交易備註'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="shrink-0 p-5 pt-2">
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 active:scale-[0.98] transition-[transform,background-color,color,box-shadow] shadow-sm"
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
          amount={qrDisplayProps.amount}
          bankName={qrDisplayProps.bankName}
          accountNumber={qrDisplayProps.accountNumber}
          note={qrDisplayProps.note}
          shareUrl={shareUrl}
          onClose={handleCloseQR}
        />
      )}
    </div>
  );
};
