import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api.js';

export function useOwnedPantryItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { pantries } = await apiRequest('/api/pantries/owned');
    const results = await Promise.all(
      pantries.map(pantry => apiRequest(`/api/pantries/${pantry.id}/items`))
    );
    return results.flatMap(result => result.items);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ownedItems = await load();
      setItems(ownedItems);
      setError('');
      return ownedItems;
    } catch (requestError) {
      setItems([]);
      setError(requestError.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().then(ownedItems => {
      if (!active) return;
      setItems(ownedItems);
      setError('');
    }).catch(requestError => {
      if (!active) return;
      setItems([]);
      setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  const updateItem = useCallback(item => {
    setItems(previous => previous.map(current => current.id === item.id ? item : current));
  }, []);
  const removeItem = useCallback(id => {
    setItems(previous => previous.filter(item => item.id !== id));
  }, []);

  return { items, loading, error, refresh, updateItem, removeItem };
}
