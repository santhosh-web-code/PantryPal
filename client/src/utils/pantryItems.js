import { apiRequest } from './api.js';

const mongoIdPattern = /^[a-f\d]{24}$/i;

export async function deletePantryItem(item) {
  if (!item || typeof item.id !== 'string') throw new Error('A valid pantry item is required.');
  if (mongoIdPattern.test(item.id)) {
    await apiRequest(`/api/items/${item.id}`, { method: 'DELETE' });
  }
}
