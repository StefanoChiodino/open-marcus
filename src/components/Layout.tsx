import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { ToastContainer } from './Toast';
import LegalDisclaimer from './LegalDisclaimer';
import './Layout.css';

interface LayoutProps {
  children?: React.ReactNode;
}

function AppLayout({ children }: LayoutProps) {
  const [navCollapsed, setNavCollapsed] = useState(false);

  const handleToggleNav = () => {
    setNavCollapsed((prev) => !prev);
  };

  return (
    <div className="app-layout">
      <Navigation isCollapsed={navCollapsed} onToggle={handleToggleNav} />
      <main className="app-layout__main" id="main-content">
        {children || <Outlet />}
        <ToastContainer />
      </main>
      <LegalDisclaimer />
    </div>
  );
}

export default AppLayout;
