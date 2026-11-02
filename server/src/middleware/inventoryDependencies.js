import mongoose from 'mongoose';
import Pantry from '../models/Pantry.js';

// Member 1 supplies authenticate(req,res,next), setting req.user._id from a verified session.
export function unavailableAuthentication(_req, res) {
  return res.status(503).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Authentication integration is not configured' } });
}

// Member 2 supplies authorizePantryAccess(userId, pantryId, action), throwing/returning
// false for denial. It must resolve membership from trusted database state.
export function unavailablePantryAuthorization() {
  throw Object.assign(new Error('Pantry authorization integration is not configured'), { status: 503, code: 'AUTHORIZATION_NOT_CONFIGURED' });
}

export function requireObjectId(value, fieldName) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throw Object.assign(new Error(`Invalid ${fieldName}`), { status: 400, code: 'INVALID_ID' });
  }
}

export function createPantryAccessGuard(authorizePantryAccess) {
  if (typeof authorizePantryAccess !== 'function') throw new TypeError('authorizePantryAccess dependency is required');
  return async function pantryAccess(req, _res, next) {
    try {
      if (req.activePortal === 'member' && !isMemberInventoryActionAllowed(req)) {
        return next(Object.assign(new Error('Members can only adjust inventory quantities'), { status: 403, code: 'FORBIDDEN' }));
      }
      const allowed = await authorizePantryAccess(req.user._id, req.inventoryPantryId, req.inventoryAction, req.activePortal);
      if (!allowed) return next(Object.assign(new Error('You do not have access to this pantry'), { status: 403, code: 'FORBIDDEN' }));
      next();
    } catch (error) { next(error); }
  };
}

function isMemberInventoryActionAllowed(req) {
  if (req.inventoryAction === 'read') return true;
  if (req.inventoryAction !== 'edit' || !req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return false;
  const keys = Object.keys(req.body);
  return keys.length > 0
    && keys.every(key => key === 'changeAmount' || key === 'note')
    && typeof req.body.changeAmount === 'number'
    && Number.isFinite(req.body.changeAmount)
    && req.body.changeAmount !== 0;
}

export async function authorizePantryAccess(userId, pantryId, action, portal) {
  if (!['read', 'create', 'edit', 'delete'].includes(action)) return false;
  const relationship = portal === 'owner'
    ? { ownerId: userId }
    : portal === 'member'
      ? { memberIds: userId, ownerId: { $ne: userId } }
      : null;
  if (!relationship) return false;
  return Boolean(await Pantry.exists({ _id: pantryId, ...relationship }));
}
