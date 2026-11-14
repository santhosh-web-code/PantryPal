import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { apiRequest } from '../utils/api.js';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async event => {
    event.preventDefault();
    if (!form.current || !form.next || !form.confirm) return setError('Complete all password fields.');
    if (form.next.length < 6) return setError('The new password must contain at least 6 characters.');
    if (form.next !== form.confirm) return setError('The new passwords do not match.');
    setError('');
    setSaving(true);
    try {
      await apiRequest('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next })
      });
      setSaved(true);
      setForm({ current: '', next: '', confirm: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="page password-page">
    <button type="button" className="text-link password-back" onClick={() => navigate(-1)}><ArrowLeft size={18}/> Back to settings</button>
    <div className="page-heading"><div><p className="eyebrow">Privacy & security</p><h1>Change password</h1><p>Choose a new password for your PantryPal account.</p></div></div>
    <form className="panel password-form" onSubmit={submit}>
      <div className="password-icon"><LockKeyhole size={24}/></div>
      <label>Current password<input type="password" value={form.current} onChange={event => setForm({ ...form, current: event.target.value })}/></label>
      <label>New password<input type="password" value={form.next} onChange={event => setForm({ ...form, next: event.target.value })}/></label>
      <label>Confirm new password<input type="password" value={form.confirm} onChange={event => setForm({ ...form, confirm: event.target.value })}/></label>
      {error && <div className="form-error">{error}</div>}
      {saved && <div className="form-success" role="status">Password updated successfully.</div>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => navigate(-1)}>Cancel</button><button type="submit" className="btn" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button></div>
    </form>
  </div>;
}
