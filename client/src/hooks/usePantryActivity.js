import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';

export function usePantryActivity() {
  const { portal } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { pantries } = await apiRequest(portal === 'member' ? '/api/pantries/member' : '/api/pantries/owned');
      const results = await Promise.all(pantries.map(pantry => apiRequest(`/api/pantries/${pantry.id}/activity`)));
      const records = results.flatMap(result => result.activities).map(record => ({
        ...record,
        id: record.id || record._id,
        user: record.userId?.name || 'Former user',
        item: record.itemId?.name || '',
        description: record.description || (Number.isFinite(record.changeAmount)
          ? `${record.changeAmount > 0 ? 'Added' : 'Used'} ${Math.abs(record.changeAmount)} ${record.itemId?.name || 'inventory item'}`
          : 'Recorded inventory update'),
        time: record.createdAt ? new Date(record.createdAt).toLocaleString() : '',
        timestamp: record.createdAt ? new Date(record.createdAt).getTime() : 0
      })).sort((first, second) => second.timestamp - first.timestamp);
      setActivities(records);
      setError('');
      return records;
    } catch (requestError) {
      setActivities([]);
      setError(requestError.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('pantry-activity-updated', refresh);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('pantry-activity-updated', refresh);
    };
  }, [refresh]);

  return { activities, loading, error, refresh };
}
