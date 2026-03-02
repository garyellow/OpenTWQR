import { NavLink } from 'react-router-dom';
import { QrCode, ScanLine, Wallet, Settings } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { haptic } from '../../utils/haptics';

const tabs = [
  { path: '/', icon: QrCode, labelKey: 'receive' as const },
  { path: '/scan', icon: ScanLine, labelKey: 'scan' as const },
  { path: '/accounts', icon: Wallet, labelKey: 'accounts' as const },
  { path: '/settings', icon: Settings, labelKey: 'settings' as const },
];

export const BottomNav = () => {
  const t = useLocaleStore((s) => s.t);

  const labels: Record<string, string> = {
    receive: t.nav.receive,
    scan: t.nav.scan,
    accounts: t.nav.accounts,
    settings: t.nav.settings,
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 px-safe"
      aria-label={t.nav.ariaLabel}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        {tabs.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={() => haptic()}
            className="flex flex-col items-center justify-center gap-0.5 min-w-16 py-1.5 rounded-xl transition-colors"
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  className={isActive ? '' : 'text-zinc-400 dark:text-zinc-500'}
                  style={
                    isActive
                      ? { color: 'light-dark(var(--accent), var(--accent-dark))' }
                      : undefined
                  }
                  aria-hidden="true"
                />
                <span
                  className={`text-[10px] font-semibold leading-tight ${
                    isActive ? '' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                  style={
                    isActive
                      ? { color: 'light-dark(var(--accent), var(--accent-dark))' }
                      : undefined
                  }
                >
                  {labels[labelKey]}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="pb-safe" />
    </nav>
  );
};
