import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import Pantry from '../src/models/Pantry.js';
import User from '../src/models/User.js';
import { authenticate } from '../src/middleware/auth.js';

let mongo;
let app;
let identity;
let verificationCalls;
const previousSecret = process.env.JWT_SECRET;
const previousClientUrl = process.env.CLIENT_URL;
const verifier = 'test-code-verifier';

const fakeGoogleOAuth = {
  async generateCodeVerifier() {
    return { codeVerifier: verifier, codeChallenge: 'test-code-challenge' };
  },
  async createAuthorizationUrl({ state, codeChallenge, nonce }) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('nonce', nonce);
    identity.nonce = nonce;
    return url.toString();
  },
  async verifyAuthorizationCode(input) {
    verificationCalls.push(input);
    return identity;
  }
};

before(async () => {
  process.env.JWT_SECRET = 'test-secret-for-google-authentication';
  process.env.CLIENT_URL = 'http://localhost:5173';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp({ authenticate, googleOAuth: fakeGoogleOAuth });
});

beforeEach(async () => {
  await User.deleteMany({});
  await Pantry.deleteMany({});
  identity = {
    sub: 'google-sub-123',
    email: 'google@example.test',
    email_verified: true,
    name: 'Google Example',
    picture: 'https://lh3.googleusercontent.com/profile.jpg'
  };
  verificationCalls = [];
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
  if (previousClientUrl === undefined) delete process.env.CLIENT_URL;
  else process.env.CLIENT_URL = previousClientUrl;
});

async function begin(client, role) {
  const response = await client.get(`/api/auth/google/${role}`).expect(302);
  const authorizationUrl = new URL(response.headers.location);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.equal(authorizationUrl.searchParams.get('code_challenge'), 'test-code-challenge');
  assert.ok(authorizationUrl.searchParams.get('nonce'));
  return authorizationUrl.searchParams.get('state');
}

async function callback(client, state) {
  return client.get(`/api/auth/google/callback?state=${encodeURIComponent(state)}&code=verified-code`);
}

test('initiates Owner and Buyer Google sign-in with CSRF state and PKCE', async () => {
  const portal = await request(app).get('/api/auth/google?role=buyer').expect(302);
  assert.equal(portal.headers.location, 'http://localhost:5173/login');
  for (const role of ['owner', 'buyer']) {
    const client = request.agent(app);
    const state = await begin(client, role);
    assert.equal(typeof state, 'string');
    assert.ok(state.length >= 40);
  }
});

test('creates an Owner account from a verified Google identity and reuses it on repeated login', async () => {
  const client = request.agent(app);
  let state = await begin(client, 'owner');
  let response = await callback(client, state);

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, 'http://localhost:5173/auth/callback');
  assert.match(response.headers['set-cookie'].join(';'), /pantrypal-token=.*HttpOnly/i);
  const restored = await client.get('/api/auth/me');
  const userId = restored.body.user.id;
  assert.equal(restored.body.user.name, 'Google Example');
  assert.equal(restored.body.user.role, 'owner');
  assert.equal(restored.body.user.googleId, undefined);
  assert.equal(restored.body.user.passwordHash, undefined);
  assert.equal(restored.body.user.profileImage, identity.picture);
  assert.equal(await Pantry.countDocuments({ ownerId: userId }), 1);
  assert.equal(verificationCalls[0].codeVerifier, verifier);

  state = await begin(client, 'owner');
  response = await callback(client, state);
  assert.equal(response.status, 302);
  assert.equal((await User.countDocuments({ email: identity.email })).valueOf(), 1);
  assert.equal((await client.get('/api/auth/me')).body.user.id, userId);
  assert.equal(await Pantry.countDocuments({ ownerId: userId }), 1);
});

test('creates a Buyer account without a password or owner pantry', async () => {
  const client = request.agent(app);
  let state = await begin(client, 'buyer');
  assert.equal((await callback(client, state)).status, 302);

  const user = await User.findOne({ email: identity.email }).select('+googleId +passwordHash');
  assert.equal(user.role, 'buyer');
  assert.equal(user.googleId, identity.sub);
  assert.equal(user.passwordHash, undefined);
  assert.equal(await Pantry.countDocuments({ ownerId: user._id }), 0);
  assert.equal((await client.get('/api/auth/me')).body.user.role, 'buyer');
});

test('maps Google given and family names into the profile display name when full name is unavailable', async () => {
  identity = {
    ...identity,
    name: undefined,
    given_name: 'Santhosh',
    family_name: 'Kumar',
    email: 'santhosh.kumar@example.test'
  };
  const client = request.agent(app);
  const state = await begin(client, 'buyer');
  await callback(client, state);

  const response = await client.get('/api/auth/me').expect(200);
  assert.equal(response.body.user.name, 'Santhosh Kumar');
  assert.equal(response.body.user.email, 'santhosh.kumar@example.test');
});

test('rejects invalid OAuth state before verifying an identity', async () => {
  const client = request.agent(app);
  await begin(client, 'owner');
  const response = await callback(client, 'attacker-controlled-state');
  assert.equal(response.status, 302);
  assert.match(response.headers.location, /error=invalid_state/);
  assert.equal(verificationCalls.length, 0);
  assert.equal(await User.countDocuments(), 0);
});

test('rejects Google email collisions without silently linking password accounts', async () => {
  await User.create({ name: 'Existing Password User', email: identity.email, passwordHash: 'existing-hash', role: 'owner' });
  const client = request.agent(app);
  const state = await begin(client, 'owner');
  const response = await callback(client, state);
  assert.match(response.headers.location, /error=account_link_required/);
  assert.equal(await User.countDocuments(), 1);
  assert.equal((await User.findOne({ email: identity.email }).select('+googleId')).googleId, undefined);
});

test('uses one linked Google identity in either portal and rejects unverified email', async () => {
  await User.create({ name: 'Linked User', email: identity.email, googleId: identity.sub, role: 'owner' });
  const buyerClient = request.agent(app);
  let state = await begin(buyerClient, 'buyer');
  let response = await callback(buyerClient, state);
  assert.equal(response.headers.location, 'http://localhost:5173/auth/callback');
  const memberSession = await buyerClient.get('/api/auth/me').expect(200);
  assert.equal(memberSession.body.user.role, 'owner');
  assert.equal(memberSession.body.portal, 'member');

  await User.deleteMany({});
  identity = { ...identity, email: 'unverified@example.test', email_verified: false };
  const ownerClient = request.agent(app);
  state = await begin(ownerClient, 'owner');
  response = await callback(ownerClient, state);
  assert.match(response.headers.location, /error=email_unverified/);
  assert.equal(await User.countDocuments(), 0);

  identity = { ...identity, email: 'nonce@example.test', email_verified: true, nonce: 'incorrect-nonce' };
  const nonceClient = request.agent(app);
  state = await begin(nonceClient, 'owner');
  identity.nonce = 'incorrect-nonce';
  response = await callback(nonceClient, state);
  assert.match(response.headers.location, /error=identity_invalid/);
  assert.equal(await User.countDocuments(), 0);
});

test('handles Google cancellation and preserves normal logout behavior', async () => {
  const client = request.agent(app);
  let state = await begin(client, 'buyer');
  const cancelled = await client.get(`/api/auth/google/callback?state=${encodeURIComponent(state)}&error=access_denied`);
  assert.match(cancelled.headers.location, /error=cancelled/);
  assert.equal(verificationCalls.length, 0);

  const loginClient = request.agent(app);
  state = await begin(loginClient, 'buyer');
  await callback(loginClient, state);
  assert.equal((await loginClient.get('/api/auth/me')).status, 200);
  assert.equal((await loginClient.post('/api/auth/logout')).status, 204);
  assert.equal((await loginClient.get('/api/auth/me')).status, 401);
});
