import { useLocaleStore } from '../../stores/useLocaleStore';

/** Minimal full-screen spinner shown while data or a lazy page chunk is loading. */
export const PageLoader = () => {
  const t = useLocaleStore((s) => s.t);
  return (
    <div
      className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"
      role="status"
      aria-label={t.common.loading}
    >
      <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
    </div>
  );
};
