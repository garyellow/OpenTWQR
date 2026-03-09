import { CircleAlert, TriangleAlert } from 'lucide-react';
import { AnimatedModal } from './AnimatedModal';
import { useLocaleStore } from '../../stores/useLocaleStore';

type ConfirmDialogVariant = 'warning' | 'danger';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: ConfirmDialogVariant;
}

const ICONS = {
  warning: TriangleAlert,
  danger: CircleAlert,
} as const;

const ICON_WRAPPERS: Record<ConfirmDialogVariant, string> = {
  warning: 'bg-amber-100 dark:bg-amber-500/20',
  danger: 'bg-red-100 dark:bg-red-500/20',
};

const ICON_COLORS: Record<ConfirmDialogVariant, string> = {
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const CONFIRM_BUTTONS: Record<ConfirmDialogVariant, string> = {
  warning: 'text-amber-900 dark:text-amber-50 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 focus-visible:ring-amber-500',
  danger: 'text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus-visible:ring-red-500',
};

export const ConfirmDialog = ({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) => {
  const t = useLocaleStore((s) => s.t);
  const Icon = ICONS[variant];

  return (
    <AnimatedModal
      onClose={onCancel}
      overlayClass="z-60"
      cardClass="max-w-sm p-6"
      ariaLabelledby="confirm-dialog-title"
      ariaDescribedby="confirm-dialog-desc"
    >
      {(requestClose) => (
        <>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 mx-auto ${ICON_WRAPPERS[variant]}`}>
            <Icon size={24} className={ICON_COLORS[variant]} aria-hidden="true" />
          </div>
          <h2 id="confirm-dialog-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-center">
            {title}
          </h2>
          <p id="confirm-dialog-desc" className="mt-3 text-zinc-500 dark:text-zinc-400 text-center leading-relaxed text-pretty">
            {description}
          </p>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={requestClose}
              className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-4 rounded-xl font-semibold action-transition active:scale-98 shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${CONFIRM_BUTTONS[variant]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </>
      )}
    </AnimatedModal>
  );
};
