import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';
import './Navigation.css';

interface NavigationProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  hideToggle?: boolean;
}

function Navigation({ isCollapsed = false, onToggle, hideToggle = false }: NavigationProps) {
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
            <svg width="28" height="28" viewBox="0 0 28 28" fill="currentColor">
              <path d="M14 2L4 7v14l10 5 10-5V7L14 2zm0 2.5L21.5 8 14 11.5 6.5 8 14 4.5zM6 10.2l7 3.5v9.8l-7-3.5v-9.8zm9 13.3v-9.8l7-3.5v9.8l-7 3.5z" />
            </svg>
          </span>
          {!isCollapsed && <span className="navigation__brand-text">OpenMarcus</span>}
        </NavLink>
      </div>

      <ul className="navigation__list" role="list">
        {navItems.map((item) => (
          <li className="navigation__item" key={item.path}>
            <NavLink
              to={item.path}
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

export default Navigation;
export { Navigation };
