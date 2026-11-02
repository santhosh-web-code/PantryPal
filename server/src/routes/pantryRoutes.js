import { Router } from 'express';
import {
  addMember,
  createPantry,
  deletePantry,
  getPantry,
  listActivity,
  listDiscoverablePantries,
  listJoinRequests,
  listMemberPantries,
  listMembers,
  listOwnedJoinRequests,
  listOwnedPantries,
  listPantries,
  removeMember,
  requestPantryMembership,
  resolveJoinRequest,
  transferOwnership,
  updatePantry
} from '../controllers/pantryController.js';
import Pantry from '../models/Pantry.js';
import { authenticate, requirePortal } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function pantryAccess(req, _res, next) {
  try {
    const id = req.params.id || req.params.pantryId;
    const relationship = req.activePortal === 'owner'
      ? { ownerId: req.user._id }
      : { memberIds: req.user._id, ownerId: { $ne: req.user._id } };
    const pantry = await Pantry.findOne({ _id: id, ...relationship });
    if (!pantry) throw new HttpError(403, 'You do not have access to this pantry in the active portal', 'FORBIDDEN');
    req.pantry = pantry;
    next();
  } catch (error) {
    next(error);
  }
}

function ownerAccess(req, _res, next) {
  if (req.activePortal !== 'owner' || req.pantry.ownerId.toString() !== req.user._id.toString()) {
    return next(new HttpError(403, 'Only the pantry owner in the Owner portal can perform this action', 'FORBIDDEN'));
  }
  next();
}

export function createPantryRouter() {
  const router = Router();
  router.get('/', authenticate, wrap(listPantries));
  router.get('/owned/join-requests', authenticate, requirePortal('owner'), wrap(listOwnedJoinRequests));
  router.get('/owned', authenticate, requirePortal('owner'), wrap(listOwnedPantries));
  router.get('/member', authenticate, requirePortal('member'), wrap(listMemberPantries));
  router.get('/discover', authenticate, requirePortal('member'), wrap(listDiscoverablePantries));
  router.post('/:id/join-requests', authenticate, requirePortal('member'), wrap(requestPantryMembership));
  router.post('/', authenticate, requirePortal('owner'), wrap(createPantry));
  router.get('/:id', authenticate, wrap(pantryAccess), wrap(getPantry));
  router.put('/:id', authenticate, wrap(pantryAccess), ownerAccess, wrap(updatePantry));
  router.delete('/:id', authenticate, wrap(pantryAccess), ownerAccess, wrap(deletePantry));
  router.patch('/:id/transfer-ownership', authenticate, wrap(pantryAccess), ownerAccess, wrap(transferOwnership));
  router.post('/:id/members', authenticate, wrap(pantryAccess), ownerAccess, wrap(addMember));
  router.get('/:id/members', authenticate, wrap(pantryAccess), wrap(listMembers));
  router.get('/:id/join-requests', authenticate, wrap(pantryAccess), ownerAccess, wrap(listJoinRequests));
  router.patch('/:id/join-requests/:userId', authenticate, wrap(pantryAccess), ownerAccess, wrap(resolveJoinRequest));
  router.delete('/:id/members/:userId', authenticate, wrap(pantryAccess), ownerAccess, wrap(removeMember));
  router.get('/:id/activity', authenticate, wrap(pantryAccess), wrap(listActivity));
  return router;
}

export { pantryAccess };
