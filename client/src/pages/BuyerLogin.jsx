import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, ShoppingBag } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';

export default function BuyerLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(form.email) || form.password.length < 6) { setError('Enter a valid email and password with at least 6 characters.'); return; }
    try { await login(form, 'member'); navigate('/buyer/dashboard'); } catch (requestError) { setError(requestError.message); }
  };
  return <div className="auth-page buyer-auth"><main className="auth-form-panel"><form className="auth-form" onSubmit={submit} noValidate><div className="portal-icon"><ShoppingBag /></div><p className="eyebrow">Member portal</p><h1>Member Login</h1><p className="auth-subtitle">View shared inventory and update item quantities.</p><label>Email address<div className="input-icon"><Mail size={18}/><input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="name@example.com" /></div></label><label>Password<div className="input-icon"><LockKeyhole size={18}/><input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="At least 6 characters" /></div></label>{error && <div className="form-error">{error}</div>}<button className="btn auth-submit">Sign in as Member</button><div className="auth-form-divider">or</div><GoogleAuthButton role="member"/><p className="auth-switch">New to PantryPal? <Link to="/buyer/register">Create a member account</Link></p><p className="portal-switch"><Link to="/owner/login">Owner login instead</Link></p></form></main><div className="auth-brand-panel buyer-brand"><div className="auth-brand"><span><ShoppingBag /></span><strong>PantryPal Member</strong></div><div><h2>Shared pantry inventory.</h2><p>Keep item quantities current for everyone in your pantry.</p></div></div></div>;
}
