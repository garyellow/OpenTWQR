import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AmountInput } from '../components/receive/AmountInput';
import { QRDisplay, type QRDisplayCard } from '../components/receive/QRDisplay';
import { AnimatedModal } from '../components/ui/AnimatedModal';
import { ImportDialog } from '../components/settings/ImportDialog';
import { generateTWQR, maskAccount, removeInvisibleChars, stripCompanySuffix } from '../utils/twqr';
import { QrCode, StickyNote, UserPen, X, Download, Zap, BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBanksStore } from '../stores/useBanksStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { OpenTWQRLogo } from '../components/ui/OpenTWQRLogo';
import { AccountSelectorCard } from '../components/accounts/AccountSelectorCard';
import { AccountPickerSheet } from '../components/accounts/AccountPickerSheet';
import { haptic } from '../utils/haptics';
import { resolveIconSrc } from '../utils/favicon';
import { QuickQRModal } from '../components/receive/QuickQRModal';
import { generateId } from '../utils/generateId';
import { useQRSettingsStore } from '../stores/useQRSettingsStore';
import { formatBankCaption } from '../utils/accountPresentation';

export const ReceivePage = () => {
  const { accounts, selectedAccountId, addAccount, selectAccount, receiveAmount: amount, receiveNote: note, setReceiveAmount: setAmount, setReceiveNote: setNote } = useAppStore();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const banks = useBanksStore((state) => state.banks);
  const t = useLocaleStore((s) => s.t);
  const navigate = useNavigate();
  const customName = useQRSettingsStore((s) => s.customName);
  const setCustomName = useQRSettingsStore((s) => s.setCustomName);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId],
  );

  const bankByCode = useMemo(
    () => new Map(banks.map((entry) => [entry.code, entry])),
    [banks],
  );

  const bank = useMemo(() => {
    return selectedAccount ? bankByCode.get(selectedAccount.bankCode) : undefined;
  }, [bankByCode, selectedAccount]);

  const bankName = stripCompanySuffix(bank?.name || '');
  const currentAccountTitle = selectedAccount?.label || bankName || t.receive.myAccount;
  const currentAccountCaption = formatBankCaption(bankName, selectedAccount?.bankCode);

  /** Resolved bank icon URL for QR center logo (when logoType is 'bank'). */
  const bankIconUrl = useMemo(() => {
    return resolveIconSrc(selectedAccount?.iconUrl) ?? resolveIconSrc(bank?.url);
  }, [selectedAccount, bank]);

  /* ---------- Sorted account order for QR carousel ---------- */
  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.bankCode.localeCompare(b.bankCode)),
    [accounts],
  );

  const pickerAccounts = useMemo(
    () => [...accounts].sort((left, right) => {
      if (left.id === selectedAccountId) return -1;
      if (right.id === selectedAccountId) return 1;
      return left.bankCode.localeCompare(right.bankCode);
    }),
    [accounts, selectedAccountId],
  );

  const accountPickerOptions = useMemo(
    () => {
      const titleCounts = new Map<string, number>();
      const baseOptions = pickerAccounts.map((account) => {
        const accountBank = bankByCode.get(account.bankCode);
        const optionBankName = stripCompanySuffix(accountBank?.name || '');
        const title = account.label || optionBankName || t.receive.myAccount;

        titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);

        return {
          id: account.id,
          title,
          accountNumber: account.accountNumber,
          caption: formatBankCaption(optionBankName, account.bankCode),
          bankCode: account.bankCode,
          iconUrl: account.iconUrl,
          bankUrl: accountBank?.url,
        };
      });

      return baseOptions.map((option) => ({
        id: option.id,
        title: option.title,
        subtitle: (titleCounts.get(option.title) ?? 0) > 1 ? maskAccount(option.accountNumber) : undefined,
        caption: option.caption,
        bankCode: option.bankCode,
        iconUrl: option.iconUrl,
        bankUrl: option.bankUrl,
      }));
    },
    [bankByCode, pickerAccounts, t.receive.myAccount],
  );

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

  /* ---------- QR carousel cards ---------- */
  const carouselCards = useMemo<QRDisplayCard[]>(() => {
    const numAmount = amount ? parseInt(amount, 10) : 0;

    return sortedAccounts.map((account) => {
      const accountBank = bankByCode.get(account.bankCode);
      return {
        id: account.id,
        label: account.label,
        value: generateTWQR({ bankCode: account.bankCode, accountNumber: account.accountNumber, amount: numAmount, note: note || undefined }),
        bankName: stripCompanySuffix(accountBank?.name || ''),
        bankCode: account.bankCode,
        accountNumber: account.accountNumber,
        bankIconUrl: resolveIconSrc(account.iconUrl) ?? resolveIconSrc(accountBank?.url),
        shareData: {
          bankCode: account.bankCode,
          accountNumber: account.accountNumber,
          amount: numAmount > 0 ? numAmount : undefined,
          note: note || undefined,
        },
      };
    });
  }, [amount, bankByCode, note, sortedAccounts]);

  const handleCloseQR = useCallback(() => {
    setShowQR(false);
  }, []);

  const handleManageAccounts = useCallback(() => {
    navigate('/accounts', { viewTransition: true });
  }, [navigate]);

  const handleManageAccountsFromQR = useCallback(() => {
    navigate('/accounts', { viewTransition: true });
  }, [navigate]);

  /* ---------- Desktop keyboard shortcuts ---------- */
  useEffect(() => {
    if (accounts.length === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Enter — generate / show QR Code
      if (e.key === 'Enter' && !showQR && !showNoteInput && !showMessageInput && !showImport) {
        e.preventDefault();
        haptic();
        setShowQR(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [accounts.length, showQR, showNoteInput, showMessageInput, showImport]);

  /* ---------- Empty state ---------- */
  if (accounts.length === 0) {
    return (
      <div className="min-h-app-screen flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center border shadow-xs"
          style={{
            backgroundColor: 'var(--ca-10)',
            borderColor: 'var(--ca-15)',
          }}
        >
          <QrCode size={48} style={{ color: 'var(--ca)' }} aria-hidden="true" />
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
    <div className="h-app-screen flex flex-col px-safe bg-zinc-50 dark:bg-zinc-950 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]">
      <a
        href="#receive-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        {t.common.skipToMain}
      </a>

      <main id="receive-main" className="flex-1 flex flex-col min-h-0 max-w-md lg:max-w-lg mx-auto w-full pb-safe">
        {/* Header */}
        <header className="shrink-0 flex justify-between items-center px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <h1>
            <OpenTWQRLogo className="h-8 w-auto" />
          </h1>
          <button
            type="button"
            onClick={() => setShowQuickAccess(true)}
            aria-label={t.receive.quickAccess}
            title={t.receive.quickAccessDesc}
            className="p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
          >
            <Zap size={20} aria-hidden="true" />
          </button>
        </header>

        {/* Account selector */}
        <div className="shrink-0 px-6 mb-3">
          <AccountSelectorCard
            title={currentAccountTitle}
            subtitle={maskAccount(selectedAccount.accountNumber)}
            caption={currentAccountCaption}
            bankCode={selectedAccount.bankCode}
            iconUrl={selectedAccount.iconUrl}
            bankUrl={bank?.url}
            onClick={() => setShowAccountPicker(true)}
            buttonLabel={t.accountPicker.openLabel}
          />
        </div>

        {/* Amount input, transaction note & generate button */}
        {/* App Shell pattern: scrollable body + fixed bottom action button.
            The scroll area uses the "center-when-fits, scroll-when-not" technique:
            min-h-full + my-auto centres content in large viewports (PWA),
            and gracefully scrolls from the top in compact browser viewports. */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            <div className="min-h-full flex flex-col">
              <div className="my-auto py-3 flex flex-col items-center gap-3">
                <AmountInput value={amount} onChange={setAmount} />

                {/* Transaction note & personal message — two rows in a card */}
                <div className="w-full px-6">
                  <div className="app-surface overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setShowNoteInput(true)}
                      className="flex items-center gap-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors py-3 px-4 min-h-11 w-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                    >
                      <StickyNote size={15} aria-hidden="true" className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                      <span className={`flex-1 text-left truncate ${note ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`} title={note ? `${t.qr.notePrefix}${note}` : undefined}>
                        {note ? `${t.qr.notePrefix}${note}` : t.receive.addNote}
                      </span>
                      {note && <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{note.length}/19</span>}
                    </button>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setShowMessageInput(true)}
                      className="flex items-center gap-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors py-3 px-4 min-h-11 w-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                    >
                      <UserPen size={15} aria-hidden="true" className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                      <span className={`flex-1 text-left truncate ${customName ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`} title={customName ? `${t.receive.messagePrefix}${customName}` : undefined}>
                        {customName ? `${t.receive.messagePrefix}${customName}` : t.receive.addMessage}
                      </span>
                      {customName && <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{customName.length}/20</span>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-6 pb-5 pt-3">
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

      {/* Personal message modal — AnimatedModal */}
      {showMessageInput && (
        <AnimatedModal
          onClose={() => setShowMessageInput(false)}
          overlayClass="z-50"
          cardClass="max-w-sm p-6"
          ariaLabelledby="message-modal-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 id="message-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {t.receive.messageTitle}
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
                  id="message-modal-input"
                  aria-label={t.receive.messageTitle}
                  value={customName}
                  onChange={(e) => setCustomName(removeInvisibleChars(e.target.value).slice(0, 20))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      requestClose();
                    }
                  }}
                  placeholder={t.receive.messagePlaceholder}
                  autoFocus
                  autoComplete="off"
                  maxLength={20}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 pr-14 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 dark:text-zinc-400 pointer-events-none">
                  {customName.length}/20
                </span>
              </div>
              <div className="flex gap-3 mt-4">
                {customName && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomName('');
                      requestClose();
                    }}
                    className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                  >
                    {t.receive.clearMessage}
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
          cards={carouselCards}
          activeCardId={selectedAccount.id}
          onActiveCardChange={selectAccount}
          onManageAccounts={handleManageAccountsFromQR}
        />
      )}

      {showAccountPicker && (
        <AccountPickerSheet
          title={t.accountPicker.title}
          description={t.accountPicker.description}
          options={accountPickerOptions}
          selectedId={selectedAccount.id}
          onSelect={selectAccount}
          onClose={() => setShowAccountPicker(false)}
          onManageAccounts={handleManageAccounts}
          manageLabel={t.accountPicker.manageAccounts}
          selectedLabel={t.accountPicker.selected}
          closeLabel={t.common.close}
        />
      )}

      {showQuickAccess && <QuickQRModal onClose={() => setShowQuickAccess(false)} />}

    </div>
  );
};
