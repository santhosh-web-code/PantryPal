import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, profileImage: user.profileImage || '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ name: user.name, email: user.email, profileImage: user.profileImage || '' });
  }, [user]);

  const submit = async event => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 2 || name.length > 80) {
      setError('Name must contain 2 to 80 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (form.profileImage) {
      try {
        const imageUrl = new URL(form.profileImage.trim());
        if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new Error('Unsupported protocol');
      } catch {
        setError('Profile image must be an HTTP or HTTPS URL.');
        return;
      }
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateProfile({ name, email, profileImage: form.profileImage.trim() });
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return <form className="panel settings-section" onSubmit={submit} noValidate>
    <div className="settings-heading"><User/><div><h2>Account</h2><p>Profile and personal information</p></div></div>
    <label>Display name<input autoComplete="name" value={form.name} maxLength="80" onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} required /></label>
    <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} required /></label>
    <label>Profile image URL<input type="url" value={form.profileImage} maxLength="2048" placeholder="https://example.com/photo.jpg" onChange={event => setForm(previous => ({ ...previous, profileImage: event.target.value }))} /></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    {saved && <div className="form-success" role="status">Profile updated successfully.</div>}
    <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
  </form>;
}
