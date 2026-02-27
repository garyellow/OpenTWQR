import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRDisplay } from '../components/receive/QRDisplay';
import { parseShareUrl } from '../utils/share';
import { generateTWQR } from '../utils/twqr';
import { useBanksStore } from '../stores/useBanksStore';
import { Unlink, Lock, Clock } from 'lucide-react';
import type { ParseShareResult } from '../types';

export const SharedPage = () => {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();
  const banks = useBanksStore((state) => state.banks);

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
    setResult(res);
    setIsDecrypting(false);
  }, [data, fragment, password]);

  const shareData = result?.status === 'ok' ? result.data : null;

  const bankName = useMemo(() => {
    if (!shareData) return '';
    return banks.find((b) => b.code === shareData.bankCode)?.name || shareData.bankCode;
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
      <div className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  /* Need password */
  if (result.status === 'need-password' || result.status === 'wrong-password') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <Lock size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            需要密碼
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
            此收款連結受密碼保護，請輸入密碼以查看。
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
            placeholder="輸入密碼"
            aria-label="連結密碼"
            aria-describedby={result.status === 'wrong-password' ? 'shared-pw-error' : undefined}
            autoFocus
            autoComplete="off"
            className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs text-center"
          />
          {result.status === 'wrong-password' && (
            <p id="shared-pw-error" role="alert" className="text-red-500 dark:text-red-400 text-sm text-center">密碼錯誤，請重新輸入</p>
          )}
          <button
            type="button"
            onClick={handlePasswordSubmit}
            disabled={isDecrypting || !password}
            className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 transition-all shadow-xs disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {isDecrypting ? '解密中…' : '解鎖'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/', { viewTransition: true })}
          className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mt-2"
        >
          前往首頁
        </button>
      </div>
    );
  }

  /* Expired */
  if (result.status === 'expired') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <Clock size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            連結已過期
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
            此收款連結已超過有效期限，無法繼續使用。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/', { viewTransition: true })}
          className="w-full max-w-xs py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 transition-all shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          前往首頁
        </button>
      </div>
    );
  }

  /* Invalid */
  if (result.status === 'invalid' || !shareData || !qrString) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs">
          <Unlink size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            連結無效
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-65 mx-auto leading-relaxed text-lg text-pretty">
            此收款連結無法解析，可能已損壞或格式不正確。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/', { viewTransition: true })}
          className="w-full max-w-xs py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-98 transition-all shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          前往首頁
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
      note={shareData.note}
      shareData={shareData}
      onClose={() => navigate('/', { viewTransition: true })}
      isSharedView
    />
  );
};
