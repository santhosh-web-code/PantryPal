import { Router } from 'express';
import { createItem, deleteItem, getItemForAccess, listItems, updateItem } from '../controllers/inventoryController.js';
import { createPantryAccessGuard, requireObjectId } from '../middleware/inventoryDependencies.js';

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createInventoryRouter({ authenticate, authorizePantryAccess }) {
  if (typeof authenticate !== 'function') throw new TypeError('authenticate dependency is required');
  const guard = createPantryAccessGuard(authorizePantryAccess);
  const router = Router();

  router.route('/pantries/:pantryId/items')
    .get(authenticate, (req, _res, next) => {
      try { requireObjectId(req.params.pantryId, 'pantry id'); req.inventoryPantryId = req.params.pantryId; req.inventoryAction = 'read'; next(); }
      catch (error) { next(error); }
    }, guard, wrap(listItems))
    .post(authenticate, (req, _res, next) => {
      try { requireObjectId(req.params.pantryId, 'pantry id'); req.inventoryPantryId = req.params.pantryId; req.inventoryAction = 'create'; next(); }
      catch (error) { next(error); }
    }, guard, wrap(createItem));

  router.route('/items/:id')
    .patch(authenticate, wrap(getItemForAccess), (req, _res, next) => { req.inventoryAction = 'edit'; next(); }, guard, wrap(updateItem))
    .delete(authenticate, wrap(getItemForAccess), (req, _res, next) => { req.inventoryAction = 'delete'; next(); }, guard, wrap(deleteItem));

  return router;
}
