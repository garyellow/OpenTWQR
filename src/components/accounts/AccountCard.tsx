import type { BankAccount } from '../../types';
import { Trash2, Pencil } from 'lucide-react';
import { useBanksStore } from '../../stores/useBanksStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { maskAccount, stripCompanySuffix } from '../../utils/twqr';
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
  const t = useLocaleStore((s) => s.t);
  const banks = useBanksStore((state) => state.banks);
  const bank = banks.find((b) => b.code === account.bankCode);
  const bankName = stripCompanySuffix(bank?.name || '');
  const displayName = account.label || bankName || account.bankCode;

  return (
    <article
      className={`relative min-w-0 p-5 rounded-2xl action-transition ${isSelected
        ? 'border shadow-md'
        : 'app-surface shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      style={isSelected ? {
        backgroundColor: 'light-dark(var(--accent), var(--accent-dark))',
        borderColor: 'light-dark(var(--accent), var(--accent-dark))',
      } : undefined}
    >
      {/* Full-card tap target */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={t.accounts.selectAccount(displayName)}
        className="absolute inset-0 w-full h-full rounded-2xl cursor-pointer z-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
      />

      {/* Card content */}
      <div className="relative pr-20 pointer-events-none">
        <div className="flex items-center gap-3 mb-1 min-w-0">
          <BankIcon iconUrl={account.iconUrl} bankUrl={bank?.url} bankCode={account.bankCode} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h3 className={`font-semibold truncate text-base ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}>
                {displayName}
              </h3>
            </div>
          </div>
        </div>

        <p className={`font-mono text-base tracking-wider mt-2 ${isSelected ? 'text-white/90 dark:text-zinc-900/90' : 'text-zinc-700 dark:text-zinc-300'}`}>
          {maskAccount(account.accountNumber)}
        </p>

        <div className={`flex items-center gap-2 mt-2 min-w-0 ${isSelected ? 'text-white/60 dark:text-zinc-900/60' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {bankName && (
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
            aria-label={t.accounts.editAccount}
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
            aria-label={t.accounts.deleteAccount}
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
