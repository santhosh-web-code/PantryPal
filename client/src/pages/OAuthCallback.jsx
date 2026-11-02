import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const errorMessages = {
  cancelled: 'Google sign-in was cancelled.',
  invalid_state: 'Google sign-in could not be verified. Please try again.',
  configuration: 'Google sign-in is not configured on the server.',
  role_mismatch: 'Choose the portal you want to use and try again.',
  account_unavailable: 'This PantryPal account is unavailable. Contact support if you believe this is an error.',
  account_link_required: 'An account already uses this email. Sign in with that account first; automatic Google account linking is disabled.',
  email_unverified: 'Google must verify your email address before you can sign in.',
  identity_invalid: 'Google did not provide a valid account. Please try again.',
  oauth_failed: 'Google sign-in could not be completed. Please try again.'
};

export default function OAuthCallback() {
  const { user, portal } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  if (user) return <Navigate to={portal === 'member' ? '/buyer/dashboard' : '/dashboard'} replace />;

  return (
    <main className="oauth-result">
      <section>
        <h1>Google sign-in</h1>
        <p role={error ? 'alert' : 'status'}>{errorMessages[error] || 'Sign-in did not complete. Please choose a portal and try again.'}</p>
        <div>
          <Link className="btn" to="/owner/login">Owner portal</Link>
          <Link className="btn secondary" to="/buyer/login">Member portal</Link>
        </div>
      </section>
    </main>
  );
}
