import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../stores/useThemeStore';

const MODES = ['system', 'light', 'dark'] as const;
type ThemeMode = (typeof MODES)[number];

const ICONS: Record<ThemeMode, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const LABELS: Record<ThemeMode, string> = {
  system: '跟隨系統',
  light: '淺色模式',
  dark: '深色模式',
};

export const ThemeToggle = () => {
  const { mode, setMode } = useThemeStore();

  const cycle = () => {
    const idx = MODES.indexOf(mode);
    setMode(MODES[(idx + 1) % MODES.length]);
  };

  const Icon = ICONS[mode];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      className="p-2.5 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
};
