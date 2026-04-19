import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';

interface TaskPageProps {
  title: string;
  description?: string;
  onDismiss: () => void;
  children: ReactNode;
  mainId?: string;
  maxWidthClassName?: string;
}

export const TaskPage = ({
  title,
  description,
  onDismiss,
  children,
  mainId = 'task-page-main',
  maxWidthClassName = 'max-w-lg',
}: TaskPageProps) => {
  const t = useLocaleStore((s) => s.t);

  return (
    <div className="min-h-app-screen flex flex-col px-safe bg-zinc-50 dark:bg-zinc-950 pb-safe">
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        {t.common.skipToMain}
      </a>

      <header className="sticky top-0 z-20 bg-zinc-50/85 dark:bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe">
        <div className="px-4 sm:px-6 py-4 flex items-start gap-3">
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t.common.back}
            title={t.common.back}
            className="mt-0.5 p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors shrink-0"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 text-pretty">
                {description}
              </p>
            )}
          </div>
        </div>
      </header>

      <main id={mainId} className={`flex-1 w-full mx-auto px-4 sm:px-6 py-5 ${maxWidthClassName}`}>
        {children}
      </main>
    </div>
  );
};
