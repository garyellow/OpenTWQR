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
      className={`relative p-4 rounded-xl transition-colors border cursor-pointer group ${
        isSelected
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Select ${bankName} account`}
        className="w-full text-left pr-20"
      >
        <div className="flex items-center gap-2 mb-2">
          {isSelected && (
            <Check
              size={16}
              className="text-emerald-600 dark:text-emerald-400 shrink-0"
              aria-hidden="true"
            />
          )}
          <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{bankName}</h3>
          <span className="text-xs text-zinc-500 font-mono shrink-0">{account.bankCode}</span>
        </div>

        <p className="font-mono text-lg tracking-wider text-zinc-700 dark:text-zinc-300">
          {account.accountNumber.replace(/(.{4})/g, '$1 ').trim()}
        </p>

        {account.note && (
          <p className="text-zinc-500 text-sm mt-1 truncate">{account.note}</p>
        )}
      </button>

      <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        {onEdit && (
          <button
            type="button"
            aria-label="Edit account"
            onClick={onEdit}
            className="p-2.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label="Delete account"
            onClick={onDelete}
            className="p-2.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
};
