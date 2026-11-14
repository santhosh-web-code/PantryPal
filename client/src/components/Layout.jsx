import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, ChevronDown, ChevronRight, KeyRound, LayoutDashboard, LogOut, Menu, Moon, PackageMinus, Settings, ShieldCheck, Soup, Sun, TriangleAlert, User, Users, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePantryActivity } from '../hooks/usePantryActivity.js';

const ownerNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pantries', label: 'My Pantries', icon: Soup },
  { to: '/inventory', label: 'Inventory', icon: Soup },
  { to: '/low-stock', label: 'Low Stock', icon: PackageMinus },
  { to: '/expiry-alerts', label: 'Expiry Alerts', icon: TriangleAlert },
  { to: '/members', label: 'Manage members', icon: Users },
  { to: '/activity', label: 'Activity History', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];
const buyerNavItems = [
  { to: '/buyer/dashboard', label: 'Member Dashboard', icon: LayoutDashboard },
  { to: '/pantries', label: 'My Pantries', icon: Soup },
  { to: '/buyer/shop', label: 'Inventory Items', icon: Soup },
  { to: '/buyer/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { user, portal, status, error, logout } = useAuth();
  const { activities, error: activityError } = usePantryActivity();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('pantrypal-theme') === 'dark');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (status === 'loading') return <main className="page" aria-busy="true">Checking your session…</main>;
  if (status === 'error') return <main className="page" role="alert">Unable to restore your session: {error}</main>;
  if (!user) return <Navigate to="/login" replace />;
  const isBuyer = portal === 'member';
  const initials = user.name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = isBuyer ? 'Member' : 'Owner';
  const navItems = isBuyer ? buyerNavItems : ownerNavItems;
  const ownerPageClass = !isBuyer ? `owner-page-${pathname.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'dashboard'}` : '';
  const handleLogout = async () => {
    try {
      await logout();
    } catch (logoutRequestError) {
      window.alert(`Logout could not be confirmed by the server: ${logoutRequestError.message}`);
    } finally {
      setProfileMenuOpen(false);
      navigate('/login', { replace: true });
    }
  };
  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('pantrypal-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark-theme', next);
  };
  if (document.documentElement.classList.contains('dark-theme') !== darkMode) {
    document.documentElement.classList.toggle('dark-theme', darkMode);
  }

  return (
    <div className={`app-shell ${isBuyer ? 'buyer-shell' : 'owner-shell'} ${ownerPageClass} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Soup size={22} /></div>
          <div><strong>PantryPal</strong><span>{isBuyer ? 'Member pantry portal' : 'Owner management portal'}</span></div>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={19} /><span>{label}</span><ChevronRight className="nav-chevron" size={16} />
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-logout" type="button" onClick={handleLogout}><LogOut size={18}/><span>Logout</span></button>
        <div className="secure-note"><ShieldCheck size={18} /><div><strong>Signed-in session</strong><span>Pantry access is account-scoped</span></div></div>
      </aside>
      {open && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => window.innerWidth <= 800 ? setOpen(open => !open) : setSidebarCollapsed(collapsed => !collapsed)} aria-label="Toggle sidebar menu"><Menu /></button>
          <div className="topbar-search"><span>PantryPal</span><strong>{isBuyer ? 'Member workspace' : 'Owner workspace'}</strong></div>
          <div className="topbar-actions">
            <div className="theme-toggle" role="group" aria-label="Theme">
              <button className={!darkMode ? 'active' : ''} onClick={() => darkMode && toggleTheme()} aria-label="Light mode"><Sun size={16}/></button>
              <button className={darkMode ? 'active' : ''} onClick={() => !darkMode && toggleTheme()} aria-label="Dark mode"><Moon size={16}/></button>
            </div>
            <div className="notification-wrap">
              <button className="icon-button notification" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Recent activity"><Bell size={20} />{activities.length > 0 && <span>{activities.length}</span>}</button>
              {notificationsOpen && <div className="notification-popover"><div className="notification-heading"><strong>Recent activity</strong><button onClick={() => setNotificationsOpen(false)}>Close</button></div>{activities.length ? activities.slice(0, 5).map(entry => <div className="notification-item" key={entry.id}><span className="notification-dot"/><div><strong>{entry.user}</strong><p>{entry.description}</p><small>{entry.time}</small></div></div>) : activityError ? <p className="form-error" role="alert">{activityError}</p> : <p className="empty-state">No activity available yet.</p>}<button className="text-link" onClick={() => { navigate(isBuyer ? '/buyer/shop' : '/activity'); setNotificationsOpen(false); }}>{isBuyer ? 'View inventory' : 'View activity history'}</button></div>}
            </div>
            <div className="profile-menu-wrap">
              <button className="profile-button" onClick={() => setProfileMenuOpen(open => !open)} aria-expanded={profileMenuOpen} aria-haspopup="menu"><span className="avatar">{user.profileImage ? <img src={user.profileImage} alt="" /> : initials}</span><span className="profile-copy"><strong>{user.name}</strong><small>{roleLabel}</small></span><ChevronDown className="profile-chevron" size={15}/></button>
              {profileMenuOpen && <div className="profile-menu" role="menu"><div className="profile-menu-header"><strong>{user.name}</strong><small>{user.email}</small><small>{roleLabel}</small></div><button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate(isBuyer ? '/buyer/profile' : '/profile'); }}><User size={17}/> View profile</button><button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate(isBuyer ? '/owner/login' : '/buyer/login'); }}>{isBuyer ? 'Switch to Owner login' : 'Switch to Member login'}</button><button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate(isBuyer ? '/buyer/settings' : '/settings'); }}><Settings size={17}/> Account settings</button><button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate('/change-password'); }}><KeyRound size={17}/> Change password</button><button type="button" className="profile-menu-logout" role="menuitem" onClick={handleLogout}><LogOut size={17}/> Logout</button></div>}
            </div>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
