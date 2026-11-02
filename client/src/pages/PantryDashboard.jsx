import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ItemTable from '../components/ItemTable.jsx';
import ItemForm from '../components/ItemForm.jsx';
import { getStatuses } from '../components/StatusBadge.jsx';
import { pantries, items as mockItems, categories } from '../data/mockData.js';

// Inventory dashboard for one pantry. All changes live in local state only.
export default function PantryDashboard() {
  const { id } = useParams();
  const pantry = pantries.find((p) => p.id === id);
  const [items, setItems] = useState(mockItems.filter((i) => i.pantryId === id));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  if (!pantry) return <p className="empty">Pantry not found. <Link to="/pantries">Back to pantries</Link></p>;

  // Change quantity by +1 / -1, never going below 0.
  const changeQuantity = (itemId, delta) => {
    setItems(items.map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)));
  };

  const addItem = (newItem) => {
    setItems([...items, { ...newItem, id: 'i' + Date.now(), pantryId: id }]);
  };

  // Summary counts use all items, not just the filtered ones.
  const lowCount = items.filter((i) => getStatuses(i).includes('Low Stock')).length;
  const expiringCount = items.filter((i) => getStatuses(i).includes('Expiring Soon')).length;

  const visible = items.filter(
    (i) => i.name.toLowerCase().includes(search.toLowerCase()) && (category === 'All' || i.category === category)
  );

  return (
    <>
      <h1>{pantry.name}</h1>

      <div className="summary">
        <div className="card"><strong>{items.length}</strong><span>Total items</span></div>
        <div className="card"><strong>{lowCount}</strong><span>Low Stock</span></div>
        <div className="card"><strong>{expiringCount}</strong><span>Expiring Soon</span></div>
      </div>

      <div className="toolbar">
        <input placeholder="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <ItemTable items={visible} onChange={changeQuantity} />

      <h2>Add item</h2>
      <ItemForm onAdd={addItem} />
    </>
  );
}
