import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import InventoryActivity from '../src/models/InventoryActivity.js';
import Pantry from '../src/models/Pantry.js';
import PantryItem from '../src/models/PantryItem.js';
import User from '../src/models/User.js';
import { authenticate } from '../src/middleware/auth.js';
import { authorizePantryAccess } from '../src/middleware/inventoryDependencies.js';

let mongo;
let app;
const previousSecret = process.env.JWT_SECRET;

before(async () => {
  process.env.JWT_SECRET = 'test-secret-for-multi-pantry';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp({ authenticate, authorizePantryAccess });
});

beforeEach(async () => {
  await InventoryActivity.deleteMany({});
  await PantryItem.deleteMany({});
  await Pantry.deleteMany({});
  await User.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

async function register(client, name, email, portal) {
  const response = await client.post('/api/auth/register').send({
    name,
    email,
    password: 'secure-password',
    portal
  });
  assert.equal(response.status, 201);
  return response.body.user;
}

test('one password identity has distinct signed owner and member portal contexts', async () => {
  const ownerClient = request.agent(app);
  const owner = await register(ownerClient, 'Owner Example', 'owner@example.test', 'owner');
  const firstOwned = await Pantry.findOne({ ownerId: owner.id });
  const secondOwned = await ownerClient.post('/api/pantries').send({ name: 'Office Pantry' }).expect(201);
  const memberAccount = await register(request.agent(app), 'Member Example', 'member@example.test', 'member');
  await ownerClient.post(`/api/pantries/${firstOwned.id}/members`).send({ email: memberAccount.email }).expect(201);

  const memberClient = request.agent(app);
  const memberLogin = await memberClient.post('/api/auth/login').send({
    email: 'member@example.test',
    password: 'secure-password',
    portal: 'member'
  }).expect(200);
  assert.equal(memberLogin.body.user.id, memberAccount.id);
  assert.equal(memberLogin.body.portal, 'member');
  assert.equal((await memberClient.get('/api/auth/me')).body.portal, 'member');
  assert.equal((await memberClient.get('/api/pantries/member')).body.pantries.length, 1);
  assert.equal((await memberClient.get('/api/pantries/owned')).status, 403);

  const memberAccountOwnerSession = await request.agent(app);
  await memberAccountOwnerSession.post('/api/auth/login').send({
    email: 'member@example.test',
    password: 'secure-password',
    portal: 'owner'
  }).expect(200);
  assert.equal((await memberAccountOwnerSession.get('/api/pantries/owned')).body.pantries.length, 0);

  const ownerMemberSession = await request.agent(app);
  await ownerMemberSession.post('/api/auth/login').send({
    email: 'owner@example.test',
    password: 'secure-password',
    portal: 'member'
  }).expect(200);
  assert.deepEqual((await ownerMemberSession.get('/api/pantries/member')).body.pantries, []);

  await ownerClient.post('/api/auth/login').send({
    email: 'owner@example.test',
    password: 'secure-password',
    portal: 'owner'
  }).expect(200);
  const owned = await ownerClient.get('/api/pantries/owned').expect(200);
  assert.deepEqual(new Set(owned.body.pantries.map(pantry => pantry.id)), new Set([firstOwned.id, secondOwned.body.pantry.id]));
  assert.equal(await User.countDocuments({ email: 'owner@example.test' }), 1);
});

test('membership management is owner-only and scoped to one pantry', async () => {
  const ownerClient = request.agent(app);
  const owner = await register(ownerClient, 'Owner Example', 'owner@example.test', 'owner');
  const pantry = await Pantry.findOne({ ownerId: owner.id });
  const anotherOwnerClient = request.agent(app);
  await register(anotherOwnerClient, 'Other Owner', 'other@example.test', 'owner');
  const member = await register(request.agent(app), 'Member Example', 'member@example.test', 'member');

  await ownerClient.post(`/api/pantries/${pantry.id}/members`).send({ email: member.email }).expect(201);
  const listedMembers = await ownerClient.get(`/api/pantries/${pantry.id}/members`).expect(200);
  assert.equal(listedMembers.body.members.length, 1);
  assert.equal(listedMembers.body.members[0].id, member.id);
  assert.equal(listedMembers.body.members[0].email, member.email);
  assert.equal(listedMembers.body.members[0].role, 'member');
  await ownerClient.post(`/api/pantries/${pantry.id}/members`).send({ email: member.email }).expect(409);
  await anotherOwnerClient.post(`/api/pantries/${pantry.id}/members`).send({ email: 'member@example.test' }).expect(403);
  await ownerClient.put(`/api/pantries/${pantry.id}`).send({ name: 'Updated pantry' }).expect(200);
  assert.equal((await ownerClient.get(`/api/pantries/${pantry.id}`).expect(200)).body.pantry.name, 'Updated pantry');

  const memberClient = request.agent(app);
  await memberClient.post('/api/auth/login').send({ email: member.email, password: 'secure-password', portal: 'member' }).expect(200);
  await memberClient.get(`/api/pantries/${pantry.id}`).expect(200);
  await memberClient.put(`/api/pantries/${pantry.id}`).send({ name: 'Not allowed' }).expect(403);
  await memberClient.post('/api/pantries').send({ name: 'Not allowed' }).expect(403);
  await memberClient.delete(`/api/pantries/${pantry.id}/members/${owner.id}`).expect(403);
  await ownerClient.delete(`/api/pantries/${pantry.id}/members/${member.id}`).expect(200);
  assert.equal((await Pantry.findById(pantry.id)).memberIds.length, 0);
});

test('members can request pantry access and owners approve or reject requests', async () => {
  const ownerClient = request.agent(app);
  const owner = await register(ownerClient, 'Owner Example', 'owner@example.test', 'owner');
  const pantry = await Pantry.findOne({ ownerId: owner.id });
  const item = await PantryItem.create({
    pantryId: pantry._id,
    name: 'Rice',
    quantity: 5,
    unit: 'kg',
    lowStockThreshold: 1,
    createdBy: owner.id
  });
  const member = await register(request.agent(app), 'Member Example', 'member@example.test', 'member');
  const memberClient = request.agent(app);
  await memberClient.post('/api/auth/login')
    .send({ email: member.email, password: 'secure-password', portal: 'member' })
    .expect(200);

  const discoverable = await memberClient.get('/api/pantries/discover').expect(200);
  assert.equal(discoverable.body.pantries.length, 1);
  assert.equal(discoverable.body.pantries[0].id, pantry.id);
  assert.equal(discoverable.body.pantries[0].status, 'available');
  assert.equal(discoverable.body.pantries[0].ownerName, owner.name);

  await memberClient.post(`/api/pantries/${pantry.id}/join-requests`).expect(201);
  await memberClient.post(`/api/pantries/${pantry.id}/join-requests`).expect(409);
  assert.equal((await memberClient.get('/api/pantries/discover')).body.pantries[0].status, 'pending');
  await memberClient.get(`/api/pantries/${pantry.id}`).expect(403);
  await memberClient.get(`/api/pantries/${pantry.id}/items`).expect(403);

  const requests = await ownerClient.get(`/api/pantries/${pantry.id}/join-requests`).expect(200);
  assert.equal(requests.body.requests.length, 1);
  assert.equal(requests.body.requests[0].id, member.id);
  const ownedRequests = await ownerClient.get('/api/pantries/owned/join-requests').expect(200);
  assert.equal(ownedRequests.body.requests.length, 1);
  assert.equal(ownedRequests.body.requests[0].id, member.id);
  assert.equal(ownedRequests.body.requests[0].pantryId, pantry.id);
  const memberRequests = await memberClient.get('/api/pantries/owned/join-requests').expect(403);
  await memberClient.patch(`/api/pantries/${pantry.id}/join-requests/${member.id}`)
    .send({ action: 'approve' }).expect(403);
  await ownerClient.patch(`/api/pantries/${pantry.id}/join-requests/${member.id}`)
    .send({ action: 'reject' }).expect(200);
  assert.equal((await memberClient.get('/api/pantries/discover')).body.pantries[0].status, 'available');

  await memberClient.post(`/api/pantries/${pantry.id}/join-requests`).expect(201);
  await ownerClient.patch(`/api/pantries/${pantry.id}/join-requests/${member.id}`)
    .send({ action: 'approve' }).expect(200);
  assert.equal((await memberClient.get('/api/pantries/member')).body.pantries[0].id, pantry.id);
  assert.equal((await memberClient.get(`/api/pantries/${pantry.id}/items`)).body.items[0].id, item.id);
  assert.equal((await ownerClient.get(`/api/pantries/${pantry.id}/members`)).body.members[0].id, member.id);
  assert.equal((await ownerClient.get(`/api/pantries/${pantry.id}/join-requests`)).body.requests.length, 0);
  assert.equal((await memberClient.get('/api/pantries/discover')).body.pantries[0].status, 'member');
});

test('inventory authorization follows actual pantry relationships and active portal', async () => {
  const ownerClient = request.agent(app);
  const owner = await register(ownerClient, 'Owner Example', 'owner@example.test', 'owner');
  const pantry = await Pantry.findOne({ ownerId: owner.id });
  const member = await register(request.agent(app), 'Member Example', 'member@example.test', 'member');
  await ownerClient.post(`/api/pantries/${pantry.id}/members`).send({ email: member.email }).expect(201);
  const item = await PantryItem.create({
    pantryId: pantry._id,
    name: 'Rice',
    quantity: 5,
    unit: 'kg',
    lowStockThreshold: 1,
    createdBy: owner.id
  });

  await ownerClient.get(`/api/pantries/${pantry.id}/items`).expect(200);
  const memberClient = request.agent(app);
  await memberClient.post('/api/auth/login').send({ email: member.email, password: 'secure-password', portal: 'member' }).expect(200);
  await memberClient.get(`/api/pantries/${pantry.id}/items`).expect(200);
  await memberClient.patch(`/api/items/${item.id}`).send({ changeAmount: 2 }).expect(200);
  await memberClient.patch(`/api/items/${item.id}`).send({ changeAmount: -1 }).expect(200);
  await memberClient.patch(`/api/items/${item.id}`).send({ changeAmount: -7 }).expect(409);
  await memberClient.patch(`/api/items/${item.id}`).send({ changeAmount: 0 }).expect(403);
  await memberClient.patch(`/api/items/${item.id}`).send({ name: 'Changed by member' }).expect(403);
  await memberClient.patch(`/api/items/${item.id}`).send({ changeAmount: 1, name: 'Changed by member' }).expect(403);
  await memberClient.delete(`/api/items/${item.id}`).expect(403);
  await memberClient.post(`/api/pantries/${pantry.id}/items`).send({
    name: 'Unauthorized item',
    quantity: 1,
    unit: 'pcs'
  }).expect(403);
  const updatedItem = await PantryItem.findById(item.id);
  assert.equal(updatedItem.quantity, 6);
  assert.equal(updatedItem.name, 'Rice');
  await ownerClient.patch(`/api/items/${item.id}`).send({ name: 'Brown rice' }).expect(200);

  const ownerAsMember = request.agent(app);
  await ownerAsMember.post('/api/auth/login').send({ email: owner.email, password: 'secure-password', portal: 'member' }).expect(200);
  await ownerAsMember.get(`/api/pantries/${pantry.id}/items`).expect(403);
});

test('ownership transfer keeps pantry data and changes portal relationships atomically', async () => {
  const formerOwnerClient = request.agent(app);
  const formerOwner = await register(formerOwnerClient, 'Former Owner', 'owner@example.test', 'owner');
  const pantry = await Pantry.findOne({ ownerId: formerOwner.id });
  const newOwner = await register(request.agent(app), 'New Owner', 'member@example.test', 'member');
  const otherMember = await register(request.agent(app), 'Other Member', 'other@example.test', 'member');
  const unrelated = await register(request.agent(app), 'Unrelated User', 'unrelated@example.test', 'member');
  await formerOwnerClient.post(`/api/pantries/${pantry.id}/members`).send({ email: newOwner.email }).expect(201);
  await formerOwnerClient.post(`/api/pantries/${pantry.id}/members`).send({ email: otherMember.email }).expect(201);

  const item = await PantryItem.create({
    pantryId: pantry._id,
    name: 'Rice',
    quantity: 5,
    unit: 'kg',
    lowStockThreshold: 1,
    createdBy: formerOwner.id
  });
  const activity = await InventoryActivity.create({
    pantryId: pantry._id,
    itemId: item._id,
    userId: formerOwner.id,
    changeAmount: 2
  });
  await formerOwnerClient.delete(`/api/pantries/${pantry.id}`).expect(409);
  await formerOwnerClient.patch(`/api/pantries/${pantry.id}/transfer-ownership`)
    .send({ newOwnerId: formerOwner.id }).expect(400);
  await formerOwnerClient.patch(`/api/pantries/${pantry.id}/transfer-ownership`)
    .send({ newOwnerId: unrelated.id }).expect(409);
  await formerOwnerClient.patch(`/api/pantries/${pantry.id}/transfer-ownership`)
    .send({ newOwnerId: newOwner.id }).expect(200);

  const transferred = await Pantry.findById(pantry.id);
  assert.equal(transferred.ownerId.toString(), newOwner.id);
  assert.deepEqual(new Set(transferred.memberIds.map(id => id.toString())), new Set([formerOwner.id, otherMember.id]));
  assert.equal(await PantryItem.countDocuments({ pantryId: pantry.id }), 1);
  assert.equal(await InventoryActivity.countDocuments({ _id: activity._id }), 1);

  await formerOwnerClient.get('/api/pantries/owned').expect(200).then(response => {
    assert.equal(response.body.pantries.length, 0);
  });
  await formerOwnerClient.get(`/api/pantries/${pantry.id}/items`).expect(403);
  await formerOwnerClient.delete(`/api/pantries/${pantry.id}`).expect(403);
  const newOwnerClient = request.agent(app);
  await newOwnerClient.post('/api/auth/login').send({
    email: newOwner.email,
    password: 'secure-password',
    portal: 'owner'
  }).expect(200);
  const newOwnerInventory = await newOwnerClient.get(`/api/pantries/${pantry.id}/items`).expect(200);
  assert.equal(newOwnerInventory.body.items[0].id, item.id);
  assert.equal((await newOwnerClient.get('/api/pantries/owned')).body.pantries[0].id, pantry.id);
  await newOwnerClient.delete(`/api/pantries/${pantry.id}`).expect(409);
  await newOwnerClient.post(`/api/pantries/${pantry.id}/members`)
    .send({ email: unrelated.email }).expect(201);

  const formerOwnerMemberSession = request.agent(app);
  await formerOwnerMemberSession.post('/api/auth/login').send({
    email: formerOwner.email,
    password: 'secure-password',
    portal: 'member'
  }).expect(200);
  assert.equal((await formerOwnerMemberSession.get('/api/pantries/member')).body.pantries[0].id, pantry.id);
  assert.equal((await formerOwnerMemberSession.get(`/api/pantries/${pantry.id}/items`).expect(200)).body.items[0].id, item.id);
});

test('pantry deletion cleans only that pantry data and does not permit deleting shared pantries', async () => {
  const ownerClient = request.agent(app);
  const owner = await register(ownerClient, 'Owner Example', 'owner@example.test', 'owner');
  const pantry = await Pantry.findOne({ ownerId: owner.id });
  const second = await ownerClient.post('/api/pantries').send({ name: 'Keep Me' }).expect(201);
  const member = await register(request.agent(app), 'Member Example', 'member@example.test', 'member');
  await ownerClient.post(`/api/pantries/${pantry.id}/members`).send({ email: member.email }).expect(201);
  const secondItem = await PantryItem.create({
    pantryId: second.body.pantry.id,
    name: 'Flour',
    quantity: 2,
    unit: 'kg',
    lowStockThreshold: 1,
    createdBy: owner.id
  });
  const secondActivity = await InventoryActivity.create({
    pantryId: second.body.pantry.id,
    itemId: secondItem._id,
    userId: owner.id,
    changeAmount: 2
  });

  await ownerClient.delete(`/api/pantries/${pantry.id}`).expect(409);
  await ownerClient.delete(`/api/pantries/${second.body.pantry.id}`).expect(200);
  assert.ok(await Pantry.exists({ _id: pantry.id }));
  assert.equal(Boolean(await Pantry.exists({ _id: second.body.pantry.id })), false);
  assert.equal(await PantryItem.countDocuments({ pantryId: second.body.pantry.id }), 0);
  assert.equal(await InventoryActivity.countDocuments({ _id: secondActivity._id }), 0);
});

test('registration rejects duplicate identities and validates selected portal', async () => {
  const first = request.agent(app);
  await register(first, 'Account Example', 'person@example.test', 'member');
  await request(app).post('/api/auth/register').send({
    name: 'Duplicate Account',
    email: 'person@example.test',
    password: 'secure-password',
    portal: 'owner'
  }).expect(409);
  await request(app).post('/api/auth/login').send({
    email: 'person@example.test',
    password: 'secure-password',
    portal: 'admin'
  }).expect(400);
  assert.equal(await User.countDocuments({ email: 'person@example.test' }), 1);
});
