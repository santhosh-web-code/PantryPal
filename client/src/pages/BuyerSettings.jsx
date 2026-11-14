import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import ProfileForm from '../components/ProfileForm.jsx';

export default function BuyerSettings() {
  const navigate = useNavigate();

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Member preferences</p><h1>Settings</h1><p>Manage your member profile and account.</p></div></div>
    <div className="settings-grid">
      <ProfileForm />
      <section className="panel settings-section"><div className="settings-heading"><Shield/><div><h2>Privacy & security</h2><p>Manage your member account password</p></div></div><button type="button" className="btn secondary" onClick={() => navigate('/change-password')}>Change password</button></section>
    </div>
  </div>;
}
