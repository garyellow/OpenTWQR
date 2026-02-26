import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useLocation } from 'react-router-dom';

/**
 * A non-intrusive bottom banner that prompts users to install the PWA.
 *
 * - On Chromium browsers: clicking "安裝應用程式" triggers the browser's
 *   **native install dialog** (including Richer Install UI with screenshots
 *   on Android / desktop Chrome) via the official `beforeinstallprompt` API.
 *   We are NOT building a custom install dialog — we only provide a small
 *   teaser banner; the actual install UI is the browser's own.
 * - On iOS Safari: shows step-by-step instructions to "Add to Home Screen",
 *   since Safari doesn't support `beforeinstallprompt`.
 * - Respects prior dismissals (30-day cooldown) and never shows when
 *   already running in standalone mode.
 * - Hidden on shared `/s/:data` pages (irrelevant for payment senders).
 */
export const InstallPrompt = () => {
  const { canShow, platform, promptInstall, dismiss } = useInstallPrompt();
  const location = useLocation();

  // Don't show on shared payment pages — those are for payers, not the app owner
  if (!canShow || !platform || location.pathname.startsWith('/s/')) return null;

  return (
    <div
      role="complementary"
      aria-label="安裝應用程式"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2.5rem)] max-w-sm pb-safe animate-in slide-in-from-bottom-4 fade-in duration-300 motion-reduce:animate-none"
    >
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 pr-12">
        {/* Dismiss button */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="關閉安裝提示"
          className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>

        {platform === 'chromium' ? (
          /* ---------- Chromium: native install ---------- */
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Download size={20} className="text-zinc-600 dark:text-zinc-300" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                安裝 OpenTWQR
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                安裝至主畫面，離線也能使用，收款更快速。
              </p>
              <button
                type="button"
                onClick={promptInstall}
                className="mt-2.5 px-4 py-2 rounded-xl text-sm font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                安裝應用程式
              </button>
            </div>
          </div>
        ) : (
          /* ---------- iOS Safari: manual instructions ---------- */
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Download size={20} className="text-zinc-600 dark:text-zinc-300" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                安裝 OpenTWQR
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                點擊底部
                <Share
                  size={14}
                  className="inline-block mx-0.5 -mt-0.5 text-blue-500"
                  aria-label="分享"
                />
                分享按鈕，再選擇「<span className="font-medium text-zinc-700 dark:text-zinc-300">加入主畫面</span>」即可安裝。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
