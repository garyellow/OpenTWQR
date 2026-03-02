import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

/**
 * Layout wrapper for the main tabbed pages.
 * Renders the active page via <Outlet /> and the persistent bottom navigation.
 */
export const TabLayout = () => {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
};
