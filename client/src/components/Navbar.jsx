import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, portal, logout } = useAuth();
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      window.alert(`Logout could not be confirmed by the server: ${error.message}`);
    } finally {
      navigate('/login', { replace: true });
    }
  };
  return (
    <nav className="navbar">
      <span className="brand">PantryPal</span>
      <div className="nav-links">
        <NavLink to="/members">Members</NavLink>
        <NavLink to="/activity">Activity</NavLink>
        {user && <span>{user.name} · {portal === 'member' ? 'Member' : 'Owner'}</span>}
        <button className="link-button" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
