import { useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

/**
 * Displays a non-intrusive toast when a new service worker is ready,
 * prompting the user to reload for the latest version.
 *
 * The "稍後" action plays a slide-out + fade-out animation; `onAnimationEnd`
 * removes the toast from the tree once the animation completes.
 */
export const ReloadPrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [isClosing, setIsClosing] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsClosing(true);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      setNeedRefresh(false);
      setIsClosing(false);
    }
  }, [isClosing, setNeedRefresh]);

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-100 flex items-center gap-3 px-5 py-3 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xl border border-zinc-700 dark:border-zinc-300 motion-reduce:animate-none ${
        isClosing
          ? 'animate-out slide-out-to-bottom-4 fade-out duration-300'
          : 'animate-in slide-in-from-bottom-4 fade-in duration-300'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      <RefreshCw size={18} className="shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">有新版本可用</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="ml-1 px-3 py-1.5 text-sm font-semibold rounded-lg bg-white/20 dark:bg-black/10 hover:bg-white/30 dark:hover:bg-black/20 transition-colors"
      >
        更新
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="關閉"
        className="ml-1 px-3 py-2 text-sm rounded-lg text-white/60 dark:text-zinc-900/60 hover:text-white dark:hover:text-zinc-900 transition-colors"
      >
        稍後
      </button>
    </div>
  );
};
