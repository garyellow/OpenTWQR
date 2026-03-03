import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAppStore } from '../../stores/useAppStore';

/**
 * Layout wrapper for the main tabbed pages.
 * Renders the active page via <Outlet /> and the persistent bottom navigation.
 * The bottom nav is hidden when the user has no accounts (welcome / empty state).
 */
export const TabLayout = () => {
  const hasAccounts = useAppStore((s) => s.accounts.length > 0);

  return (
    <>
      <Outlet />
      {hasAccounts && <BottomNav />}
    </>
  );
};
