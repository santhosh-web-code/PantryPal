import { Router } from 'express';
import { currentUser, login, logout, register } from '../controllers/authController.js';
import { createGoogleAuthHandlers } from '../controllers/googleAuthController.js';
import { authenticate } from '../middleware/auth.js';
import { createGoogleOAuthService } from '../services/googleOAuth.js';

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export function createAuthRouter({ googleOAuth = createGoogleOAuthService() } = {}) {
  const router = Router();
  const googleHandlers = createGoogleAuthHandlers(googleOAuth);
  router.post('/register', wrap(register));
  router.post('/login', wrap(login));
  router.get('/me', authenticate, wrap(currentUser));
  router.post('/logout', logout);
  router.get('/google', wrap(googleHandlers.portal));
  router.get('/google/callback', wrap(googleHandlers.callback));
  router.get('/google/owner', wrap((req, res) => googleHandlers.initiate('owner', req, res)));
  router.get('/google/buyer', wrap((req, res) => googleHandlers.initiate('buyer', req, res)));
  router.get('/google/member', wrap((req, res) => googleHandlers.initiate('member', req, res)));
  return router;
}
