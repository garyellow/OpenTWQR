import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { ImportDialog } from '../components/settings/ImportDialog';
import { parseTWQR, isTWQR } from '../utils/parseTwqr';
import { useBanksStore } from '../stores/useBanksStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { BankIcon } from '../components/accounts/BankIcon';
import { resolveIconSrc } from '../utils/favicon';
import { formatCurrency } from '../utils/twqr';
import { haptic } from '../utils/haptics';
import { UserPlus, CreditCard, Banknote, StickyNote } from 'lucide-react';

/**
 * Web Share Target landing page — `/share?text=<shared-text>`.
 * Routes shared content to the appropriate handler based on content type:
 *  - OTWQR backup string → ImportDialog
 *  - TWQR QR code string → disambiguation (save account vs. pay)
 *  - Otherwise           → redirect home
 */
export const SharePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((s) => s.banks);

  const candidates = [
    params.get('text'),
    params.get('url'),
    params.get('title'),
  ].filter(Boolean) as string[];

  let sharedText = '';
  let contentType: 'otwqr' | 'twqr' | 'unknown' = 'unknown';

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.startsWith('OTWQR')) {
      sharedText = trimmed;
      contentType = 'otwqr';
      break;
    }
    if (isTWQR(trimmed)) {
      sharedText = trimmed;
      contentType = 'twqr';
      break;
    }
  }

  if (!sharedText || contentType === 'unknown') return <Navigate to="/" replace />;

  if (contentType === 'otwqr') {
    return (
      <div className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-safe pb-safe">
        <ImportDialog onClose={() => navigate('/', { replace: true })} initialText={sharedText} />
      </div>
    );
  }

  const parsed = parseTWQR(sharedText);
  if (!parsed) return <Navigate to="/" replace />;

  const bank = banks.find((b) => b.code === parsed.bankCode);
  const bankIconUrl = bank?.url ? resolveIconSrc(bank.url) : undefined;

  const handleAddAccount = () => {
    haptic();
    navigate('/accounts', {
      replace: true,
      state: {
        autoAdd: true,
        prefill: { bankCode: parsed.bankCode, accountNumber: parsed.accountNumber },
      },
    });
  };

  const handlePay = () => {
    haptic();
    navigate('/scan', {
      replace: true,
      state: { preloadedResult: sharedText },
    });
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-safe pb-safe p-5">
      <div className="w-full max-w-sm space-y-4">
        {/* Bank info preview */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6">
          <div className="flex items-center gap-3.5 mb-4">
            <BankIcon iconUrl={bankIconUrl} bankCode={parsed.bankCode} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-base truncate">
                {bank?.name || `${t.scan.unknownBank} (${parsed.bankCode})`}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono tracking-wide mt-0.5">
                {parsed.accountNumber}
              </p>
            </div>
          </div>

          {/* Amount & note if present */}
          {(parsed.amount > 0 || parsed.note) && (
            <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 mt-4">
              {parsed.amount > 0 && (
                <div className="flex items-center gap-2.5 text-sm pt-3">
                  <Banknote size={15} className="text-zinc-400 dark:text-zinc-500 shrink-0" aria-hidden="true" />
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium">{t.scan.amount}</span>
                  <span className="ml-auto font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(parsed.amount)}
                  </span>
                </div>
              )}
              {parsed.note && (
                <div className="flex items-start gap-2.5 text-sm">
                  <StickyNote size={15} className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium shrink-0">{t.scan.note}</span>
                  <span className="ml-auto text-zinc-700 dark:text-zinc-200 text-right break-all">{parsed.note}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">{t.shareTarget.prompt}</p>
        </div>

        {/* Save as own account */}
        <button
          type="button"
          onClick={handleAddAccount}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl btn-accent active:scale-98 action-transition shadow-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          <UserPlus size={20} className="shrink-0" aria-hidden="true" />
          <div className="text-left">
            <div className="text-base">{t.shareTarget.addAccount}</div>
            <div className="text-xs font-normal opacity-75">{t.shareTarget.addAccountDesc}</div>
          </div>
        </button>

        {/* View / pay */}
        <button
          type="button"
          onClick={handlePay}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <CreditCard size={20} className="shrink-0" aria-hidden="true" />
          <div className="text-left">
            <div className="text-base">{t.shareTarget.pay}</div>
            <div className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{t.shareTarget.payDesc}</div>
          </div>
        </button>
      </div>
    </div>
  );
};
