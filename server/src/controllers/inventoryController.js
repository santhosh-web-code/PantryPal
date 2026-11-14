import mongoose from 'mongoose';
import PantryItem from '../models/PantryItem.js';
import InventoryActivity from '../models/InventoryActivity.js';
import { HttpError } from '../middleware/errors.js';
import { requireObjectId } from '../middleware/inventoryDependencies.js';

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
function rejectUnknownFields(body, allowed) {
  const unknown = Object.keys(body).filter(key => !allowed.includes(key));
  if (unknown.length) throw new HttpError(400, `Unsupported field: ${unknown[0]}`, 'UNSUPPORTED_FIELD');
}
const finiteNonNegative = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new HttpError(400, `${label} must be a finite non-negative number`, 'INVALID_FIELD');
  return value;
};
const finitePositive = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new HttpError(400, `${label} must be a finite positive number`, 'INVALID_FIELD');
  return value;
};
const allowedUnits = new Set([
  'kg', 'g', 'mg', 'L', 'mL', 'pcs', 'packets', 'boxes', 'bottles', 'dozens',
  'litres', 'litre', 'liters', 'liter', 'ml', 'packs', 'pack', 'pieces', 'piece'
]);
function normalizeExpiry(value, timeZone = 'UTC') {
  if (value === '' || value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, 'expiryDate must use YYYY-MM-DD', 'INVALID_FIELD');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new HttpError(400, 'expiryDate is not a valid calendar date', 'INVALID_FIELD');
  let today;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    today = `${values.year}-${values.month}-${values.day}`;
  } catch {
    throw new HttpError(400, 'A valid time zone is required', 'INVALID_TIME_ZONE');
  }
  if (value < today) throw new HttpError(400, 'expiryDate cannot be in the past', 'PAST_DATE');
  return date;
}
function validateDetails(body, { creating = false, timeZone, existingUnit } = {}) {
  const update = {};
  if (creating || own(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw new HttpError(400, 'name is required and cannot be blank', 'INVALID_FIELD');
    update.name = body.name.trim();
  }
  if (creating || own(body, 'category')) {
    if (body.category !== undefined && typeof body.category !== 'string') throw new HttpError(400, 'category must be a string', 'INVALID_FIELD');
    update.category = (body.category || 'Other').trim() || 'Other';
  }
  if (creating || own(body, 'unit')) {
    if (typeof body.unit !== 'string' || !body.unit.trim()) throw new HttpError(400, 'unit is required and cannot be blank', 'INVALID_FIELD');
    update.unit = body.unit.trim();
    if (!allowedUnits.has(update.unit) && update.unit !== existingUnit) throw new HttpError(400, 'unit must be a supported measurement unit', 'INVALID_FIELD');
  }
  if (creating || own(body, 'lowStockThreshold')) update.lowStockThreshold = finiteNonNegative(body.lowStockThreshold, 'lowStockThreshold');
  if (own(body, 'expiryDate')) update.expiryDate = normalizeExpiry(body.expiryDate, timeZone);
  else if (creating) update.expiryDate = null;
  if (own(body, 'image')) {
    if (typeof body.image !== 'string') throw new HttpError(400, 'image must be a string', 'INVALID_FIELD');
    update.image = body.image.trim();
  }
  return update;
}
const serialize = doc => doc.toJSON();
async function saveActivity(req, activity) {
  const record = {
    ...activity,
    pantryId: activity.pantryId || req.inventoryPantryId,
    userId: req.user._id
  };
  await InventoryActivity.create(record);
}

export async function listItems(req, res) {
  const filter = { pantryId: req.params.pantryId };
  if (req.query.category) filter.category = String(req.query.category).trim();
  if (req.query.search) filter.name = { $regex: escapeRegex(String(req.query.search).trim()), $options: 'i' };
  const items = await PantryItem.find(filter).sort({ name: 1 });
  res.json({ items: items.map(serialize) });
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export async function createItem(req, res) {
  if (!req.user?._id || !mongoose.isValidObjectId(req.user._id)) throw new HttpError(401, 'Authenticated user is required', 'UNAUTHENTICATED');
  const body = req.body || {};
  rejectUnknownFields(body, ['name', 'category', 'quantity', 'unit', 'expiryDate', 'lowStockThreshold', 'image']);
  if (!own(body, 'quantity')) throw new HttpError(400, 'quantity is required', 'INVALID_FIELD');
  const fields = validateDetails(body, { creating: true, timeZone: req.get('x-time-zone') || 'UTC' });
  fields.quantity = finitePositive(body.quantity, 'quantity');
  const item = await PantryItem.create({ ...fields, pantryId: req.params.pantryId, createdBy: req.user._id });
  await saveActivity(req, {
    pantryId: item.pantryId,
    itemId: item._id,
    action: 'item_added',
    description: `Added ${item.name} (${item.quantity} ${item.unit})`,
    changeAmount: item.quantity
  });
  res.status(201).json({ item: serialize(item) });
}

export async function getItemForAccess(req, _res, next) {
  try {
    requireObjectId(req.params.id, 'item id');
    const item = await PantryItem.findById(req.params.id);
    if (!item) throw new HttpError(404, 'Inventory item not found', 'ITEM_NOT_FOUND');
    req.inventoryItem = item;
    req.inventoryPantryId = item.pantryId.toString();
    next();
  } catch (error) { next(error); }
}

export async function updateItem(req, res) {
  const body = req.body || {};
  rejectUnknownFields(body, ['name', 'category', 'unit', 'expiryDate', 'lowStockThreshold', 'image', 'changeAmount', 'quantity', 'note']);
  if (own(body, 'note') && typeof body.note !== 'string') throw new HttpError(400, 'note must be a string', 'INVALID_FIELD');
  const hasChange = own(body, 'changeAmount');
  const hasQuantity = own(body, 'quantity');
  if (hasChange && hasQuantity) throw new HttpError(400, 'Use changeAmount for stock adjustments; quantity cannot be combined with it', 'AMBIGUOUS_STOCK_UPDATE');
  const fields = validateDetails(body, {
    timeZone: req.get('x-time-zone') || 'UTC',
    existingUnit: req.inventoryItem.unit
  });
  if (hasQuantity) throw new HttpError(400, 'Absolute quantity updates are not supported; send changeAmount', 'ABSOLUTE_QUANTITY_NOT_SUPPORTED');
  if (!hasChange && Object.keys(fields).length === 0) throw new HttpError(400, 'Provide at least one item detail to update', 'EMPTY_UPDATE');

  let item;
  if (hasChange) {
    const amount = body.changeAmount;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) throw new HttpError(400, 'changeAmount must be a finite non-zero number', 'INVALID_FIELD');
    const filter = { _id: req.params.id, quantity: amount < 0 ? { $gte: -amount } : { $gte: 0 } };
    const update = { $inc: { quantity: amount }, ...(Object.keys(fields).length ? { $set: fields } : {}) };
    item = await PantryItem.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    if (!item) {
      const current = await PantryItem.findById(req.params.id).select('quantity');
      if (!current) throw new HttpError(404, 'Inventory item not found', 'ITEM_NOT_FOUND');
      throw new HttpError(409, 'Stock adjustment would make quantity negative; stock was not changed', 'INSUFFICIENT_STOCK');
    }
    const hook = req.app.locals.recordStockAdjustment;
    if (typeof hook === 'function') {
      await hook({ pantryId: item.pantryId.toString(), itemId: item.id, userId: req.user._id.toString(), changeAmount: amount, note: typeof body.note === 'string' ? body.note : undefined, timestamp: new Date() });
    }
    await saveActivity(req, {
      pantryId: item.pantryId,
      itemId: item._id,
      action: 'quantity_changed',
      description: `${amount > 0 ? 'Added' : 'Used'} ${Math.abs(amount)} ${item.unit} ${amount > 0 ? 'of' : 'from'} ${item.name}`,
      changeAmount: amount,
      note: typeof body.note === 'string' ? body.note.trim() : undefined
    });
    const activityRecorded = true;
    return res.json({ item: serialize(item), activityRecorded });
  }
  item = await PantryItem.findByIdAndUpdate(req.params.id, { $set: fields }, { new: true, runValidators: true });
  if (!item) throw new HttpError(404, 'Inventory item not found', 'ITEM_NOT_FOUND');
  await saveActivity(req, {
    pantryId: item.pantryId,
    itemId: item._id,
    action: 'item_updated',
    description: `Updated ${item.name}`
  });
  res.json({ item: serialize(item) });
}

export async function deleteItem(req, res) {
  const current = req.inventoryItem;
  const deleted = await PantryItem.findByIdAndDelete(req.params.id);
  if (!deleted) throw new HttpError(404, 'Inventory item not found', 'ITEM_NOT_FOUND');
  await saveActivity(req, {
    pantryId: current.pantryId,
    itemId: current._id,
    action: 'item_removed',
    description: `Removed ${current.name}`
  });
  res.json({ message: 'Inventory item deleted', id: deleted.id });
}
