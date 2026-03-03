import { useState, useCallback } from 'react';
import { ExternalLink, QrCode, Copy, Check, ScanLine, Banknote, StickyNote } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { maskAccount, formatCurrency } from '../../utils/twqr';
import { BankIcon } from '../accounts/BankIcon';
import { haptic } from '../../utils/haptics';
import type { Bank } from '../../types';
import type { ParsedTWQR } from '../../utils/parseTwqr';

interface ScanRedirectViewProps {
  parsed: ParsedTWQR;
  bankUrl: string;
  bank: Bank | null;
  bankIconUrl?: string;
  onShowQR: () => void;
  onRescan: () => void;
}

/**
 * Lightweight redirect confirmation page shown when a scanned TWQR
 * has a matching payment app URL configuration.
 *
 * Displays bank/account info and provides:
 * - Primary: "開啟支付 App" (native <a> for iOS gesture compliance)
 * - Secondary: "顯示 QR Code" + "複製帳號"
 * - Tertiary: "重新掃描"
 */
export const ScanRedirectView = ({
  parsed,
  bankUrl,
  bank,
  bankIconUrl,
  onShowQR,
  onRescan,
}: ScanRedirectViewProps) => {
  const t = useLocaleStore((s) => s.t);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5 animate-in fade-in duration-200">
      <div className="w-full max-w-sm space-y-5">
        {/* Bank info card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6 space-y-5">
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

        {/* Primary action — open payment app */}
        <a
          href={bankUrl}
          onClick={() => haptic()}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl btn-accent active:scale-98 action-transition shadow-xs font-semibold text-base focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          <ExternalLink size={18} aria-hidden="true" />
          {t.scan.openBankApp}
        </a>

        {/* Secondary actions row */}
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

        {/* Rescan */}
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
  );
};
