import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Pantry from '../models/Pantry.js';
import { HttpError } from '../middleware/errors.js';
import { normalizePortal, signUser } from '../middleware/auth.js';
import { AUTH_COOKIE_NAME, authCookieOptions } from '../utils/authCookie.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateCredentials(body, { registering = false } = {}) {
  if (registering && (typeof body?.name !== 'string' || body.name.trim().length < 2)) {
    throw new HttpError(400, 'name must contain at least 2 characters', 'INVALID_FIELD');
  }
  if (typeof body?.email !== 'string' || !emailPattern.test(body.email)) {
    throw new HttpError(400, 'A valid email is required', 'INVALID_FIELD');
  }
  if (typeof body.password !== 'string' || body.password.length < 6) {
    throw new HttpError(400, 'password must contain at least 6 characters', 'INVALID_FIELD');
  }
}

function requestedPortal(body) {
  const rawPortal = body.portal ?? body.role;
  const portal = normalizePortal(rawPortal);
  if (rawPortal !== undefined && !portal) throw new HttpError(400, 'portal must be owner or member', 'INVALID_FIELD');
  return portal;
}

function legacyRole(portal) {
  return portal === 'member' ? 'buyer' : 'owner';
}

function existingEmailError() {
  return new HttpError(409, 'An account with that email already exists. Use your existing credentials to sign in through either portal.', 'EMAIL_IN_USE');
}

export async function register(req, res) {
  validateCredentials(req.body, { registering: true });
  const portal = requestedPortal(req.body) || 'owner';
  const email = req.body.email.trim().toLowerCase();
  if (await User.exists({ email })) throw existingEmailError();

  let user;
  try {
    user = await User.create({
      name: req.body.name.trim(),
      email,
      passwordHash: await bcrypt.hash(req.body.password, 12),
      role: legacyRole(portal)
    });
  } catch (error) {
    if (error?.code === 11000) throw existingEmailError();
    throw error;
  }
  if (portal === 'owner') await Pantry.create({ name: `${user.name}'s Pantry`, ownerId: user._id, memberIds: [] });
  res.cookie(AUTH_COOKIE_NAME, signUser(user, portal), authCookieOptions());
  res.status(201).json({ user: user.toJSON(), portal });
}

export async function login(req, res) {
  if (!req.body || typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
    throw new HttpError(400, 'Email and password are required', 'INVALID_FIELD');
  }
  const portal = requestedPortal(req.body);
  const user = await User.findOne({ email: req.body.email.trim().toLowerCase(), active: true }).select('+passwordHash');
  if (!user?.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }
  const activePortal = portal || normalizePortal(user.role) || 'owner';
  res.cookie(AUTH_COOKIE_NAME, signUser(user, activePortal), authCookieOptions());
  res.json({ user: user.toJSON(), portal: activePortal });
}

export function currentUser(req, res) {
  res.json({ user: req.user.toJSON(), portal: req.activePortal });
}

export function logout(_req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions(false));
  res.status(204).end();
}
