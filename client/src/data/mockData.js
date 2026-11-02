// All hardcoded mock data lives here. Replace with API calls later.

// Helper: date string (YYYY-MM-DD) N days from today, so expiry examples stay fresh.
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const categories = ['Grains', 'Pulses', 'Oils', 'Dairy', 'Vegetables', 'Fruits', 'Spices', 'Snacks', 'Beverages', 'Other'];

export const currentUser = { id: 'u1', name: 'Tejesh', email: 'tejesh@example.com' };

// Mock flag: is the logged-in user the owner of the pantry? (controls owner-only UI)
export const isOwner = true;

export const pantries = [
  { id: 'p1', name: 'Hostel Room 204', ownerId: 'u1', memberIds: ['u1', 'u2', 'u3'] },
  { id: 'p2', name: 'Home Kitchen', ownerId: 'u2', memberIds: ['u1', 'u2'] },
];

export const items = [
  { id: 'i1', pantryId: 'p1', name: 'Basmati Rice', category: 'Grains', quantity: 5, unit: 'kg', expiryDate: daysFromNow(200), lowStockThreshold: 2, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=700&q=85' },
  { id: 'i2', pantryId: 'p1', name: 'Milk', category: 'Dairy', quantity: 2, unit: 'litres', expiryDate: daysFromNow(3), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=700&q=85' },
  { id: 'i3', pantryId: 'p1', name: 'Eggs', category: 'Dairy', quantity: 4, unit: 'pcs', expiryDate: daysFromNow(10), lowStockThreshold: 6, image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=700&q=85' },
  { id: 'i4', pantryId: 'p1', name: 'Tomatoes', category: 'Vegetables', quantity: 1, unit: 'kg', expiryDate: daysFromNow(-2), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=700&q=85' },
  { id: 'i5', pantryId: 'p1', name: 'Turmeric Powder', category: 'Spices', quantity: 200, unit: 'g', expiryDate: daysFromNow(300), lowStockThreshold: 50, image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=700&q=85' },
  { id: 'i6', pantryId: 'p1', name: 'Instant Noodles', category: 'Snacks', quantity: 12, unit: 'packs', expiryDate: daysFromNow(90), lowStockThreshold: 4, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=700&q=85' },
  { id: 'i9', pantryId: 'p1', name: 'Cooking Oil', category: 'Oils', quantity: 4, unit: 'litres', expiryDate: daysFromNow(180), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=700&q=85' },
  { id: 'i10', pantryId: 'p1', name: 'Fresh Bread', category: 'Snacks', quantity: 8, unit: 'packs', expiryDate: daysFromNow(5), lowStockThreshold: 3, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=700&q=85' },
  { id: 'i11', pantryId: 'p1', name: 'Red Apples', category: 'Fruits', quantity: 10, unit: 'pcs', expiryDate: daysFromNow(14), lowStockThreshold: 4, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=700&q=85' },
  { id: 'i12', pantryId: 'p1', name: 'Coffee Powder', category: 'Beverages', quantity: 500, unit: 'g', expiryDate: daysFromNow(240), lowStockThreshold: 100, image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=700&q=85' },
  { id: 'i13', pantryId: 'p1', name: 'Black Tea', category: 'Beverages', quantity: 20, unit: 'packs', expiryDate: daysFromNow(270), lowStockThreshold: 5, image: 'https://images.unsplash.com/photo-1594631661960-34762327295a?auto=format&fit=crop&w=700&q=85' },
  { id: 'i14', pantryId: 'p1', name: 'Potatoes', category: 'Vegetables', quantity: 6, unit: 'kg', expiryDate: daysFromNow(30), lowStockThreshold: 2, image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=85' },
  { id: 'i15', pantryId: 'p1', name: 'Onions', category: 'Vegetables', quantity: 5, unit: 'kg', expiryDate: daysFromNow(24), lowStockThreshold: 2, image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=700&q=85' },
  { id: 'i16', pantryId: 'p1', name: 'Curd', category: 'Dairy', quantity: 3, unit: 'packs', expiryDate: daysFromNow(7), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=700&q=85' },
  { id: 'i17', pantryId: 'p1', name: 'Sugar', category: 'Other', quantity: 4, unit: 'kg', expiryDate: daysFromNow(365), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=700&q=85' },
  { id: 'i18', pantryId: 'p1', name: 'Pasta', category: 'Other', quantity: 8, unit: 'packs', expiryDate: daysFromNow(180), lowStockThreshold: 3, image: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=700&q=85' },
  { id: 'i19', pantryId: 'p1', name: 'Biscuits', category: 'Snacks', quantity: 15, unit: 'packs', expiryDate: daysFromNow(120), lowStockThreshold: 5, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=700&q=85' },
  { id: 'i20', pantryId: 'p1', name: 'Wheat Flour', category: 'Grains', quantity: 10, unit: 'kg', expiryDate: daysFromNow(150), lowStockThreshold: 3, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=700&q=85' },
  { id: 'i21', pantryId: 'p1', name: 'Idli Rice', category: 'Grains', quantity: 8, unit: 'kg', expiryDate: daysFromNow(210), lowStockThreshold: 2, image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=85' },
  { id: 'i22', pantryId: 'p1', name: 'Brown Rice', category: 'Grains', quantity: 5, unit: 'kg', expiryDate: daysFromNow(180), lowStockThreshold: 2, image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=85' },
  { id: 'i23', pantryId: 'p1', name: 'Poha', category: 'Grains', quantity: 3, unit: 'kg', expiryDate: daysFromNow(160), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=85' },
  { id: 'i24', pantryId: 'p1', name: 'Ragi Flour', category: 'Grains', quantity: 2, unit: 'kg', expiryDate: daysFromNow(120), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=700&q=85' },
  { id: 'i25', pantryId: 'p1', name: 'Millet Flour', category: 'Grains', quantity: 2, unit: 'kg', expiryDate: daysFromNow(120), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=700&q=85' },
  { id: 'i26', pantryId: 'p1', name: 'Toor Dal', category: 'Pulses', quantity: 4, unit: 'kg', expiryDate: daysFromNow(300), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=700&q=85' },
  { id: 'i27', pantryId: 'p1', name: 'Moong Dal', category: 'Pulses', quantity: 3, unit: 'kg', expiryDate: daysFromNow(300), lowStockThreshold: 1,   image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=700&q=85' },
  { id: 'i28', pantryId: 'p1', name: 'Chana Dal', category: 'Pulses', quantity: 3, unit: 'kg', expiryDate: daysFromNow(300), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=700&q=85' },
  { id: 'i29', pantryId: 'p1', name: 'Chickpeas', category: 'Pulses', quantity: 4, unit: 'kg', expiryDate: daysFromNow(300), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=700&q=85' },
  { id: 'i30', pantryId: 'p1', name: 'Masoor Dal', category: 'Pulses', quantity: 3, unit: 'kg', expiryDate: daysFromNow(300), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=700&q=85' },
  { id: 'i31', pantryId: 'p1', name: 'Urad Dal', category: 'Pulses', quantity: 3, unit: 'kg', expiryDate: daysFromNow(300), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=700&q=85' },
  { id: 'i32', pantryId: 'p1', name: 'Sunflower Oil', category: 'Oils', quantity: 3, unit: 'litres', expiryDate: daysFromNow(330), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=700&q=85' },
  { id: 'i33', pantryId: 'p1', name: 'Groundnut Oil', category: 'Oils', quantity: 2, unit: 'litres', expiryDate: daysFromNow(330), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=700&q=85' },
  { id: 'i34', pantryId: 'p1', name: 'Mustard Oil', category: 'Oils', quantity: 2, unit: 'litres', expiryDate: daysFromNow(330), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=85' },
  { id: 'i35', pantryId: 'p1', name: 'Coconut Oil', category: 'Oils', quantity: 2, unit: 'litres', expiryDate: daysFromNow(330), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1580984969071-a8da5656c2fb?auto=format&fit=crop&w=700&q=85' },
  { id: 'i36', pantryId: 'p1', name: 'Olive Oil', category: 'Oils', quantity: 1, unit: 'litre', expiryDate: daysFromNow(330), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=700&q=85' },
  { id: 'i37', pantryId: 'p1', name: 'Ghee', category: 'Dairy', quantity: 2, unit: 'kg', expiryDate: daysFromNow(250), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1634141510639-d691d86f47be?auto=format&fit=crop&w=700&q=85' },
  { id: 'i38', pantryId: 'p1', name: 'Salt', category: 'Other', quantity: 2, unit: 'kg', expiryDate: daysFromNow(730), lowStockThreshold: 1, image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=700&q=85' },
  { id: 'i39', pantryId: 'p1', name: 'Green Chillies', category: 'Vegetables', quantity: 250, unit: 'g', expiryDate: daysFromNow(8), lowStockThreshold: 100, image: 'https://images.unsplash.com/photo-1583119022894-4c6ab83f1c1f?auto=format&fit=crop&w=700&q=85' },
  { id: 'i40', pantryId: 'p1', name: 'Bananas', category: 'Fruits', quantity: 12, unit: 'pcs', expiryDate: daysFromNow(5), lowStockThreshold: 4, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=700&q=85' },
  { id: 'i7', pantryId: 'p2', name: 'Atta Flour', category: 'Grains', quantity: 3, unit: 'kg', expiryDate: daysFromNow(60), lowStockThreshold: 1 },
  { id: 'i8', pantryId: 'p2', name: 'Bananas', category: 'Fruits', quantity: 6, unit: 'pcs', expiryDate: daysFromNow(5), lowStockThreshold: 3 },
];

export const members = [
  { id: 'u1', name: 'Vikas', email: 'tejesh@example.com', role: 'Owner' },
  { id: 'u2', name: 'Aarav', email: 'aarav@example.com', role: 'Member' },
  { id: 'u3', name: 'Rahul', email: 'rahul@example.com', role: 'Member' },
];

export const activity = [
  { id: 'a1', user: 'Ananya', item: 'Milk', changeAmount: -1, note: 'Used for tea', time: '2 hours ago' },
  { id: 'a2', user: 'Rahul', item: 'Eggs', changeAmount: -2, note: 'Breakfast', time: 'Yesterday' },
  { id: 'a3', user: 'Vikas', item: 'Basmati Rice', changeAmount: 5, note: 'Bought a new bag', time: '2 days ago' },
  { id: 'a4', user: 'Ananya', item: 'Instant Noodles', changeAmount: -3, note: 'Late-night snack', time: '3 days ago' },
];
