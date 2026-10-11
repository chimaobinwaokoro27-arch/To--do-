import { useEffect } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import BrandLogo from './BrandLogo.jsx';

// The navigation rail. On wide screens CSS keeps it as a fixed column; below
// 900px it becomes a drawer that this component opens and closes.
function Sidebar({ user, onAddTask, onLogout, isOpen, onClose, appearance, onOpenPanel }) {
  const { mode, toggleMode } = appearance;

  // Escape closes the drawer, matching the close button and the scrim.
  useEffect(() => {
    if (!isOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const initial = (user?.email || '?').charAt(0).toUpperCase();

  return (
    <aside
      id="app-sidebar"
      className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar__top">
        <div className="brand">
          <span className="brand__logo" aria-hidden="true">
            <BrandLogo decorative />
          </span>
          <span className="brand__text">
            <span className="brand__name">TaskFlow</span>
            <span className="brand__tag">Glass workspace</span>
          </span>
        </div>

        <button
          type="button"
          className="sidebar__close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="button button--accent button--block"
        onClick={onAddTask}
      >
        <span className="button__icon" aria-hidden="true">
          +
        </span>
        Add task
      </button>

      <nav className="sidebar__nav" aria-label="Sections">
        <div className="nav-item nav-item--active" aria-current="page">
          <span className="nav-item__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
            </svg>
          </span>
          Dashboard
        </div>
      </nav>

      <div className="sidebar__appearance">
        <button
          type="button"
          className="button button--ghost button--block"
          onClick={onOpenPanel}
        >
          <span className="button__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6h9M17 6h3M4 12h4M12 12h8M4 18h11M19 18h1" />
              <circle cx="15" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="17" cy="18" r="2" />
            </svg>
          </span>
          Theme &amp; appearance
        </button>

        <div className="appearance">
          <span className="appearance__text">
            <span className="appearance__label">Appearance</span>
            <span className="appearance__hint">
              {mode === 'dark' ? 'Dark' : 'Light'}
            </span>
          </span>
          <ThemeToggle mode={mode} onToggle={toggleMode} />
        </div>
      </div>

      <div className="sidebar__foot">
        <div className="account">
          <span className="account__avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="account__email" title={user?.email}>
            {user?.email}
          </span>
        </div>

        <button
          type="button"
          className="button button--ghost button--block"
          onClick={() => onLogout()}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
