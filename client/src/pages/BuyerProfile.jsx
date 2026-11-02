import { Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function BuyerProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = user.name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page buyer-profile-page">
      <div className="page-heading">
        <div><p className="eyebrow">Member account</p><h1>My Profile</h1><p>Your shared pantry details and member activity.</p></div>
      </div>
      <section className="panel profile-panel buyer-profile-panel">
        <div className="profile-banner buyer-profile-banner">
          <div className="buyer-profile-photo">
            <span>{initials}</span>
          </div>
        </div>
        <div className="profile-details buyer-profile-details">
          <div className="buyer-profile-title">
            <div><h2>{user.name}</h2><p>PantryPal member</p></div>
            <span className="buyer-active-badge"><ShieldCheck size={15} /> Active member</span>
          </div>
          <div className="buyer-profile-meta">
            <span><Mail size={18} />{user.email}</span>
            <span><UserRound size={18} />Member</span>
            <span><UserRound size={18} />ID: {user.id}</span>
          </div>
          <button className="btn" onClick={() => navigate('/buyer/settings')}>Edit profile</button>
        </div>
      </section>
    </div>
  );
}
