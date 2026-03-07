import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { QRScanner } from '../components/scan/QRScanner';
import { QRDisplay } from '../components/receive/QRDisplay';
import { ScanRedirectView } from '../components/scan/ScanRedirectView';
import type { PaymentAppEntry } from '../components/scan/ScanRedirectView';
import { parseTWQR } from '../utils/parseTwqr';
import { generateTWQR, stripCompanySuffix } from '../utils/twqr';
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
 *
 * Module-level state cache: persists scan result across tab navigations so
 * switching away and back doesn't reset to the camera view. Cleared only
 * when the user explicitly taps "重新掃描".
 */
let _cachedScanResult: string | null = null;
let _cachedScanning: boolean = true;

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
   *
   * Otherwise, restore from module-level cache so switching tabs and
   * returning keeps the previous result until the user taps "重新掃描".
   */
  const [scanResult, setScanResult] = useState<string | null>(() => {
    if (preloadedFromShare) {
      const hs = window.history.state;
      window.history.replaceState(hs ? { ...hs, usr: undefined } : {}, '');
      _cachedScanResult = preloadedFromShare;
      _cachedScanning = false;
      return preloadedFromShare;
    }
    return _cachedScanResult;
  });
  const [scanning, setScanning] = useState<boolean>(() => {
    if (preloadedFromShare) return false;
    return _cachedScanning;
  });
  const [copied, setCopied] = useState(false);
  /** When true, QRDisplay is shown as overlay on top of ScanRedirectView. */
  const [showQR, setShowQR] = useState(false);

  const parsed = useMemo(() => {
    if (!scanResult) return null;
    return parseTWQR(scanResult);
  }, [scanResult]);

  const handleScan = useCallback((value: string) => {
    haptic();
    _cachedScanResult = value;
    _cachedScanning = false;
    setScanResult(value);
    setScanning(false);
    setShowQR(false);
  }, []);

  const handleRescan = useCallback(() => {
    _cachedScanResult = null;
    _cachedScanning = true;
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

  /* ---------- Build all transfer app entries from configured URL schemes ---------- */
  const configs = useUrlSchemeStore((s) => s.configs);
  const paymentApps = useMemo<PaymentAppEntry[]>(() => {
    if (!parsed || configs.length === 0) return [];

    const entries: PaymentAppEntry[] = [];

    for (const config of configs) {
      const configBank = banks.find((b) => b.code === config.bankCode);
      const isSameInstitution = config.bankCode === parsed.bankCode;

      // sameInstitutionOnly: cross-institution → use launchUrl if available, otherwise skip
      if (config.sameInstitutionOnly && !isSameInstitution) {
        if (config.launchUrl) {
          entries.push({
            bankCode: config.bankCode,
            bankName: configBank?.name || config.bankCode,
            bankUrl: config.launchUrl,
            bankIconUrl: configBank?.url ? resolveIconSrc(configBank.url) : undefined,
            isSameInstitution: false,
            launchOnly: true,
          });
        }
        // No launchUrl → skip entirely
        continue;
      }

      const url = buildBankUrl(config.urlTemplate, {
        bankCode: parsed.bankCode,
        account: parsed.accountNumber,
        paddedAccount: parsed.accountNumber.padStart(16, '0'),
        amount: parsed.amount,
        note: parsed.note,
      });
      entries.push({
        bankCode: config.bankCode,
        bankName: configBank?.name || config.bankCode,
        bankUrl: url,
        bankIconUrl: configBank?.url ? resolveIconSrc(configBank.url) : undefined,
        isSameInstitution,
      });
    }

    // Sort: same institution first, then by bankCode
    return entries.sort((a, b) => {
      if (a.isSameInstitution !== b.isSameInstitution) return a.isSameInstitution ? -1 : 1;
      return a.bankCode.localeCompare(b.bankCode);
    });
  }, [configs, parsed, banks]);

  const hasPaymentApps = paymentApps.length > 0;

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

  /* ---------- Shared QRDisplay props ---------- */
  const bankUrl = hasPaymentApps ? paymentApps[0].bankUrl : undefined;
  const qrDisplayProps = parsed && qrString ? {
    value: qrString,
    amount: parsed.amount,
    bankName: bank ? stripCompanySuffix(bank.name) : undefined,
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
      {!scanning && (
        <a
          href="#scan-main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
        >
          {t.common.skipToMain}
        </a>
      )}
      {/* Header — hidden while scanning to maximise camera real-estate */}
      {!scanning && (
        <header className="sticky top-0 z-20 shrink-0 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe animate-in fade-in duration-200">
          <div className="flex items-center justify-between py-4 pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t.scan.title}
            </h1>
          </div>
        </header>
      )}

      {/* Scanner */}
      {scanning && <QRScanner onScan={handleScan} active={scanning} />}

      {/*
       * All non-scanning states share one <main id="scan-main"> so the
       * skip-to-main link always has a valid anchor target regardless of
       * which sub-state (raw result / ScanRedirectView / QRDisplay) is active.
       * QRDisplay uses fixed inset-0 so it is unaffected by this flex container.
       */}
      {!scanning && (
        <main id="scan-main" className="flex-1 flex flex-col min-h-0">
          {/* Non-TWQR scan result */}
          {!parsed && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-5 pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
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

          {/* TWQR with transfer apps → redirect view (unless QR overlay shown) */}
          {parsed && hasPaymentApps && !showQR && (
            <ScanRedirectView
              parsed={parsed}
              bank={bank ?? null}
              bankIconUrl={bankIconUrl}
              paymentApps={paymentApps}
              onShowQR={() => setShowQR(true)}
              onRescan={handleRescan}
            />
          )}

          {/* TWQR with transfer apps + QR overlay — X closes overlay back to redirect view */}
          {parsed && hasPaymentApps && showQR && qrDisplayProps && (
            <QRDisplay
              {...qrDisplayProps}
              onClose={() => setShowQR(false)}
              bankUrl={bankUrl}
            />
          )}

          {/* TWQR without transfer apps → QRDisplay directly, no X, only rescan */}
          {parsed && !hasPaymentApps && qrDisplayProps && (
            <QRDisplay
              {...qrDisplayProps}
              onClose={handleRescan}
              hideClose
            />
          )}
        </main>
      )}
    </div>
  );
};
