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
      <div className="max-w-lg mx-auto flex items-center justify-around gap-1.5 h-(--bottom-nav-height) px-2">
        {tabs.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={() => haptic()}
            title={labels[labelKey]}
            className={({ isActive }) => `flex flex-1 max-w-24 min-h-11 min-w-18 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 active:scale-95 ${
              isActive
                ? 'shadow-xs'
                : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70'
            }`}
            style={({ isActive }) => isActive
              ? {
                  backgroundColor: 'var(--ca-light)',
                }
              : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={21}
                  className={isActive ? '' : 'text-zinc-400 dark:text-zinc-500'}
                  style={
                    isActive
                      ? { color: 'var(--ca)' }
                      : undefined
                  }
                  aria-hidden="true"
                />
                <span
                  className={`text-[11px] font-semibold leading-tight ${
                    isActive ? '' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                  style={
                    isActive
                      ? { color: 'var(--ca)' }
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
      {/* Safe area spacer for devices with bottom insets / gesture bars */}
      <div className="pb-safe" />
    </nav>
  );
};
