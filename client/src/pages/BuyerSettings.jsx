import { Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function BuyerSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = user.name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">Member preferences</p><h1>Settings</h1><p>Manage your member profile and account.</p></div></div>
      <div className="settings-grid">
        <section className="panel settings-section">
          <div className="settings-heading"><User /><div><h2>Profile</h2><p>Signed-in account details</p></div></div>
          <div className="member-profile-editor buyer-profile-editor">
            <div className="member-photo large">
              <span>{initials}</span>
            </div>
          </div>
          <label>Display name<input value={user.name} readOnly /></label>
          <label>Email address<input type="email" value={user.email} readOnly /></label>
        </section>
        <section className="panel settings-section">
          <div className="settings-heading"><Shield /><div><h2>Privacy & security</h2><p>Manage your member account password</p></div></div>
          <button type="button" className="btn secondary" onClick={() => navigate('/change-password')}>Change password</button>
        </section>
      </div>
    </div>
  );
}
