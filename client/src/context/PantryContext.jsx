import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { items as initialItems, activity as initialActivity, members } from '../data/mockData.js';

const PantryContext = createContext(null);

const saveLocal = (key, value) => {
  try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }
  catch (error) {
    if (error?.name === 'QuotaExceededError') {
      try {
        if (key === 'pantrypal-members') localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value.map(member => ({ ...member, photo: '' })) : []));
        if (key.endsWith('-profile')) localStorage.setItem(key, JSON.stringify({ ...value, photo: '' }));
      } catch {}
    }
    console.warn(`PantryPal could not save ${key} locally.`);
  }
};

export function PantryProvider({ children }) {
  const [items, setItems] = useState(() => {
    const defaults = initialItems;
    try {
      const saved = JSON.parse(localStorage.getItem('pantrypal-inventory'));
      if (!Array.isArray(saved)) return defaults;
      let legacyCart = {};
      try { legacyCart = JSON.parse(localStorage.getItem('pantrypal-aarav-cart')) || {}; }
      catch { legacyCart = {}; }
      const savedIds = new Set(saved.map(item => item.id));
      const mergedSaved = saved.map(savedItem => {
        const { totalStock, reservedQuantity, ...item } = savedItem;
        const defaultItem = defaults.find(candidate => candidate.id === item.id);
        const hasLegacyReservation = Number(legacyCart[item.id]) > 0 || Number(reservedQuantity) > 0;
        const quantity = hasLegacyReservation && Number.isFinite(Number(totalStock)) ? Number(totalStock) : item.quantity;
        const cleanedItem = { ...item, quantity };
        return defaultItem ? { ...defaultItem, ...cleanedItem, image: defaultItem.image || item.image } : cleanedItem;
      });
      const missingDefaults = defaults.filter(item => !savedIds.has(item.id));
      return [...mergedSaved, ...missingDefaults];
    }
    catch { return defaults; }
  });
  const [activities, setActivities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pantrypal-activities')) || initialActivity; }
    catch { return initialActivity; }
  });
  const [notifications, setNotifications] = useState([]);
  const [memberList, setMemberList] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pantrypal-members')) || members; }
    catch { return members; }
  });
  const [ownerProfile, setOwnerProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pantrypal-owner-profile')) || { name: 'Tejesh', email: 'tejesh@example.com' }; }
    catch { return { name: 'Tejesh', email: 'tejesh@example.com' }; }
  });
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem('pantrypal-workspace-name') || 'Hostel Room 204');
  const [buyerProfile, setBuyerProfile] = useState(() => {
    const defaultBuyerProfile = {
      name: 'Aarav',
      email: 'aarav@example.com',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=85'
    };
    try {
      const saved = JSON.parse(localStorage.getItem('pantrypal-buyer-profile'));
      return saved ? { ...defaultBuyerProfile, ...saved, photo: saved.photo || defaultBuyerProfile.photo } : defaultBuyerProfile;
    }
    catch { return defaultBuyerProfile; }
  });

  useEffect(() => { localStorage.removeItem('pantrypal-aarav-cart'); }, []);
  useEffect(() => saveLocal('pantrypal-inventory', items), [items]);
  useEffect(() => saveLocal('pantrypal-activities', activities), [activities]);
  useEffect(() => saveLocal('pantrypal-members', memberList), [memberList]);
  useEffect(() => saveLocal('pantrypal-owner-profile', ownerProfile), [ownerProfile]);
  useEffect(() => saveLocal('pantrypal-buyer-profile', buyerProfile), [buyerProfile]);
  useEffect(() => saveLocal('pantrypal-workspace-name', workspaceName), [workspaceName]);
  useEffect(() => {
    const synchronize = event => {
      try {
        if (event.key === 'pantrypal-inventory') setItems(JSON.parse(event.newValue || '[]'));
        if (event.key === 'pantrypal-activities') setActivities(JSON.parse(event.newValue || '[]'));
        if (event.key === 'pantrypal-members') setMemberList(JSON.parse(event.newValue || '[]'));
        if (event.key === 'pantrypal-owner-profile') setOwnerProfile(JSON.parse(event.newValue || '{}'));
        if (event.key === 'pantrypal-buyer-profile') setBuyerProfile(JSON.parse(event.newValue || '{}'));
        if (event.key === 'pantrypal-workspace-name') setWorkspaceName(event.newValue || 'Hostel Room 204');
      } catch {}
    };
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, []);
  const addInventoryItem = (item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const newItem = { ...item, quantity, id: item.id || `i${Date.now()}`, pantryId: item.pantryId || 'p1' };
    setItems(previous => [...previous, newItem]);
    setNotifications(previous => [{ id: `notification-${Date.now()}`, itemId: newItem.id, itemName: newItem.name, message: `New pantry item added: ${newItem.name}. Check the updated inventory.`, read: false, time: 'Just now' }, ...previous]);
    return newItem;
  };
  const replacePantryItems = (pantryId, pantryItems) => {
    const syncedItems = pantryItems;
    setItems(previous => [...previous.filter(item => item.pantryId !== pantryId), ...syncedItems]);
  };

  const updateInventoryItem = (id, updates) => setItems(previous => previous.map(item =>
    item.id === id ? { ...item, ...updates, id } : item
  ));
  const removeInventoryItem = id => {
    setItems(previous => previous.filter(item => item.id !== id));
    setNotifications(previous => previous.filter(notification => notification.itemId !== id));
  };
  const markNotificationsRead = () => setNotifications(previous => previous.map(notification => ({ ...notification, read: true })));
  const markNotificationRead = (id) => setNotifications(previous => previous.map(notification => notification.id === id ? { ...notification, read: true } : notification));
  const updateOwnerProfile = updates => setOwnerProfile(previous => ({ ...previous, ...updates }));
  const updateBuyerProfile = updates => {
    setBuyerProfile(previous => ({ ...previous, ...updates }));
    setMemberList(previous => previous.map(member => member.id === 'u2' ? { ...member, ...updates } : member));
  };
  const addMember = member => setMemberList(previous => [...previous, member]);
  const updateMember = (id, updates) => {
    setMemberList(previous => previous.map(member => member.id === id ? { ...member, ...updates } : member));
    if (id === 'u2') setBuyerProfile(previous => ({ ...previous, ...updates }));
  };
  const removeMember = id => setMemberList(previous => previous.filter(member => member.id !== id));
  const updateWorkspaceName = name => setWorkspaceName(name.trim() || 'Hostel Room 204');

  const value = useMemo(() => ({ items, activities, notifications, ownerProfile, buyerProfile, workspaceName, members: memberList, addInventoryItem, replacePantryItems, updateInventoryItem, removeInventoryItem, markNotificationsRead, markNotificationRead, updateOwnerProfile, updateBuyerProfile, updateWorkspaceName, addMember, updateMember, removeMember }), [items, activities, notifications, ownerProfile, buyerProfile, workspaceName, memberList]);
  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry() {
  const context = useContext(PantryContext);
  if (!context) throw new Error('usePantry must be used within PantryProvider');
  return context;
}
