import { useState, useMemo, useCallback } from 'react';
import { useBanksStore } from '../../stores/useBanksStore';
import { useUrlSchemeStore } from '../../stores/useUrlSchemeStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import type { ParsedTWQR } from '../../utils/parseTwqr';
import { buildBankUrl } from '../../utils/urlScheme';
import { BankIcon } from '../accounts/BankIcon';
import { maskAccount, formatCurrency } from '../../utils/twqr';
import { ExternalLink, QrCode, Copy, ScanLine, Check } from 'lucide-react';
import { haptic } from '../../utils/haptics';

interface ScanResultProps {
  parsed: ParsedTWQR;
  onRescan: () => void;
  onShowQR: () => void;
}

/**
 * Displays parsed TWQR scan result with bank info, amount, and action buttons.
 * Supports auto-redirect when the user has configured 'redirect' action for the bank.
 */
export const ScanResult = ({ parsed, onRescan, onShowQR }: ScanResultProps) => {
  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((s) => s.banks);
  const getConfig = useUrlSchemeStore((s) => s.getConfig);
  const bank = useMemo(
    () => banks.find((b) => b.code === parsed.bankCode),
    [banks, parsed.bankCode],
  );

  const urlConfig = useMemo(
    () => getConfig(parsed.bankCode),
    [getConfig, parsed.bankCode],
  );

  const bankUrl = useMemo(() => {
    if (!urlConfig) return null;
    return buildBankUrl(urlConfig.urlTemplate, {
      bankCode: parsed.bankCode,
      account: parsed.accountNumber,
      paddedAccount: parsed.accountNumber.padStart(16, '0'),
      amount: parsed.amount,
      note: parsed.note,
    });
  }, [urlConfig, parsed]);

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(parsed.accountNumber);
      setCopied(true);
      haptic();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [parsed.accountNumber]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5 overflow-y-auto">
      {/* Result card */}
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden">
        {/* Bank info header */}
        <div className="p-5 flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800/50">
          <BankIcon bankUrl={bank?.url} bankCode={parsed.bankCode} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-base">
              {bank?.name || `${t.scan.unknownBank} (${parsed.bankCode})`}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 tracking-wider">
              {maskAccount(parsed.accountNumber)}
            </p>
          </div>
        </div>

        {/* Amount */}
        {parsed.amount > 0 && (
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/50">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium">
              {t.scan.amount}
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {formatCurrency(parsed.amount)}
            </p>
          </div>
        )}

        {/* Note */}
        {parsed.note && (
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/50">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium">
              {t.scan.note}
            </p>
            <p className="text-zinc-900 dark:text-zinc-100 mt-1">{parsed.note}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="p-4 space-y-3">
          {/* Open bank app — primary action.
              User tap is required: iOS blocks programmatic URL scheme / Universal Link navigation.
          */}
          {bankUrl && (
            <a
              href={bankUrl}
              onClick={() => haptic()}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 btn-accent rounded-xl font-semibold active:scale-98 action-transition shadow-xs"
            >
              <ExternalLink size={18} aria-hidden="true" />
              {t.scan.openBankApp}
            </a>
          )}

          {/* Secondary actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                haptic();
                onShowQR();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition"
            >
              <QrCode size={18} aria-hidden="true" />
              {t.scan.showQR}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition"
            >
              {copied ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Copy size={18} aria-hidden="true" />
              )}
              {copied ? t.scan.copied : t.scan.copyAccount}
            </button>
          </div>
        </div>
      </div>

      {/* Rescan */}
      <button
        type="button"
        onClick={() => {
          haptic();
          onRescan();
        }}
        className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors py-3 text-sm font-medium"
      >
        <ScanLine size={18} aria-hidden="true" />
        {t.scan.rescan}
      </button>
    </div>
  );
};
