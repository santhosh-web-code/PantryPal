import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import PantryItem from '../src/models/PantryItem.js';

let mongo;
let app;
const pantry1 = new mongoose.Types.ObjectId().toString();
const pantry2 = new mongoose.Types.ObjectId().toString();
const userId = new mongoose.Types.ObjectId().toString();
const deniedPantry = new Set();
const activities = [];
const auth = (req, _res, next) => { req.user = { _id: userId }; next(); };
const authorize = async (_userId, pantryId) => !deniedPantry.has(pantryId);

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp({ authenticate: auth, authorizePantryAccess: authorize, recordStockAdjustment: async record => activities.push(record) });
});
beforeEach(async () => { await PantryItem.deleteMany({}); deniedPantry.clear(); activities.length = 0; });
after(async () => { await mongoose.disconnect(); await mongo.stop(); });

const newItem = (overrides = {}) => ({ name: 'Basmati Rice', category: 'Grains', quantity: 5, unit: 'kg', expiryDate: '2027-05-01', lowStockThreshold: 2, ...overrides });
async function create(pantryId = pantry1, body = newItem()) {
  return request(app).post(`/api/pantries/${pantryId}/items`).send(body);
}

test('create and list only pantry items, including search and category filters', async () => {
  const created = await create();
  assert.equal(created.status, 201);
  assert.equal(created.body.item.isLowStock, false);
  assert.equal(created.body.item.expiryDate, '2027-05-01');
  await create(pantry2, newItem({ name: 'Basmati Rice Cakes', category: 'Snacks' }));
  await create(pantry1, newItem({ name: 'Milk', category: 'Dairy' }));
  const all = await request(app).get(`/api/pantries/${pantry1}/items`);
  assert.equal(all.status, 200);
  assert.equal(all.body.items.length, 2);
  assert.ok(all.body.items.every(item => item.pantryId === pantry1));
  const filtered = await request(app).get(`/api/pantries/${pantry1}/items?search=basmati&category=Grains`);
  assert.equal(filtered.body.items.length, 1);
});

test('validates required fields, numbers, dates, and pantry IDs', async () => {
  assert.equal((await create(pantry1, newItem({ name: '  ' }))).status, 400);
  assert.equal((await create(pantry1, newItem({ quantity: -1 }))).status, 400);
  assert.equal((await create(pantry1, newItem({ quantity: '5' }))).status, 400);
  assert.equal((await create(pantry1, newItem({ lowStockThreshold: -1 }))).status, 400);
  assert.equal((await create(pantry1, newItem({ unit: ' ' }))).status, 400);
  assert.equal((await create(pantry1, newItem({ expiryDate: '2027-02-30' }))).status, 400);
  assert.equal((await create('bad-id')).status, 400);
});

test('updates item details and applies stock changes atomically down to zero', async () => {
  const { body } = await create(pantry1, newItem({ quantity: 5 }));
  let response = await request(app).patch(`/api/items/${body.item.id}`).send({ name: 'Rice', category: 'Grains' });
  assert.equal(response.status, 200);
  assert.equal(response.body.item.name, 'Rice');
  response = await request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: 4, note: 'Restock' });
  assert.equal(response.body.item.quantity, 9);
  response = await request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: -9 });
  assert.equal(response.body.item.quantity, 0);
  assert.equal(response.body.item.isLowStock, true);
  assert.equal(activities.length, 2);
  assert.equal(activities[1].changeAmount, -9);
  assert.equal(activities[1].pantryId, pantry1);
});

test('rejects invalid stock changes and absolute quantities without changing stock or activity', async () => {
  const { body } = await create(pantry1, newItem({ quantity: 2 }));
  let response = await request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: -3 });
  assert.equal(response.status, 409);
  assert.equal((await PantryItem.findById(body.item.id)).quantity, 2);
  assert.equal(activities.length, 0);
  response = await request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: -1.5 });
  assert.equal(response.status, 200);
  response = await request(app).patch(`/api/items/${body.item.id}`).send({ quantity: -2 });
  assert.equal(response.status, 400);
  response = await request(app).patch(`/api/items/${body.item.id}`).send({ quantity: 3 });
  assert.equal(response.status, 400);
  assert.equal(activities.length, 1);
});

test('calculates low stock inclusively and does not remove zero quantity items', async () => {
  const { body } = await create(pantry1, newItem({ quantity: 2, lowStockThreshold: 2 }));
  assert.equal(body.item.isLowStock, true);
  const result = await request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: -2 });
  assert.equal(result.body.item.quantity, 0);
  assert.equal(await PantryItem.countDocuments({ _id: body.item.id }), 1);
});

test('competing decrements cannot overspend stock', async () => {
  const { body } = await create(pantry1, newItem({ quantity: 3 }));
  const outcomes = await Promise.all([
    request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: -2 }),
    request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: -2 })
  ]);
  assert.deepEqual(outcomes.map(result => result.status).sort(), [200, 409]);
  assert.equal((await PantryItem.findById(body.item.id)).quantity, 1);
  assert.equal(activities.length, 1);
});

test('deletes existing items and reports invalid or missing IDs', async () => {
  const { body } = await create();
  assert.equal((await request(app).delete(`/api/items/${body.item.id}`)).status, 200);
  assert.equal((await request(app).delete(`/api/items/${body.item.id}`)).status, 404);
  assert.equal((await request(app).delete('/api/items/not-an-id')).status, 400);
});

test('authorization denial blocks pantry reads and item mutation', async () => {
  deniedPantry.add(pantry1);
  const list = await request(app).get(`/api/pantries/${pantry1}/items`);
  assert.equal(list.status, 403);
  deniedPantry.clear();
  const { body } = await create();
  deniedPantry.add(pantry1);
  assert.equal((await request(app).patch(`/api/items/${body.item.id}`).send({ changeAmount: 1 })).status, 403);
  assert.equal(activities.length, 0);
});

test('missing item and unconfigured auth fail closed', async () => {
  assert.equal((await request(app).patch(`/api/items/${new mongoose.Types.ObjectId()}`).send({ changeAmount: 1 })).status, 404);
  const closed = createApp();
  assert.equal((await request(closed).get(`/api/pantries/${pantry1}/items`)).status, 503);
});
