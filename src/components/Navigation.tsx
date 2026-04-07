import { NavLink, useNavigate } from 'react-router-dom';
import { navItems } from './navItems';
import { useAuthStore } from '../stores/authStore';
import './Navigation.css';

interface NavigationProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  hideToggle?: boolean;
}

function Navigation({ isCollapsed = false, onToggle, hideToggle = false }: NavigationProps) {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav
      className={`navigation ${isCollapsed ? 'navigation--collapsed' : ''}`}
      aria-label="Main navigation"
    >
      {!hideToggle && (
        <button
          className="navigation__toggle"
          onClick={onToggle}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!isCollapsed}
        >
          <MenuIcon isCollapsed={isCollapsed} />
        </button>
      )}

      <div className="navigation__brand">
        <NavLink to="/" className="navigation__brand-link">
          <span className="navigation__brand-icon" aria-hidden="true">
            <img src="/open-marcus-logo-transparent.png" alt="" width="28" height="28" />
          </span>
          {!isCollapsed && <span className="navigation__brand-text">OpenMarcus</span>}
        </NavLink>
      </div>

      <ul className="navigation__list" role="list">
        {navItems.map((item) => (
          <li className="navigation__item" key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `navigation__link ${isActive ? 'navigation__link--active' : ''}`
              }
            >
              <span className="navigation__link-icon" aria-hidden="true">
                {item.icon}
              </span>
              {!isCollapsed && <span className="navigation__link-label">{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>

      {isAuthenticated && (
        <div className="navigation__logout">
          <button
            className="navigation__logout-button"
            onClick={handleLogout}
            aria-label="Log out of your account"
          >
            <span className="navigation__link-icon" aria-hidden="true">
              <LogoutIcon />
            </span>
            {!isCollapsed && <span className="navigation__link-label">Log Out</span>}
          </button>
        </div>
      )}
    </nav>
  );
}

function MenuIcon({ isCollapsed }: { isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 00-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default Navigation;
export { Navigation };
