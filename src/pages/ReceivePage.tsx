import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AmountInput } from '../components/receive/AmountInput';
import { QRDisplay } from '../components/receive/QRDisplay';
import { AnimatedModal } from '../components/ui/AnimatedModal';
import { ImportDialog } from '../components/settings/ImportDialog';
import { generateTWQR, maskAccount, removeInvisibleChars, stripCompanySuffix } from '../utils/twqr';
import { QrCode, ChevronRight, MessageSquare, X, Download, Zap, BookOpen, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useBanksStore } from '../stores/useBanksStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { OpenTWQRLogo } from '../components/ui/OpenTWQRLogo';
import { BankIcon } from '../components/accounts/BankIcon';
import { haptic } from '../utils/haptics';
import { resolveIconSrc } from '../utils/favicon';
import { QuickQRModal } from '../components/receive/QuickQRModal';
import { generateId } from '../utils/generateId';

export const ReceivePage = () => {
  const { accounts, selectedAccountId, addAccount, receiveAmount: amount, receiveNote: note, setReceiveAmount: setAmount, setReceiveNote: setNote } = useAppStore();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const banks = useBanksStore((state) => state.banks);
  const t = useLocaleStore((s) => s.t);
  const navigate = useNavigate();

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId],
  );

  const bank = useMemo(() => {
    return banks.find((b) => b.code === selectedAccount?.bankCode);
  }, [banks, selectedAccount]);

  const bankName = stripCompanySuffix(bank?.name || '');

  /** Resolved bank icon URL for QR center logo (when logoType is 'bank'). */
  const bankIconUrl = useMemo(() => {
    return resolveIconSrc(selectedAccount?.iconUrl) ?? resolveIconSrc(bank?.url);
  }, [selectedAccount, bank]);

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

  /* ---------- Desktop keyboard shortcuts ---------- */
  useEffect(() => {
    if (accounts.length === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Enter — generate / show QR Code
      if (e.key === 'Enter' && !showQR && !showNoteInput && !showImport) {
        e.preventDefault();
        haptic();
        setShowQR(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [accounts.length, showQR, showNoteInput, showImport]);

  /* ---------- Empty state ---------- */
  if (accounts.length === 0) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center border shadow-xs"
          style={{
            backgroundColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 10%, transparent)',
            borderColor: 'color-mix(in oklch, light-dark(var(--accent), var(--accent-dark)) 15%, transparent)',
          }}
        >
          <QrCode size={48} style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }} aria-hidden="true" />
        </div>
        <div className="text-center space-y-4">
          <h1>
            <OpenTWQRLogo className="h-9 w-auto mx-auto" />
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
            {t.receive.emptyHint}
          </p>
        </div>
        <div className="w-full max-w-72 space-y-3 mt-4">
          <button
            type="button"
            onClick={() => navigate('/accounts', { viewTransition: true, state: { autoAdd: true } })}
            className="w-full flex items-center justify-center gap-2 py-4 btn-accent font-semibold rounded-xl text-lg active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            <Plus size={20} aria-hidden="true" />
            {t.receive.addAccount}
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 text-lg"
          >
            <Download size={20} aria-hidden="true" />
            {t.receive.importAccounts}
          </button>
          <button
            type="button"
            onClick={() => setShowQuickAccess(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 text-lg"
          >
            <Zap size={20} aria-hidden="true" />
            {t.receive.quickAccess}
          </button>
          <div className="relative flex items-center py-2">
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
            <span className="px-3 text-xs text-zinc-400 dark:text-zinc-500">{t.common.or}</span>
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <button
            type="button"
            onClick={() => {
              haptic();
              const p = `(${t.receive.sampleLabel})`;
              const samples = [
                { bankCode: '700', accountNumber: '00100123456789', label: `${p} 中華郵政` },
                { bankCode: '013', accountNumber: '1234567890',     label: `${p} 國泰世華` },
                { bankCode: '822', accountNumber: '9876543210987654', label: `${p} 中國信託` },
                { bankCode: '004', accountNumber: '00099876543210', label: `${p} 台灣銀行` },
                { bankCode: '012', accountNumber: '5566112233',     label: `${p} 台北富邦` },
              ];
              for (const s of samples) {
                addAccount({ id: generateId(), ...s });
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 text-base"
          >
            <BookOpen size={18} aria-hidden="true" />
            {t.receive.loadSample}
          </button>
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 -mt-1">
            {t.receive.loadSampleHint}
          </p>
        </div>
        {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
        {showQuickAccess && <QuickQRModal onClose={() => setShowQuickAccess(false)} />}
      </div>
    );
  }

  /* ---------- Main layout ---------- */
  return (
    <div className="h-svh flex flex-col overflow-hidden px-safe bg-zinc-50 dark:bg-zinc-950 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <a
        href="#receive-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        {t.common.skipToMain}
      </a>

      <main id="receive-main" className="flex-1 flex flex-col min-h-0 max-w-md lg:max-w-lg mx-auto w-full pb-safe">
        {/* Header */}
        <header className="shrink-0 flex justify-between items-center p-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <h1>
            <OpenTWQRLogo className="h-7 w-auto" />
          </h1>
        </header>

        {/* Account selector */}
        <div className="shrink-0 px-5 mb-2">
          <Link
            to="/accounts"
            viewTransition
            className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 action-transition group active:scale-98 shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100"
          >
            <BankIcon iconUrl={selectedAccount.iconUrl} bankUrl={bank?.url} bankCode={selectedAccount.bankCode} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-base">
                {selectedAccount.label || bankName || t.receive.myAccount}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 tracking-wider">
                {maskAccount(selectedAccount.accountNumber)}
              </p>
              {selectedAccount.label && bankName && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                  {bankName}{t.receive.bankCode(selectedAccount.bankCode)}
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
                className="flex items-center gap-2 mx-auto text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors py-3 min-h-11 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
              >
                <MessageSquare size={16} aria-hidden="true" />
                <span>{note ? `${t.qr.notePrefix}${note}` : t.receive.addNote}</span>
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
              className="w-full flex items-center justify-center gap-2.5 py-4 btn-accent font-semibold rounded-xl text-lg active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <QrCode size={22} aria-hidden="true" />
              {t.receive.generateQR}
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
                  {t.receive.noteTitle}
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
              <div className="relative">
                <input
                  type="text"
                  id="note-modal-input"
                  aria-label={t.receive.noteLabel}
                  value={note}
                  onChange={(e) => setNote(removeInvisibleChars(e.target.value).slice(0, 19))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      requestClose();
                    }
                  }}
                  placeholder={t.receive.notePlaceholder}
                  autoFocus
                  autoComplete="off"
                  maxLength={19}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 pr-14 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 dark:text-zinc-400 pointer-events-none">
                  {note.length}/19
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
                    className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                  >
                    {t.receive.clearNote}
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.confirm}
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
          bankCode={selectedAccount.bankCode}
          note={note || undefined}
          shareData={shareData}
          onClose={handleCloseQR}
          bankIconUrl={bankIconUrl}
        />
      )}

    </div>
  );
};
