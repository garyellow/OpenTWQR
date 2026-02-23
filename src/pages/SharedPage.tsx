import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRDisplay } from '../components/QRDisplay';
import { parseShareData, buildShareUrl } from '../utils/share';
import { generateTWQR } from '../utils/twqr';
import { useBanksStore } from '../stores/useBanksStore';
import { Unlink } from 'lucide-react';

export const SharedPage = () => {
  const { data } = useParams<{ data: string }>();
  const navigate = useNavigate();
  const banks = useBanksStore((state) => state.banks);

  const shareData = useMemo(() => {
    if (!data) return null;
    return parseShareData(data);
  }, [data]);

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

  const shareUrl = useMemo(() => {
    if (!shareData) return '';
    return buildShareUrl(shareData);
  }, [shareData]);

  /* Invalid or missing share data */
  if (!shareData || !qrString) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center p-8 gap-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <Unlink size={48} className="text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            連結無效
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-[260px] mx-auto leading-relaxed text-lg">
            此收款連結無法解析，可能已損壞或格式不正確。
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full max-w-xs py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-2xl text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          前往首頁
        </button>
      </div>
    );
  }

  return (
    <QRDisplay
      value={qrString}
      amount={shareData.amount}
      bankName={bankName}
      accountNumber={shareData.accountNumber}
      note={shareData.note}
      shareUrl={shareUrl}
      onClose={() => navigate('/')}
    />
  );
};
