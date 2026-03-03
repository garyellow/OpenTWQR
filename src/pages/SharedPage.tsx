import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRDisplay } from '../components/receive/QRDisplay';
import { parseShareUrl } from '../utils/share';
import { generateTWQR, stripCompanySuffix } from '../utils/twqr';
import { useBanksStore } from '../stores/useBanksStore';
import { useLocaleStore } from '../stores/useLocaleStore';
import { Unlink, Lock, Clock } from 'lucide-react';
import type { ParseShareResult } from '../types';

export const SharedPage = () => {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();
  const banks = useBanksStore((state) => state.banks);
  const t = useLocaleStore((s) => s.t);

  const [result, setResult] = useState<ParseShareResult | null>(null);
  const [password, setPassword] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const fragment = useMemo(() => {
    const hash = window.location.hash;
    return hash.startsWith('#') ? hash.slice(1) : '';
  }, []);

  // Initial parse (without password)
  useEffect(() => {
    const pending = !data || !fragment
      ? Promise.resolve<ParseShareResult>({ status: 'invalid' })
      : parseShareUrl(data, fragment);
    pending.then(setResult);
  }, [data, fragment]);

  const handlePasswordSubmit = useCallback(async () => {
    if (!data || !fragment || !password) return;
    setIsDecrypting(true);
    const res = await parseShareUrl(data, fragment, password);
    // Clear password on failure so the user can immediately re-type
    if (res.status === 'wrong-password') setPassword('');
    setResult(res);
    setIsDecrypting(false);
  }, [data, fragment, password]);

  const shareData = result?.status === 'ok' ? result.data : null;

  const bankName = useMemo(() => {
    if (!shareData) return '';
    const found = banks.find((b) => b.code === shareData.bankCode);
    return found ? stripCompanySuffix(found.name) : shareData.bankCode;
  }, [banks, shareData]);

  const qrString = useMemo(() => {
    if (!shareData) return null;
    return generateTWQR({
      bankCode: shareData.bankCode,
      accountNumber: shareData.accountNumber,
      amount: shareData.amount ?? 0,
      note: shareData.note,
    });
  }, [shareData]);

  /* Loading */
  if (result === null) {
    return (
      <div
        className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"
        role="status"
        aria-label={t.common.loading}
      >
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  /* Need password */
  if (result.status === 'need-password' || result.status === 'wrong-password') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <Lock size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            {t.shared.needPasswordTitle}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
            {t.shared.needPasswordDesc}
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasswordSubmit();
            }}
            placeholder={t.shared.passwordPlaceholder}
            aria-label={t.shared.passwordLabel}
            aria-describedby={result.status === 'wrong-password' ? 'shared-pw-error' : undefined}
            autoFocus
            autoComplete="off"
            className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs text-center"
          />
          {result.status === 'wrong-password' && (
            <div
              id="shared-pw-error"
              role="alert"
              className="flex items-center justify-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-3.5 rounded-xl border border-red-200/50 dark:border-red-500/20 text-sm animate-in slide-in-from-top-2 duration-200 motion-reduce:animate-none"
            >
              <Lock size={18} className="shrink-0" aria-hidden="true" />
              <span className="font-medium">{t.shared.wrongPassword}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handlePasswordSubmit}
            disabled={isDecrypting || !password}
            className="w-full py-4 btn-accent font-semibold rounded-xl text-lg active:scale-98 action-transition shadow-xs disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {isDecrypting ? t.shared.unlocking : t.shared.unlock}
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/', { viewTransition: true })}
          className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mt-2 py-2 px-4 min-h-11 inline-flex items-center rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          {t.common.goHome}
        </button>
      </div>
    );
  }

  /* Expired */
  if (result.status === 'expired') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <Clock size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            {t.shared.expiredTitle}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
            {t.shared.expiredDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/', { viewTransition: true })}
          className="w-full max-w-xs py-4 btn-accent font-semibold rounded-xl text-lg active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          {t.common.goHome}
        </button>
      </div>
    );
  }

  /* Invalid */
  if (result.status === 'invalid' || !shareData || !qrString) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <Unlink size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            {t.shared.invalidTitle}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
            {t.shared.invalidDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/', { viewTransition: true })}
          className="w-full max-w-xs py-4 btn-accent font-semibold rounded-xl text-lg active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          {t.common.goHome}
        </button>
      </div>
    );
  }

  /* Success */
  return (
    <QRDisplay
      value={qrString}
      amount={shareData.amount}
      bankName={bankName}
      accountNumber={shareData.accountNumber}
      bankCode={shareData.bankCode}
      note={shareData.note}
      shareData={shareData}
      onClose={() => navigate('/', { viewTransition: true })}
      isSharedView
    />
  );
};
