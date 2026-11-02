import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createInventoryRouter } from './routes/inventoryRoutes.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { unavailableAuthentication, unavailablePantryAuthorization } from './middleware/inventoryDependencies.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createPantryRouter } from './routes/pantryRoutes.js';

function reportHealth(_req, res) {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unhealthy',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
}

export function createApp({ authenticate = unavailableAuthentication, authorizePantryAccess = unavailablePantryAuthorization, recordStockAdjustment, googleOAuth } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  if (recordStockAdjustment) app.locals.recordStockAdjustment = recordStockAdjustment;
  app.get('/', (_req, res) => res.json({ success: true, message: 'PantryPal API is running' }));
  app.get('/health', reportHealth);
  app.get('/api/health', reportHealth);
  app.use('/api/auth', createAuthRouter({ googleOAuth }));
  app.use('/api/pantries', createPantryRouter());
  app.use('/api', createInventoryRouter({ authenticate, authorizePantryAccess }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
