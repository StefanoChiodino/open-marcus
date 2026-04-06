import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { ToastContainer } from './Toast';
import LegalDisclaimer from './LegalDisclaimer';
import SkipLink from './SkipLink';
import { useFocusManagement } from '../lib/useFocusManagement';
import './Layout.css';

/**
 * Viewport breakpoints for responsive layout
 */
const TABLET_MIN = 768;
const TABLET_MAX = 1199;
const MOBILE_MAX = 767;

interface LayoutProps {
  children?: React.ReactNode;
}

function useIsMobileBreakpoint(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_MAX;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_MAX);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

function useIsTabletBreakpoint(): boolean {
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    return w >= TABLET_MIN && w <= TABLET_MAX;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsTablet(w >= TABLET_MIN && w <= TABLET_MAX);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTablet;
}

function AppLayout({ children }: LayoutProps) {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const isMobile = useIsMobileBreakpoint();
  const isTablet = useIsTabletBreakpoint();

  // Auto-collapse sidebar on tablet; mobile uses bottom nav (toggle hidden)
  useEffect(() => {
    if (isTablet) {
      setNavCollapsed(true);
    }
  }, [isTablet]);

  // Focus management: moves focus to page heading on route changes for screen readers
  useFocusManagement();

  const handleToggleNav = () => {
    setNavCollapsed((prev) => !prev);
  };

  return (
    <div className={`app-layout${isMobile ? ' app-layout--mobile' : ''}`}>
      <SkipLink target="#main-content" />
      <div className="app-layout__content">
        <Navigation
          isCollapsed={navCollapsed || isTablet}
          onToggle={handleToggleNav}
          hideToggle={isMobile || isTablet}
        />
        <main className="app-layout__main" id="main-content" tabIndex={-1}>
          {children || <Outlet />}
          <ToastContainer />
        </main>
      </div>
      <LegalDisclaimer />
    </div>
  );
}

export default AppLayout;
