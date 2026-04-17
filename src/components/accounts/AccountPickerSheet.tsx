import { useEffect, useRef, type AnimationEvent } from 'react';
import { Check, Settings2, X } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { useDelayedClose } from '../../hooks/useDelayedClose';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { BankIcon } from './BankIcon';

export interface AccountPickerOption {
  id: string;
  title: string;
  subtitle?: string;
  caption?: string;
  bankCode: string;
  iconUrl?: string;
  bankUrl?: string;
}

interface AccountPickerSheetProps {
  title: string;
  description?: string;
  options: AccountPickerOption[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onManageAccounts?: () => void;
  manageLabel?: string;
  selectedLabel?: string;
  closeLabel: string;
}

/**
 * Mobile-first account picker shown as a bottom sheet.
 * Keeps account switching lightweight while leaving heavier editing tasks
 * to the dedicated Accounts page.
 */
export const AccountPickerSheet = ({
  title,
  description,
  options,
  selectedId,
  onSelect,
  onClose,
  onManageAccounts,
  manageLabel,
  selectedLabel,
  closeLabel,
}: AccountPickerSheetProps) => {
  const { isClosing, requestClose, onAnimationEnd } = useDelayedClose(onClose);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock(true);
  useFocusTrap(sheetRef, true, closeButtonRef);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestClose]);

  const handleManageAccounts = () => {
    haptic();
    requestClose();
    onManageAccounts?.();
  };

  const handleSelect = (id: string) => {
    haptic();
    onSelect(id);
    requestClose();
  };

  const handleSheetAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    onAnimationEnd(event);
  };

  return (
    <div className="fixed inset-0 z-90">
      <div
        className={`absolute inset-0 bg-black/35 dark:bg-black/55 backdrop-blur-sm motion-reduce:animate-none ${
          isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'
        }`}
        onClick={requestClose}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-picker-title"
          aria-describedby={description ? 'account-picker-description' : undefined}
          className={`pointer-events-auto w-full max-w-md overflow-hidden app-modal-shell border border-zinc-200/70 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 motion-reduce:animate-none ${
            isClosing
              ? 'animate-out fade-out slide-out-to-bottom-4 duration-150'
              : 'animate-in fade-in slide-in-from-bottom-4 duration-200'
          }`}
          onAnimationEnd={handleSheetAnimationEnd}
        >
          <div className="flex justify-center px-5 pt-3">
            <div className="h-1.5 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
          </div>

          <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-4">
            <div className="min-w-0 flex-1">
              <h2 id="account-picker-title" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {title}
              </h2>
              {description && (
                <p
                  id="account-picker-description"
                  className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={requestClose}
              aria-label={closeLabel}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-app-sheet overflow-y-auto overscroll-contain px-3 pb-3">
            <div className="space-y-2">
              {options.map((option) => {
                const isSelected = option.id === selectedId;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
                      isSelected
                        ? 'border-transparent chip-accent shadow-xs'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <BankIcon
                      iconUrl={option.iconUrl}
                      bankUrl={option.bankUrl}
                      bankCode={option.bankCode}
                      size="sm"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`truncate text-sm font-semibold ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {option.title}
                        </p>
                        {selectedLabel && isSelected && (
                          <span className="shrink-0 rounded-full bg-white/18 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-black/10 dark:text-zinc-900">
                            {selectedLabel}
                          </span>
                        )}
                      </div>

                      {option.subtitle && (
                        <p className={`mt-0.5 truncate font-mono text-xs tracking-wider ${isSelected ? 'text-white/85 dark:text-zinc-900/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          {option.subtitle}
                        </p>
                      )}

                      {option.caption && (
                        <p className={`mt-1 truncate text-[11px] ${isSelected ? 'text-white/70 dark:text-zinc-900/65' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {option.caption}
                        </p>
                      )}
                    </div>

                    {isSelected ? (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 text-white dark:bg-black/10 dark:text-zinc-900">
                        <Check size={16} aria-hidden="true" />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {onManageAccounts && manageLabel && (
            <div className="border-t border-zinc-200/80 px-3 pb-3 pt-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleManageAccounts}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
              >
                <Settings2 size={16} aria-hidden="true" />
                {manageLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
