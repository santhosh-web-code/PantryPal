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
const previousSecret = process.env.JWT_SECRET;

before(async () => {
  process.env.JWT_SECRET = 'test-secret-for-cookie-authentication';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp({ authenticate });
});

beforeEach(async () => {
  await User.deleteMany({});
  await Pantry.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

test('registers, restores, logs out, and logs in an owner with a safe cookie session', async () => {
  const client = request.agent(app);
  const registration = await client.post('/api/auth/register').send({
    name: 'Owner Example',
    email: 'owner@example.test',
    password: 'secure-password',
    role: 'owner'
  });

  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.name, 'Owner Example');
  assert.equal(registration.body.user.email, 'owner@example.test');
  assert.equal(registration.body.user.role, 'owner');
  assert.ok(registration.body.user.id);
  assert.equal(registration.body.user.passwordHash, undefined);
  assert.equal(registration.body.token, undefined);
  assert.match(registration.headers['set-cookie'][0], /HttpOnly/i);

  const restored = await client.get('/api/auth/me');
  assert.equal(restored.status, 200);
  assert.equal(restored.body.user.id, registration.body.user.id);
  assert.equal(restored.body.user.email, 'owner@example.test');
  assert.equal(restored.body.portal, 'owner');

  assert.equal((await client.post('/api/auth/logout')).status, 204);
  assert.equal((await client.get('/api/auth/me')).status, 401);

  const login = await client.post('/api/auth/login').send({ email: 'owner@example.test', password: 'secure-password' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.name, 'Owner Example');
  assert.equal((await client.get('/api/auth/me')).status, 200);
});

test('registers buyers with the stored buyer role and rejects invalid credentials', async () => {
  const client = request.agent(app);
  const registration = await client.post('/api/auth/register').send({
    name: 'Buyer Example',
    email: 'buyer@example.test',
    password: 'secure-password',
    role: 'buyer'
  });

  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.role, 'buyer');
  assert.equal((await client.get('/api/auth/me')).body.user.role, 'buyer');
  assert.equal((await client.post('/api/auth/register').send({
    name: 'Duplicate Buyer',
    email: 'buyer@example.test',
    password: 'secure-password',
    role: 'buyer'
  })).status, 409);
  assert.equal((await request(app).post('/api/auth/login').send({
    email: 'buyer@example.test',
    password: 'wrong-password'
  })).status, 401);
});
