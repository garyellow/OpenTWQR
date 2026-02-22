import type { BankAccount } from '../types';
import { Trash2, Edit2, CreditCard } from 'lucide-react';
import { useBanksStore } from '../stores/useBanksStore';

interface AccountCardProps {
  account: BankAccount;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
}

export const AccountCard = ({
  account,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
}: AccountCardProps) => {
  const banks = useBanksStore((state) => state.banks);
  const bankName = banks.find((bank) => bank.code === account.bankCode)?.name || account.bankCode;

  return (
    <article
      className={`relative p-5 rounded-2xl transition-[border-color,background-color,box-shadow] duration-300 border cursor-pointer group
        ${isSelected
          ? 'bg-zinc-800 border-emerald-500 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        }
      `}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Select ${bankName} account`}
        className="w-full text-left focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-xl"
      >
        <div className="flex items-center justify-between mb-4 pr-24">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="font-medium text-zinc-200 text-lg leading-tight">{bankName}</h3>
              <p className="text-zinc-500 text-sm font-mono mt-0.5">{account.bankCode}</p>
            </div>
          </div>
          {isSelected && (
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          )}
        </div>

        <div className="font-mono text-xl tracking-wider text-zinc-300 mb-1">
          {account.accountNumber.replace(/(.{4})/g, '$1 ').trim()}
        </div>

        {account.note && (
          <p className="text-zinc-500 text-sm truncate">{account.note}</p>
        )}
      </button>

      <div className="absolute top-3 right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        {onEdit && (
          <button
            type="button"
            aria-label="Edit account"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e);
            }}
            className="w-11 h-11 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-emerald-500/50 flex items-center justify-center"
          >
            <Edit2 size={16} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label="Delete account"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="w-11 h-11 rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-500/40 flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </article>
  );
};
