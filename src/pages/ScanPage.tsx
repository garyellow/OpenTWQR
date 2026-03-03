import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { QRScanner } from '../components/scan/QRScanner';
import { QRDisplay } from '../components/receive/QRDisplay';
import { ScanRedirectView } from '../components/scan/ScanRedirectView';
import { parseTWQR } from '../utils/parseTwqr';
import { generateTWQR } from '../utils/twqr';
import { useBanksStore } from '../stores/useBanksStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { useUrlSchemeStore } from '../stores/useUrlSchemeStore';
import { haptic } from '../utils/haptics';
import { resolveIconSrc } from '../utils/favicon';
import { buildBankUrl } from '../utils/urlScheme';
import { Copy, Check, ScanLine, ExternalLink } from 'lucide-react';

/**
 * ScanPage state machine:
 *
 * 0. scanning=false (preloadedResult from Share Target) → jump to state 2–4
 * 1. scanning=true  → camera active
 * 2. scanning=false, parsed, bankUrl, showQR=false → ScanRedirectView
 * 3. scanning=false, parsed, bankUrl, showQR=true  → QRDisplay overlay (X → back to redirect)
 * 4. scanning=false, parsed, !bankUrl              → QRDisplay directly (hideClose, only rescan)
 * 5. scanning=false, !parsed                       → raw result card
 */
export const ScanPage = () => {
  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((s) => s.banks);
  const location = useLocation();
  const preloadedFromShare = (location.state as { preloadedResult?: string } | null)?.preloadedResult;

  /**
   * When navigating here from the Share Target disambiguation screen
   * (`location.state.preloadedResult` is set), skip the camera and jump
   * directly to the result view. Clear navigation state immediately so
   * a back-then-forward doesn't re-trigger the preload.
   */
  const [scanResult, setScanResult] = useState<string | null>(() => {
    if (preloadedFromShare) {
      const hs = window.history.state;
      window.history.replaceState(hs ? { ...hs, usr: undefined } : {}, '');
      return preloadedFromShare;
    }
    return null;
  });
  const [scanning, setScanning] = useState(
    !preloadedFromShare,
  );
  const [copied, setCopied] = useState(false);
  /** When true, QRDisplay is shown as overlay on top of ScanRedirectView. */
  const [showQR, setShowQR] = useState(false);

  const parsed = useMemo(() => {
    if (!scanResult) return null;
    return parseTWQR(scanResult);
  }, [scanResult]);

  const handleScan = useCallback((value: string) => {
    haptic();
    setScanResult(value);
    setScanning(false);
    setShowQR(false);
  }, []);

  const handleRescan = useCallback(() => {
    setScanResult(null);
    setScanning(true);
    setShowQR(false);
  }, []);

  /* ---------- QR Data for QRDisplay ---------- */
  const qrString = useMemo(() => {
    if (!parsed) return null;
    return generateTWQR({
      bankCode: parsed.bankCode,
      accountNumber: parsed.accountNumber,
      amount: parsed.amount,
      note: parsed.note,
    });
  }, [parsed]);

  const bank = useMemo(
    () => (parsed ? banks.find((b) => b.code === parsed.bankCode) : null),
    [banks, parsed],
  );

  const bankIconUrl = useMemo(
    () => (bank?.url ? resolveIconSrc(bank.url) : undefined),
    [bank],
  );

  /* ---------- Bank URL scheme ---------- */
  const getConfig = useUrlSchemeStore((s) => s.getConfig);
  const urlConfig = useMemo(
    () => (parsed ? getConfig(parsed.bankCode) : null),
    [getConfig, parsed],
  );
  const bankUrl = useMemo(() => {
    if (!urlConfig || !parsed) return undefined;
    return buildBankUrl(urlConfig.urlTemplate, {
      bankCode: parsed.bankCode,
      account: parsed.accountNumber,
      paddedAccount: parsed.accountNumber.padStart(16, '0'),
      amount: parsed.amount,
      note: parsed.note,
    });
  }, [urlConfig, parsed]);

  /* ---------- Copy raw result ---------- */
  const handleCopyRaw = useCallback(async () => {
    if (!scanResult) return;
    try {
      await navigator.clipboard.writeText(scanResult);
      setCopied(true);
      haptic();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, [scanResult]);

  /* ---------- Derived state for readability ---------- */
  const hasBankUrl = Boolean(bankUrl);

  /* ---------- Shared QRDisplay props ---------- */
  const qrDisplayProps = parsed && qrString ? {
    value: qrString,
    amount: parsed.amount,
    bankName: bank?.name,
    accountNumber: parsed.accountNumber,
    bankCode: parsed.bankCode,
    note: parsed.note,
    shareData: {
      bankCode: parsed.bankCode,
      accountNumber: parsed.accountNumber,
      amount: parsed.amount > 0 ? parsed.amount : undefined,
      note: parsed.note,
    },
    bankIconUrl,
    title: t.scan.title,
    onRescan: handleRescan,
  } : null;

  /* ---------- Layout ---------- */
  return (
    <div className="h-svh flex flex-col bg-zinc-50 dark:bg-zinc-950 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      {/* Header — hidden while scanning to maximise camera real-estate */}
      {!scanning && (
        <header className="shrink-0 flex items-center justify-between p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] px-safe animate-in fade-in duration-200">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t.scan.title}
          </h1>
        </header>
      )}

      {/* Scanner */}
      {scanning && <QRScanner onScan={handleScan} active={scanning} />}

      {/* Non-TWQR scan result */}
      {!scanning && !parsed && (
        <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium mb-3">
              {t.scan.rawResult}
            </p>
            <p className="text-zinc-900 dark:text-zinc-100 break-all font-mono text-sm leading-relaxed select-all">
              {scanResult}
            </p>

            <div className="flex gap-3 mt-5">
              {scanResult && /^https?:\/\//i.test(scanResult) && (
                <a
                  href={scanResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => haptic()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 btn-accent rounded-xl font-semibold text-sm active:scale-98 action-transition shadow-xs"
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  {t.scan.openLink}
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyRaw}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition"
              >
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? t.scan.copied : t.scan.copyRaw}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic();
              handleRescan();
            }}
            className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors py-3 text-sm font-medium"
          >
            <ScanLine size={18} aria-hidden="true" />
            {t.scan.rescan}
          </button>
        </div>
      )}

      {/* TWQR with bank URL → redirect view (unless QR overlay shown) */}
      {!scanning && parsed && hasBankUrl && !showQR && (
        <ScanRedirectView
          parsed={parsed}
          bankUrl={bankUrl!}
          bank={bank ?? null}
          bankIconUrl={bankIconUrl}
          onShowQR={() => setShowQR(true)}
          onRescan={handleRescan}
        />
      )}

      {/* TWQR with bank URL + QR overlay — X closes overlay back to redirect view */}
      {!scanning && parsed && hasBankUrl && showQR && qrDisplayProps && (
        <QRDisplay
          {...qrDisplayProps}
          onClose={() => setShowQR(false)}
          bankUrl={bankUrl}
        />
      )}

      {/* TWQR without bank URL → QRDisplay directly, no X, only rescan */}
      {!scanning && parsed && !hasBankUrl && qrDisplayProps && (
        <QRDisplay
          {...qrDisplayProps}
          onClose={handleRescan}
          hideClose
        />
      )}
    </div>
  );
};
