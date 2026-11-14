import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import ProfileForm from '../components/ProfileForm.jsx';

export default function Settings() {
  const navigate = useNavigate();

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Preferences</p><h1>Settings</h1><p>Manage your profile and account security.</p></div></div>
    <div className="settings-grid">
      <ProfileForm />
      <section className="panel settings-section"><div className="settings-heading"><Shield/><div><h2>Privacy & security</h2><p>Keep your shared pantry secure</p></div></div><button type="button" className="btn secondary" onClick={() => navigate('/change-password')}>Change password</button></section>
    </div>
  </div>;
}
