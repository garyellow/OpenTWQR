import type { BankAccount } from '../types';
import { Trash2, Pencil, Check } from 'lucide-react';
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
  const bankName = banks.find((b) => b.code === account.bankCode)?.name || account.bankCode;

  return (
    <article
      className={`relative p-5 rounded-2xl transition-all border cursor-pointer group ${
        isSelected
          ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white shadow-md'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Select ${bankName} account`}
        className="w-full text-left pr-24"
      >
        <div className="flex items-center gap-3 mb-3">
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0">
              <Check
                size={14}
                className="text-zinc-900 dark:text-white"
                aria-hidden="true"
              />
            </div>
          )}
          <h3 className={`font-semibold truncate text-lg ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'}`}>
            {bankName}
          </h3>
          <span className={`text-xs font-mono shrink-0 px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/20 dark:bg-black/10 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
            {account.bankCode}
          </span>
        </div>

        <p className={`font-mono text-xl tracking-widest ${isSelected ? 'text-white/90 dark:text-zinc-900/90' : 'text-zinc-700 dark:text-zinc-300'}`}>
          {account.accountNumber.replace(/(.{4})/g, '$1 ').trim()}
        </p>

        {account.note && (
          <p className={`text-sm mt-2 truncate ${isSelected ? 'text-white/70 dark:text-zinc-900/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {account.note}
          </p>
        )}
      </button>

      <div className="absolute top-4 right-4 flex gap-1.5">
        {onEdit && (
          <button
            type="button"
            aria-label="Edit account"
            onClick={onEdit}
            className={`p-2.5 rounded-xl transition-colors ${
              isSelected
                ? 'text-white/70 hover:text-white hover:bg-white/20 dark:text-zinc-900/70 dark:hover:text-zinc-900 dark:hover:bg-black/10'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label="Delete account"
            onClick={onDelete}
            className={`p-2.5 rounded-xl transition-colors ${
              isSelected
                ? 'text-white/70 hover:text-red-300 hover:bg-white/20 dark:text-zinc-900/70 dark:hover:text-red-600 dark:hover:bg-black/10'
                : 'text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
            }`}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
};
