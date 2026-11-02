import { OAuth2Client } from 'google-auth-library';
import { HttpError } from '../middleware/errors.js';

function getConfig() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL ||
      [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL].some(value => value.includes('<') || value.includes('>') || value.startsWith('your-google-'))) {
    throw new HttpError(503, 'Google sign-in is not configured on the server', 'GOOGLE_OAUTH_NOT_CONFIGURED');
  }

  let callbackUrl;
  try {
    callbackUrl = new URL(GOOGLE_CALLBACK_URL);
  } catch {
    throw new HttpError(503, 'Google sign-in is not configured on the server', 'GOOGLE_OAUTH_NOT_CONFIGURED');
  }
  if (!['http:', 'https:'].includes(callbackUrl.protocol) || callbackUrl.username || callbackUrl.password ||
      callbackUrl.pathname !== '/api/auth/google/callback' || callbackUrl.search || callbackUrl.hash ||
      (process.env.NODE_ENV === 'production' && callbackUrl.protocol !== 'https:')) {
    throw new HttpError(503, 'Google sign-in is not configured on the server', 'GOOGLE_OAUTH_NOT_CONFIGURED');
  }

  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackUrl: callbackUrl.toString() };
}

function createClient(config) {
  return new OAuth2Client(config.clientId, config.clientSecret, config.callbackUrl);
}

export function createGoogleOAuthService({
  clientFactory = createClient,
  codeVerifierFactory = async () => new OAuth2Client().generateCodeVerifierAsync()
} = {}) {
  return {
    async generateCodeVerifier() {
      return codeVerifierFactory();
    },

    async createAuthorizationUrl({ state, codeChallenge, nonce }) {
      const client = clientFactory(getConfig());
      return client.generateAuthUrl({
        access_type: 'online',
        prompt: 'select_account',
        response_type: 'code',
        scope: ['openid', 'email', 'profile'],
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });
    },

    async verifyAuthorizationCode({ code, codeVerifier }) {
      const config = getConfig();
      const client = clientFactory(config);
      const { tokens } = await client.getToken({ code, codeVerifier });
      if (!tokens.id_token) throw new HttpError(401, 'Google did not return a valid identity token', 'GOOGLE_IDENTITY_INVALID');
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const payload = ticket.getPayload();
      if (!payload || !payload.iss || !payload.aud || !payload.exp || payload.exp * 1000 <= Date.now()) {
        throw new HttpError(401, 'Google identity token is invalid or expired', 'GOOGLE_IDENTITY_INVALID');
      }
      const audienceMatches = Array.isArray(payload.aud) ? payload.aud.includes(config.clientId) : payload.aud === config.clientId;
      if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) || !audienceMatches) {
        throw new HttpError(401, 'Google identity token could not be verified', 'GOOGLE_IDENTITY_INVALID');
      }
      return payload;
    }
  };
}
