export const AUTH_COOKIE_NAME = 'pantrypal-token';
export const GOOGLE_STATE_COOKIE_NAME = 'pantrypal-google-state';
export const GOOGLE_STATE_COOKIE_PATH = '/api/auth/google/callback';

export function authCookieOptions(includeMaxAge = true) {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
    ...(includeMaxAge ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {})
  };
}

export function readAuthCookie(req) {
  return readCookie(req, AUTH_COOKIE_NAME);
}

export function readCookie(req, name) {
  const cookieHeader = req.get('cookie') || '';
  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function googleStateCookieOptions(includeMaxAge = true) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: GOOGLE_STATE_COOKIE_PATH,
    ...(includeMaxAge ? { maxAge: 10 * 60 * 1000 } : {})
  };
}
