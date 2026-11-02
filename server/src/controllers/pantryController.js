import mongoose from 'mongoose';
import Pantry from '../models/Pantry.js';
import PantryItem from '../models/PantryItem.js';
import User from '../models/User.js';
import InventoryActivity from '../models/InventoryActivity.js';
import { HttpError } from '../middleware/errors.js';

const userId = req => req.user._id;
const pantryId = req => req.params.pantryId || req.params.id;
const idString = value => value.toString();
const actualMemberIds = pantry => pantry.memberIds.filter(id => idString(id) !== idString(pantry.ownerId));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function listPantries(req, res) {
  if (!['owner', 'member'].includes(req.activePortal)) throw new HttpError(403, 'A valid portal context is required', 'PORTAL_REQUIRED');
  const query = req.activePortal === 'owner'
    ? { ownerId: userId(req) }
    : { memberIds: userId(req), ownerId: { $ne: userId(req) } };
  const pantries = await Pantry.find(query).sort({ name: 1 });
  res.json({ pantries: pantries.map(pantry => pantry.toJSON()) });
}

export async function listOwnedPantries(req, res) {
  const pantries = await Pantry.find({ ownerId: userId(req) }).sort({ name: 1 });
  res.json({ pantries: pantries.map(pantry => pantry.toJSON()) });
}

export async function listOwnedJoinRequests(req, res) {
  const pantries = await Pantry.find({ ownerId: userId(req) })
    .populate('joinRequests.userId', 'name email profileImage')
    .sort({ name: 1 });
  const requests = pantries.flatMap(pantry => pantry.joinRequests
    .filter(request => request.userId)
    .map(request => ({
      ...request.userId.toJSON(),
      pantryId: idString(pantry._id),
      pantryName: pantry.name,
      requestedAt: request.requestedAt
    })));
  res.json({ requests });
}

export async function listMemberPantries(req, res) {
  const pantries = await Pantry.find({ memberIds: userId(req), ownerId: { $ne: userId(req) } }).sort({ name: 1 });
  res.json({ pantries: pantries.map(pantry => pantry.toJSON()) });
}

export async function listDiscoverablePantries(req, res) {
  const pantries = await Pantry.find({ ownerId: { $ne: userId(req) } })
    .populate('ownerId', 'name')
    .sort({ name: 1 });
  const currentUserId = idString(userId(req));
  res.json({
    pantries: pantries.map(pantry => {
      const isMember = pantry.memberIds.some(id => idString(id) === currentUserId);
      const hasRequest = pantry.joinRequests.some(request => idString(request.userId) === currentUserId);
      return {
        id: idString(pantry._id),
        name: pantry.name,
        description: pantry.description,
        ownerName: pantry.ownerId?.name || 'Pantry owner',
        memberCount: actualMemberIds(pantry).length,
        status: isMember ? 'member' : hasRequest ? 'pending' : 'available'
      };
    })
  });
}

export async function requestPantryMembership(req, res) {
  const pantry = await Pantry.findOneAndUpdate(
    {
      _id: pantryId(req),
      ownerId: { $ne: userId(req) },
      memberIds: { $ne: userId(req) },
      'joinRequests.userId': { $ne: userId(req) }
    },
    { $push: { joinRequests: { userId: userId(req), requestedAt: new Date() } } },
    { new: true }
  );
  if (!pantry) {
    const existing = await Pantry.findById(pantryId(req));
    if (!existing) throw new HttpError(404, 'Pantry not found', 'PANTRY_NOT_FOUND');
    if (idString(existing.ownerId) === idString(userId(req))) {
      throw new HttpError(409, 'You already own this pantry', 'PANTRY_ALREADY_OWNED');
    }
    if (existing.memberIds.some(id => idString(id) === idString(userId(req)))) {
      throw new HttpError(409, 'You are already a member of this pantry', 'MEMBER_EXISTS');
    }
    throw new HttpError(409, 'A request to join this pantry is already pending', 'JOIN_REQUEST_PENDING');
  }
  res.status(201).json({ message: 'Join request sent to the pantry owner' });
}

export async function createPantry(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) throw new HttpError(400, 'Pantry name is required', 'INVALID_FIELD');
  if (Object.hasOwn(req.body, 'description') && typeof req.body.description !== 'string') {
    throw new HttpError(400, 'Pantry description must be a string', 'INVALID_FIELD');
  }
  const description = req.body.description?.trim() || '';
  const pantry = await Pantry.create({ name, description, ownerId: userId(req), memberIds: [] });
  res.status(201).json({ pantry: pantry.toJSON() });
}

export async function getPantry(req, res) {
  res.json({ pantry: req.pantry.toJSON() });
}

export async function updatePantry(req, res) {
  const updates = {};
  if (Object.hasOwn(req.body || {}, 'name')) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim()) throw new HttpError(400, 'Pantry name is required', 'INVALID_FIELD');
    updates.name = req.body.name.trim();
  }
  if (Object.hasOwn(req.body || {}, 'description')) {
    if (typeof req.body.description !== 'string') throw new HttpError(400, 'Pantry description must be a string', 'INVALID_FIELD');
    updates.description = req.body.description.trim();
  }
  if (!Object.keys(updates).length) throw new HttpError(400, 'Provide pantry details to update', 'EMPTY_UPDATE');
  const pantry = await Pantry.findByIdAndUpdate(pantryId(req), { $set: updates }, { new: true, runValidators: true });
  if (!pantry) throw new HttpError(404, 'Pantry not found', 'PANTRY_NOT_FOUND');
  res.json({ pantry: pantry.toJSON() });
}

export async function addMember(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!emailPattern.test(email)) throw new HttpError(400, 'A valid member email is required', 'INVALID_FIELD');
  const user = await User.findOne({ email, active: true });
  if (!user) throw new HttpError(404, 'User account not found', 'USER_NOT_FOUND');
  const pantry = req.pantry;
  if (idString(pantry.ownerId) === idString(user._id)) {
    throw new HttpError(409, 'This user already has access to the pantry', 'MEMBER_EXISTS');
  }
  const updatedPantry = await Pantry.findOneAndUpdate(
    { _id: pantry._id, ownerId: userId(req), memberIds: { $ne: user._id } },
    { $addToSet: { memberIds: user._id } },
    { new: true }
  );
  if (!updatedPantry) throw new HttpError(409, 'This user already has access to the pantry', 'MEMBER_EXISTS');
  res.status(201).json({ pantry: updatedPantry.toJSON(), member: user.toJSON() });
}

export async function listMembers(req, res) {
  const pantry = await Pantry.findById(pantryId(req)).populate('memberIds', 'name email profileImage role');
  if (!pantry) throw new HttpError(404, 'Pantry not found', 'PANTRY_NOT_FOUND');
  const members = pantry.memberIds
    .filter(member => member && idString(member._id) !== idString(pantry.ownerId))
    .map(member => ({ ...member.toJSON(), role: 'member' }));
  res.json({ members, ownerId: idString(pantry.ownerId) });
}

export async function listJoinRequests(req, res) {
  const pantry = await Pantry.findById(pantryId(req))
    .populate('joinRequests.userId', 'name email profileImage');
  if (!pantry) throw new HttpError(404, 'Pantry not found', 'PANTRY_NOT_FOUND');
  const requests = pantry.joinRequests
    .filter(request => request.userId)
    .map(request => ({
      ...request.userId.toJSON(),
      requestedAt: request.requestedAt
    }));
  res.json({ requests });
}

export async function resolveJoinRequest(req, res) {
  const rawUserId = req.params.userId;
  if (!mongoose.isValidObjectId(rawUserId)) throw new HttpError(400, 'Invalid member id', 'INVALID_ID');
  if (!['approve', 'reject'].includes(req.body?.action)) {
    throw new HttpError(400, 'Action must be approve or reject', 'INVALID_ACTION');
  }
  const targetId = new mongoose.Types.ObjectId(rawUserId);
  const pantry = req.pantry;
  const hasRequest = pantry.joinRequests.some(request => idString(request.userId) === idString(targetId));
  if (!hasRequest) throw new HttpError(404, 'Join request not found', 'JOIN_REQUEST_NOT_FOUND');

  if (req.body.action === 'reject') {
    await Pantry.updateOne(
      { _id: pantry._id, ownerId: userId(req) },
      { $pull: { joinRequests: { userId: targetId } } }
    );
    return res.json({ message: 'Join request rejected', userId: rawUserId });
  }

  if (!await User.exists({ _id: targetId, active: true })) {
    await Pantry.updateOne(
      { _id: pantry._id, ownerId: userId(req) },
      { $pull: { joinRequests: { userId: targetId } } }
    );
    throw new HttpError(404, 'The requesting user account is unavailable', 'USER_NOT_FOUND');
  }

  const updatedPantry = await Pantry.findOneAndUpdate(
    {
      _id: pantry._id,
      ownerId: userId(req),
      'joinRequests.userId': targetId,
      memberIds: { $ne: targetId }
    },
    [{
      $set: {
        memberIds: { $setUnion: [{ $ifNull: ['$memberIds', []] }, [{ $literal: targetId }]] },
        joinRequests: {
          $filter: {
            input: { $ifNull: ['$joinRequests', []] },
            as: 'request',
            cond: { $ne: ['$$request.userId', { $literal: targetId }] }
          }
        }
      }
    }],
    { new: true }
  );
  if (!updatedPantry) {
    const currentPantry = await Pantry.findById(pantry._id);
    if (currentPantry?.memberIds.some(id => idString(id) === idString(targetId))) {
      await Pantry.updateOne(
        { _id: pantry._id, ownerId: userId(req) },
        { $pull: { joinRequests: { userId: targetId } } }
      );
      return res.json({ message: 'User is already a member of this pantry', userId: rawUserId });
    }
    throw new HttpError(409, 'The join request is no longer pending', 'JOIN_REQUEST_CHANGED');
  }
  res.json({ message: 'Join request approved', userId: rawUserId });
}

export async function removeMember(req, res) {
  if (!mongoose.isValidObjectId(req.params.userId)) throw new HttpError(400, 'Invalid member id', 'INVALID_ID');
  const targetId = new mongoose.Types.ObjectId(req.params.userId);
  if (idString(targetId) === idString(req.pantry.ownerId)) {
    throw new HttpError(409, 'The pantry owner cannot be removed as a member', 'OWNER_CANNOT_BE_REMOVED');
  }
  const pantry = await Pantry.findOneAndUpdate(
    { _id: req.pantry._id, ownerId: userId(req), memberIds: targetId },
    { $pull: { memberIds: targetId } },
    { new: true }
  );
  if (!pantry) throw new HttpError(404, 'Pantry member not found', 'MEMBER_NOT_FOUND');
  res.json({ pantry: pantry.toJSON(), removedUserId: req.params.userId });
}

export async function transferOwnership(req, res) {
  const rawNewOwnerId = req.body?.newOwnerId;
  if (typeof rawNewOwnerId !== 'string' || !mongoose.isValidObjectId(rawNewOwnerId)) {
    throw new HttpError(400, 'A valid newOwnerId is required', 'INVALID_ID');
  }
  const newOwnerId = new mongoose.Types.ObjectId(rawNewOwnerId);
  if (idString(newOwnerId) === idString(req.user._id)) {
    throw new HttpError(400, 'The new owner must be an existing pantry member', 'INVALID_NEW_OWNER');
  }
  if (!await User.exists({ _id: newOwnerId, active: true })) {
    throw new HttpError(404, 'The selected user account was not found', 'USER_NOT_FOUND');
  }

  const currentOwnerId = req.user._id;
  const filter = { _id: req.pantry._id, ownerId: currentOwnerId, memberIds: newOwnerId };
  const update = [{
    $set: {
      ownerId: newOwnerId,
      memberIds: {
        $setUnion: [
          [{
            $literal: currentOwnerId
          }],
          {
            $filter: {
              input: { $ifNull: ['$memberIds', []] },
              as: 'memberId',
              cond: {
                $and: [
                  { $ne: ['$$memberId', { $literal: newOwnerId }] },
                  { $ne: ['$$memberId', { $literal: currentOwnerId }] }
                ]
              }
            }
          }
        ]
      }
    }
  }];
  const pantry = await Pantry.findOneAndUpdate(filter, update, { new: true });
  if (!pantry) throw new HttpError(409, 'The selected user must be a current member of this pantry', 'NEW_OWNER_NOT_MEMBER');
  res.json({ pantry: pantry.toJSON(), newOwnerId: idString(newOwnerId), previousOwnerId: idString(currentOwnerId) });
}

export async function deletePantry(req, res) {
  const current = req.pantry;
  if (actualMemberIds(current).length) {
    throw new HttpError(409, 'Transfer ownership to an existing member before deleting this pantry', 'OWNERSHIP_TRANSFER_REQUIRED');
  }

  const items = await PantryItem.find({ pantryId: current._id }).lean();
  const activities = await InventoryActivity.find({ pantryId: current._id }).lean();
  const deletedPantry = await Pantry.findOneAndDelete({
    _id: current._id,
    ownerId: userId(req),
    memberIds: { $eq: current.memberIds }
  });
  if (!deletedPantry) throw new HttpError(409, 'Pantry membership changed; refresh and try again', 'PANTRY_CHANGED');

  try {
    await PantryItem.deleteMany({ pantryId: current._id });
    await InventoryActivity.deleteMany({ pantryId: current._id });
  } catch (error) {
    try {
      await Pantry.collection.insertOne(deletedPantry.toObject());
      await PantryItem.deleteMany({ pantryId: current._id });
      await InventoryActivity.deleteMany({ pantryId: current._id });
      if (items.length) await PantryItem.insertMany(items);
      if (activities.length) await InventoryActivity.insertMany(activities);
    } catch (rollbackError) {
      console.error('Pantry deletion rollback failed', rollbackError);
      throw new HttpError(500, 'Pantry cleanup failed and rollback was incomplete; contact support', 'PANTRY_DELETE_ROLLBACK_FAILED');
    }
    throw error;
  }
  res.json({ message: 'Pantry deleted', id: idString(current._id) });
}

export async function listActivity(req, res) {
  const activities = await InventoryActivity.find({ pantryId: pantryId(req) }).sort({ createdAt: -1 }).limit(200);
  res.json({ activities });
}
