import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleOAuthService } from '../src/services/googleOAuth.js';

const originalEnv = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  NODE_ENV: process.env.NODE_ENV
};

function configureEnv() {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/auth/google/callback';
  delete process.env.NODE_ENV;
}

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('requires all Google OAuth environment settings without exposing secret values', async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CALLBACK_URL;

  await assert.rejects(
    createGoogleOAuthService().createAuthorizationUrl({ state: 'test-state', codeChallenge: 'challenge' }),
    error => error.status === 503 && error.code === 'GOOGLE_OAUTH_NOT_CONFIGURED' && !error.message.includes('secret')
  );
});

test('uses PKCE, exact callback configuration, and verifies Google ID tokens for the configured audience', async () => {
  configureEnv();
  const calls = {};
  const service = createGoogleOAuthService({
    clientFactory: config => {
      calls.config = config;
      return {
        generateAuthUrl: options => {
          calls.auth = options;
          return 'https://accounts.google.com/test';
        },
        getToken: async options => {
          calls.token = options;
          return { tokens: { id_token: 'signed-google-id-token' } };
        },
        verifyIdToken: async options => {
          calls.verify = options;
          return { getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: 'test-client-id',
            exp: Math.floor(Date.now() / 1000) + 60,
            email: 'person@example.test',
            email_verified: true,
            sub: 'google-sub'
          }) };
        }
      };
    },
    codeVerifierFactory: async () => ({ codeVerifier: 'verifier', codeChallenge: 'challenge' })
  });

  const { codeVerifier, codeChallenge } = await service.generateCodeVerifier();
  await service.createAuthorizationUrl({ state: 'state', codeChallenge, nonce: 'openid-nonce' });
  const identity = await service.verifyAuthorizationCode({ code: 'authorization-code', codeVerifier });

  assert.equal(calls.auth.code_challenge_method, 'S256');
  assert.equal(calls.auth.code_challenge, 'challenge');
  assert.equal(calls.auth.nonce, 'openid-nonce');
  assert.ok(calls.auth.scope.includes('openid'));
  assert.deepEqual(calls.token, { code: 'authorization-code', codeVerifier: 'verifier' });
  assert.deepEqual(calls.verify, { idToken: 'signed-google-id-token', audience: 'test-client-id' });
  assert.equal(identity.email_verified, true);
  assert.equal(calls.config.callbackUrl, 'http://localhost:5000/api/auth/google/callback');
});
