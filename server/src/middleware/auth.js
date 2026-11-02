import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { HttpError } from './errors.js';
import { readAuthCookie } from '../utils/authCookie.js';

const secret = () => process.env.JWT_SECRET || 'development-only-change-me';

export function normalizePortal(portal) {
  if (portal === 'owner') return 'owner';
  if (portal === 'member' || portal === 'buyer') return 'member';
  return null;
}

export function signUser(user, portal = normalizePortal(user.role) || 'owner') {
  return jwt.sign({ sub: user._id.toString(), portal }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

export function requirePortal(portal) {
  return function portalGuard(req, _res, next) {
    if (req.activePortal !== portal) return next(new HttpError(403, `This action requires the ${portal} portal`, 'PORTAL_REQUIRED'));
    next();
  };
}

export async function authenticate(req, _res, next) {
  try {
    const cookieToken = readAuthCookie(req);
    const header = req.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
    if (!token) throw new HttpError(401, 'Authentication is required', 'UNAUTHENTICATED');
    const payload = jwt.verify(token, secret());
    const user = await User.findOne({ _id: payload.sub, active: true });
    if (!user) throw new HttpError(401, 'User account is unavailable', 'UNAUTHENTICATED');
    req.user = user;
    req.activePortal = normalizePortal(payload.portal) || normalizePortal(payload.role) || normalizePortal(user.role);
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token', 'UNAUTHENTICATED'));
  }
}
