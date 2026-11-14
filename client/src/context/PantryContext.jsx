import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

const PantryContext = createContext(null);

export function PantryProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  useEffect(() => { setItems([]); }, [user?.id]);
  const replacePantryItems = (pantryId, pantryItems) => {
    setItems(previous => [...previous.filter(item => item.pantryId !== pantryId), ...pantryItems]);
  };
  const updateInventoryItem = (id, updatedItem) => {
    setItems(previous => previous.map(item => item.id === id ? updatedItem : item));
  };

  const value = useMemo(() => ({ items, replacePantryItems, updateInventoryItem }), [items]);
  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry() {
  const context = useContext(PantryContext);
  if (!context) throw new Error('usePantry must be used within PantryProvider');
  return context;
}
