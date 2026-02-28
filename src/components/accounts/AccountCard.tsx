import type { BankAccount } from '../../types';
import { Trash2, Pencil, Check } from 'lucide-react';
import { useBanksStore } from '../../stores/useBanksStore';
import { maskAccount } from '../../utils/twqr';
import { BankIcon } from './BankIcon';

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
  const bank = banks.find((b) => b.code === account.bankCode);
  const bankName = bank?.name || account.bankCode;
  const displayName = account.label || bankName;
  const showBankSubtitle = Boolean(account.label);

  return (
    <article
      className={`relative min-w-0 p-5 rounded-2xl action-transition border ${isSelected
        ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 shadow-md'
        : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
        }`}
    >
      {/* Full-card tap target */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`選擇 ${displayName} 帳戶`}
        className="absolute inset-0 w-full h-full rounded-2xl cursor-pointer z-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      />

      {/* Card content */}
      <div className="relative pr-20 pointer-events-none">
        <div className="flex items-center gap-3 mb-1 min-w-0">
          {isSelected ? (
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0">
              <Check
                size={16}
                className="text-zinc-900 dark:text-zinc-100"
                aria-hidden="true"
              />
            </div>
          ) : (
            <BankIcon iconUrl={account.iconUrl} bankUrl={bank?.url} bankCode={account.bankCode} size="sm" />
          )}
          <h3 className={`font-semibold truncate text-base ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {displayName}
          </h3>
        </div>

        <p className={`font-mono text-base tracking-widest mt-2 ${isSelected ? 'text-white/90 dark:text-zinc-900/90' : 'text-zinc-700 dark:text-zinc-300'}`}>
          {maskAccount(account.accountNumber)}
        </p>

        <div className={`flex items-baseline gap-2 mt-2 ${isSelected ? 'text-white/60 dark:text-zinc-900/60' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {showBankSubtitle && (
            <span className="text-sm truncate">
              {bankName}
            </span>
          )}
          <span className={`text-xs font-mono shrink-0 px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/15 dark:bg-black/8' : 'bg-zinc-100 dark:bg-zinc-800/50'}`}>
            {account.bankCode}
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-1.5 z-10">
        {onEdit && (
          <button
            type="button"
            aria-label="編輯帳戶"
            onClick={onEdit}
            className={`p-3 rounded-xl transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${isSelected
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
            aria-label="刪除帳戶"
            onClick={onDelete}
            className={`p-3 rounded-xl transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 ${isSelected
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
