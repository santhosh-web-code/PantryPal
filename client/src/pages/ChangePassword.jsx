import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = event => {
    event.preventEventDefault?.();
    event.preventDefault();
    if (!form.current || !form.next || !form.confirm) return setError('Complete all password fields.');
    if (form.next.length < 6) return setError('The new password must contain at least 6 characters.');
    if (form.next !== form.confirm) return setError('The new passwords do not match.');
    setError('');
    setSaved(true);
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
      {saved && <div className="form-success">Password updated successfully. This is a frontend demo.</div>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => navigate(-1)}>Cancel</button><button type="submit" className="btn">Update password</button></div>
    </form>
  </div>;
}
