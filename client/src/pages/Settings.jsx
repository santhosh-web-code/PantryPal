import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePantry } from '../context/PantryContext.jsx';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaceName, updateWorkspaceName } = usePantry();
  const [workspace, setWorkspace] = useState(workspaceName);
  const [saved, setSaved] = useState(false);

  useEffect(() => setWorkspace(workspaceName), [workspaceName]);

  const save = event => {
    event.preventDefault();
    updateWorkspaceName(workspace);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Preferences</p><h1>Settings</h1><p>Manage your workspace preferences.</p></div></div>
    <div className="settings-grid">
      <form className="panel settings-section" onSubmit={save}>
        <div className="settings-heading"><User/><div><h2>Account</h2><p>Profile and personal information</p></div></div>
        <label>Display name<input value={user.name} readOnly /></label>
        <label>Email<input type="email" value={user.email} readOnly /></label>
        <label>Workspace name<input value={workspace} onChange={event => setWorkspace(event.target.value)} required /></label>
        <button className="btn" type="submit">{saved ? 'Changes saved' : 'Save changes'}</button>
      </form>
      <section className="panel settings-section"><div className="settings-heading"><Bell/><div><h2>Notifications</h2><p>Choose what updates you receive</p></div></div>{['Low-stock alerts','Expiry reminders','Member activity'].map((x,i)=><label className="toggle-row" key={x}><span>{x}<small>{i===0?'When an item reaches its minimum':'Email and in-app updates'}</small></span><input type="checkbox" defaultChecked={i!==1}/></label>)}</section>
      <section className="panel settings-section"><div className="settings-heading"><Shield/><div><h2>Privacy & security</h2><p>Keep your shared pantry secure</p></div></div><button type="button" className="btn secondary" onClick={() => navigate('/change-password')}>Change password</button></section>
    </div>{saved && <div className="toast">Account and workspace details updated.</div>}</div>;
}
