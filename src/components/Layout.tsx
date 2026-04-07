import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { ToastContainer } from './Toast';
import SkipLink from './SkipLink';
import { useFocusManagement } from '../lib/useFocusManagement';
import './Layout.css';

/**
 * Viewport breakpoints for responsive layout
 */
const TABLET_MIN = 768;
const TABLET_MAX = 1199;
const MOBILE_MAX = 767;
const DESKTOP_MIN = 1200;

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

function useIsDesktopBreakpoint(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= DESKTOP_MIN;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_MIN);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
}

function AppLayout({ children }: LayoutProps) {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const isMobile = useIsMobileBreakpoint();
  const isTablet = useIsTabletBreakpoint();
  const isDesktop = useIsDesktopBreakpoint();

  // Auto-collapse sidebar on tablet; auto-expand on desktop
  useEffect(() => {
    if (isTablet) {
      setNavCollapsed(true);
    } else if (isDesktop) {
      setNavCollapsed(false);
    }
  }, [isTablet, isDesktop]);

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
          hideToggle={isMobile || isTablet || isDesktop}
        />
        <main className="app-layout__main" id="main-content" tabIndex={-1}>
          {children || <Outlet />}
          <ToastContainer />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
