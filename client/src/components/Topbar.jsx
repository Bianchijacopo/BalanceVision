import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Topbar({ title }) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo gradient-title">BalanceVision</span>
        {title && (
          <>
            <div className="topbar-divider" />
            <span className="topbar-page">{title}</span>
          </>
        )}
      </div>
      <div className="topbar-right">
        <button onClick={toggle} className="theme-toggle" title={theme === 'light' ? 'Tema scuro' : 'Tema chiaro'}>
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
        <div
          className="user-menu"
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <div className="avatar">{initials}</div>
          <span className="text-sm text-secondary">{user?.name || user?.email}</span>
          <div className={`dropdown-menu ${menuOpen ? 'dropdown-visible' : ''}`}>
            <button className="dropdown-item" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
              Entra nel profilo
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item" onClick={handleLogout}>
              Disconnetti
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
