import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { AppLockSection } from '../components/settings/AppLockSection';
import { BackupSection } from '../components/settings/BackupSection';
import { AboutSection } from '../components/settings/AboutSection';

export const SettingsPage = () => {
  return (
    <div className="min-h-svh flex flex-col px-safe pb-safe bg-zinc-50 dark:bg-zinc-950">
      <a
        href="#settings-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        跳至主要內容
      </a>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              viewTransition
              aria-label="返回"
              className="p-2.5 -ml-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">設定</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Content */}
      <main id="settings-main" className="flex-1 p-5 max-w-md mx-auto w-full">
        <div className="space-y-8 pb-24">
          <AppLockSection />
          <BackupSection />
          <AboutSection />
        </div>
      </main>
    </div>
  );
};
