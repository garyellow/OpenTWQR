import { useState, useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { AmountInput } from '../components/AmountInput';
import { QRDisplay } from '../components/QRDisplay';
import { generateTWQR } from '../utils/twqr';
import { Settings, Wallet, QrCode, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BANKS } from '../data/banks';

export const ReceivePage = () => {
  const [amount, setAmount] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const { accounts, selectedAccountId } = useAppStore();
  const navigate = useNavigate();

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId]
  );

  const bankName = useMemo(() => {
    return BANKS.find((b) => b.code === selectedAccount?.bankCode)?.name || '';
  }, [selectedAccount]);

  const qrString = useMemo(() => {
    if (!selectedAccount) return null;
    const numAmount = amount ? parseInt(amount, 10) : 0;
    return generateTWQR({
      bankCode: selectedAccount.bankCode,
      accountNumber: selectedAccount.accountNumber,
      amount: numAmount,
      note: selectedAccount.note
    });
  }, [selectedAccount, amount]);

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in">
        <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center border border-zinc-800 shadow-xl">
          <Wallet size={40} className="text-zinc-500" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to OpenTWQR</h2>
          <p className="text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Add a bank account to start receiving payments instantly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/accounts')}
          className="w-full max-w-xs py-4 bg-emerald-500 text-black font-bold rounded-2xl text-lg hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          Add Bank Account
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full space-y-6 pb-safe">
        <header className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
               <QrCode size={20} className="text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Receive Money
            </h1>
          </div>
          <Link 
            to="/accounts" 
            className="w-11 h-11 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors border border-zinc-800 active:scale-95"
          >
            <Settings size={20} className="text-zinc-400" />
          </Link>
        </header>

        <section className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800/50 rounded-3xl p-1 shadow-lg">
          <Link to="/accounts" className="flex items-center p-4 hover:bg-zinc-800/50 rounded-2xl transition-colors group">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-lg border border-zinc-700 text-zinc-300 group-hover:border-zinc-600 transition-colors">
              {selectedAccount?.bankCode.substring(0, 1)}
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                 <p className="font-bold text-white truncate">{bankName || 'My Account'}</p>
                 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">TWQR</span>
              </div>
              <p className="text-sm text-zinc-400 tracking-wider font-mono mt-0.5">
                {selectedAccount?.bankCode} • {selectedAccount?.accountNumber.slice(-4).padStart(selectedAccount.accountNumber.length, '•')}
              </p>
            </div>
            <ChevronRight size={20} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </Link>
        </section>

        <section className="flex-1 flex flex-col justify-end space-y-6">
          <AmountInput value={amount} onChange={setAmount} />
          
          <div className="pt-2 pb-6">
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className="group w-full flex items-center justify-center gap-3 py-4 bg-emerald-500 text-black font-bold rounded-[20px] text-xl hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]"
            >
              <QrCode size={24} className="transition-transform group-hover:scale-110" />
              Generate QR Code
            </button>
          </div>
        </section>
      </div>

      {showQR && qrString && (
        <QRDisplay 
          value={qrString} 
          amount={amount ? parseInt(amount, 10) : undefined}
          bankName={bankName}
          accountNumber={selectedAccount?.accountNumber}
          onClose={() => setShowQR(false)} 
        />
      )}
    </div>
  );
};
