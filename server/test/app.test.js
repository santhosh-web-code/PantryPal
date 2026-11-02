import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

test('root identifies the running API without claiming database health', async () => {
  const response = await request(app)
    .get('/')
    .expect(200)
    .expect('Content-Type', /json/);

  assert.deepEqual(response.body, {
    success: true,
    message: 'PantryPal API is running'
  });
});

test('health endpoints report a disconnected database as unhealthy', async () => {
  assert.notEqual(mongoose.connection.readyState, 1);

  for (const path of ['/health', '/api/health']) {
    const response = await request(app)
      .get(path)
      .expect(503)
      .expect('Content-Type', /json/);

    assert.deepEqual(response.body, {
      status: 'unhealthy',
      database: 'disconnected'
    });
  }
});
