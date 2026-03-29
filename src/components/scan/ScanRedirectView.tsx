import { useState, useCallback } from 'react';
import { ExternalLink, QrCode, Copy, Check, ScanLine, Banknote, StickyNote, CircleAlert, X, Rocket } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { maskAccount, formatCurrency } from '../../utils/twqr';
import { BankIcon } from '../accounts/BankIcon';
import { haptic } from '../../utils/haptics';
import { isIntentUrl } from '../../utils/urlScheme';
import { AnimatedModal } from '../ui/AnimatedModal';
import type { Bank } from '../../types';
import type { ParsedTWQR } from '../../utils/parseTwqr';

export interface PaymentAppEntry {
  bankCode: string;
  bankName: string;
  appUrl: string;
  bankIconUrl?: string;
  isSameInstitution: boolean;
  /** True when cross-institution + sameInstitutionOnly — opens app without pre-filling data. */
  launchOnly?: boolean;
}

interface ScanRedirectViewProps {
  parsed: ParsedTWQR;
  /** The bank that matches the scanned QR code's institution. */
  bank: Bank | null;
  bankIconUrl?: string;
  /** All configured transfer apps with built URLs. */
  paymentApps: PaymentAppEntry[];
  onShowQR: () => void;
  onRescan: () => void;
}

/**
 * Scan result page shown when a scanned TWQR has transfer app configurations.
 *
 * Displays the payment info card and a scrollable list of all configured
 * transfer apps. Same-institution apps are highlighted with accent colour;
 * cross-institution apps are shown below. Tap ⓘ for fee information.
 */
export const ScanRedirectView = ({
  parsed,
  bank,
  bankIconUrl,
  paymentApps,
  onShowQR,
  onRescan,
}: ScanRedirectViewProps) => {
  const t = useLocaleStore((s) => s.t);
  const [copied, setCopied] = useState(false);
  const [showFeeInfo, setShowFeeInfo] = useState(false);

  const handleCopyAccount = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(parsed.accountNumber);
      haptic();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, [parsed.accountNumber]);

  const sameApps = paymentApps.filter((a) => a.isSameInstitution);
  const crossApps = paymentApps.filter((a) => !a.isSameInstitution);

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-200 overflow-hidden">
      {/* Bank info card — always visible */}
      <div className="shrink-0 px-5 pt-5">
        <div className="mx-auto w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6 space-y-5">
          {/* Bank header */}
          <div className="flex items-center gap-3.5">
            <BankIcon
              iconUrl={bankIconUrl}
              bankCode={parsed.bankCode}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-base truncate">
                {bank?.name || `${t.scan.unknownBank} (${parsed.bankCode})`}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono tracking-wide mt-0.5">
                {maskAccount(parsed.accountNumber)}
              </p>
            </div>
          </div>

          {/* Amount & note */}
          {(parsed.amount > 0 || parsed.note) && (
            <div className="space-y-2.5 pt-1">
              {parsed.amount > 0 && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Banknote
                    size={16}
                    className="text-zinc-400 dark:text-zinc-500 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                    {t.scan.amount}
                  </span>
                  <span className="ml-auto font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(parsed.amount)}
                  </span>
                </div>
              )}
              {parsed.note && (
                <div className="flex items-start gap-2.5 text-sm">
                  <StickyNote
                    size={16}
                    className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium shrink-0">
                    {t.scan.note}
                  </span>
                  <span className="ml-auto text-zinc-700 dark:text-zinc-200 text-right break-all">
                    {parsed.note}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transfer app selection — header pinned, list scrolls */}
      <div className="flex-1 flex flex-col min-h-0 pt-4 px-5">
        <div className="mx-auto w-full max-w-sm flex flex-col min-h-0 gap-2">
          {/* Section header with fee info button */}
          <div className="shrink-0 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {t.scan.selectPaymentApp}
            </h2>
            <button
              type="button"
              onClick={() => setShowFeeInfo(true)}
              aria-label={t.scan.feeInfoTitle}
              className={`p-1 transition-colors rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-500 ${
                crossApps.length > 0
                  ? 'text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              <CircleAlert size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable app list */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            <div className="flex flex-col gap-2 pb-3">
          {sameApps.map((app) => (
            <a
              key={app.bankCode}
              href={app.appUrl}
              {...(isIntentUrl(app.appUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}
              onClick={() => haptic()}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl btn-accent active:scale-98 action-transition shadow-xs font-semibold text-base focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              <BankIcon iconUrl={app.bankIconUrl} bankCode={app.bankCode} size="sm" />
              <span className="flex-1 min-w-0 truncate">{app.bankName}</span>
              <ExternalLink size={16} className="shrink-0 opacity-75" aria-hidden="true" />
            </a>
          ))}

          {crossApps.map((app) => (
            <a
              key={app.bankCode}
              href={app.appUrl}
              {...(isIntentUrl(app.appUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}
              onClick={() => haptic()}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold text-sm text-zinc-700 dark:text-zinc-300 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                app.launchOnly
                  ? 'bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-600'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/50 dark:border-zinc-700/50'
              }`}
            >
              <BankIcon iconUrl={app.bankIconUrl} bankCode={app.bankCode} size="sm" />
              <span className="flex-1 min-w-0 truncate">{app.bankName}</span>
              {app.launchOnly && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal shrink-0">{t.scan.launchOnly}</span>
              )}
              {app.launchOnly
                ? <Rocket size={14} className="shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
                : <ExternalLink size={14} className="shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
              }
            </a>
          ))}

            </div>
          </div>
        </div>
      </div>

      {/* Bottom actions — always visible */}
      <div className="shrink-0 px-5 pt-3 pb-5">
        <div className="mx-auto w-full max-w-sm flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                haptic();
                onShowQR();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
            >
              <QrCode size={16} aria-hidden="true" />
              {t.scan.showQR}
            </button>
            <button
              type="button"
              onClick={handleCopyAccount}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
            >
              {copied ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
              {copied ? t.scan.copiedAccount : t.scan.copyAccount}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              haptic();
              onRescan();
            }}
            className="w-full flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors py-2.5 text-sm font-medium rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
          >
            <ScanLine size={16} aria-hidden="true" />
            {t.scan.rescan}
          </button>
        </div>
      </div>

      {/* Fee info modal */}
      {showFeeInfo && (
        <AnimatedModal
          onClose={() => setShowFeeInfo(false)}
          overlayClass="z-50"
          cardClass="max-w-sm p-6"
          ariaLabelledby="fee-info-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                    <CircleAlert size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <h2 id="fee-info-title" className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                    {t.scan.feeInfoTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label={t.common.close}
                  className="p-2.5 -mr-2 -mt-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: 'light-dark(var(--accent), var(--accent-dark))' }} />
                  <p>{t.scan.feeInfoSameBank}</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 mt-1.5 shrink-0" />
                  <p>{t.scan.feeInfoCrossBank}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="w-full py-3.5 mt-5 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {t.common.understand}
              </button>
            </>
          )}
        </AnimatedModal>
      )}
    </div>
  );
};
