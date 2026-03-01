import { Heart } from 'lucide-react';

/** GitHub logo from Simple Icons (MIT). Avoids deprecated lucide brand icons. */
const GithubIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

/**
 * "About" section for the Settings page.
 * Provides links to the Ko-fi sponsor page and the GitHub repository.
 */
export const AboutSection = () => {
  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        關於
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
        <a
          href="https://ko-fi.com/garyellow"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Heart size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">贊助開發者</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              請 AI 吃點 Token，支持專案持續維護
            </p>
          </div>
        </a>

        <a
          href="https://github.com/garyellow/OpenTWQR"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <GithubIcon size={18} className="text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">GitHub 原始碼</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              檢視原始碼、回報問題或參與貢獻
            </p>
          </div>
        </a>
      </div>
    </div>
  );
};
