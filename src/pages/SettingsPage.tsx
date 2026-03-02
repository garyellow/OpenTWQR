import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { PersonalizationSection } from '../components/settings/PersonalizationSection';
import { UrlSchemeSection } from '../components/settings/UrlSchemeSection';
import { BackupSection } from '../components/settings/BackupSection';
import { SafetySection } from '../components/settings/SafetySection';
import { AboutSection } from '../components/settings/AboutSection';
import { useLocaleStore } from '../stores/useLocaleStore';

export const SettingsPage = () => {
  const t = useLocaleStore((s) => s.t);

  return (
    <div className="min-h-svh flex flex-col px-safe bg-zinc-50 dark:bg-zinc-950 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <a
        href="#settings-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:text-zinc-900 dark:focus:text-white"
      >
        {t.common.skipToMain}
      </a>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ml-1">{t.settings.title}</h1>
          <div className="flex items-center">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Content */}
      <main id="settings-main" className="flex-1 p-5 max-w-md lg:max-w-lg mx-auto w-full">
        <div className="space-y-8 pb-8">
          <PersonalizationSection />
          <UrlSchemeSection />
          <BackupSection />
          <SafetySection />
          <AboutSection />
        </div>
      </main>
    </div>
  );
};
