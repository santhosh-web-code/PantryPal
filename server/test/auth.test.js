import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import Pantry from '../src/models/Pantry.js';
import User from '../src/models/User.js';
import InventoryActivity from '../src/models/InventoryActivity.js';
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
  await InventoryActivity.deleteMany({});
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

test('updates only the authenticated profile and rejects duplicate email addresses', async () => {
  const client = request.agent(app);
  const profile = await client.post('/api/auth/register').send({
    name: 'Profile Owner',
    email: 'profile@example.test',
    password: 'secure-password',
    role: 'owner'
  });
  const otherClient = request.agent(app);
  await otherClient.post('/api/auth/register').send({
    name: 'Other Owner',
    email: 'other@example.test',
    password: 'secure-password',
    role: 'owner'
  }).expect(201);

  const updated = await client.patch('/api/auth/profile').send({
    name: 'Updated Owner',
    email: 'updated@example.test',
    profileImage: 'https://example.test/profile.png'
  }).expect(200);
  assert.equal(updated.body.user.id, profile.body.user.id);
  assert.equal(updated.body.user.name, 'Updated Owner');
  assert.equal(updated.body.user.email, 'updated@example.test');
  assert.equal(updated.body.user.profileImage, 'https://example.test/profile.png');
  assert.equal((await client.get('/api/auth/me')).body.user.name, 'Updated Owner');

  await client.patch('/api/auth/profile').send({ email: 'other@example.test' }).expect(409);
  await client.patch('/api/auth/profile').send({ userId: 'another-user', name: 'Attempted update' }).expect(400);
  assert.equal((await User.findById(profile.body.user.id)).name, 'Updated Owner');
});

test('changes passwords only after checking the current password', async () => {
  const client = request.agent(app);
  await client.post('/api/auth/register').send({
    name: 'Password Owner',
    email: 'password@example.test',
    password: 'secure-password',
    role: 'owner'
  }).expect(201);

  await client.patch('/api/auth/password').send({
    currentPassword: 'wrong-password',
    newPassword: 'new-password'
  }).expect(401);
  await client.patch('/api/auth/password').send({
    currentPassword: 'secure-password',
    newPassword: 'new-password'
  }).expect(200);
  await client.post('/api/auth/login').send({
    email: 'password@example.test',
    password: 'new-password'
  }).expect(200);
});
