import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { ToastContainer } from './Toast';
import LegalDisclaimer from './LegalDisclaimer';
import SkipLink from './SkipLink';
import { useFocusManagement } from '../lib/useFocusManagement';
import './Layout.css';

interface LayoutProps {
  children?: React.ReactNode;
}

function AppLayout({ children }: LayoutProps) {
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Focus management: moves focus to page heading on route changes for screen readers
  useFocusManagement();

  const handleToggleNav = () => {
    setNavCollapsed((prev) => !prev);
  };

  return (
    <div className="app-layout">
      <SkipLink target="#main-content" />
      <Navigation isCollapsed={navCollapsed} onToggle={handleToggleNav} />
      <main className="app-layout__main" id="main-content" tabIndex={-1}>
        {children || <Outlet />}
        <ToastContainer />
      </main>
      <LegalDisclaimer />
    </div>
  );
}

export default AppLayout;
