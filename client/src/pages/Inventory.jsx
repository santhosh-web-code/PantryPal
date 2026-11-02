import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit3, Filter, Plus, Search, Trash2 } from 'lucide-react';
import { categories } from '../data/mockData.js';
import { usePantry } from '../context/PantryContext.jsx';
import { getStatuses } from '../components/StatusBadge.jsx';
import ItemThumbnail from '../components/ItemThumbnail.jsx';
import { apiRequest } from '../utils/api.js';

const blank = { name: '', category: 'Other', quantity: 1, unit: 'pcs', expiryDate: '', lowStockThreshold: 1, image: '' };

export default function Inventory() {
  const { items: localItems, addInventoryItem, updateInventoryItem, removeInventoryItem, replacePantryItems } = usePantry();
  const [searchParams, setSearchParams] = useSearchParams();
  const pantryId = searchParams.get('pantryId') || '';
  const [pantries, setPantries] = useState([]);
  const [pantriesLoaded, setPantriesLoaded] = useState(false);
  const [serverItems, setServerItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const apiMode = pantriesLoaded;
  const items = pantryId ? serverItems : apiMode ? [] : localItems;

  useEffect(() => {
    let active = true;
    apiRequest('/api/pantries/owned').then(payload => {
      if (!active) return;
      setPantries(payload.pantries);
      setPantriesLoaded(true);
      if (!pantryId && payload.pantries.length === 1) {
        setSearchParams({ pantryId: payload.pantries[0].id }, { replace: true });
      }
    }).catch(requestError => {
      if (active) {
        setPantriesLoaded(true);
        setError(requestError.message);
      }
    });
    return () => { active = false; };
  }, []);

  const loadItems = async id => {
    setLoading(true);
    try {
      const payload = await apiRequest(`/api/pantries/${id}/items`);
      setServerItems(payload.items);
      replacePantryItems(id, payload.items);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
      setServerItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pantryId) loadItems(pantryId);
    else setServerItems([]);
  }, [pantryId]);

  const filtered = useMemo(() => items.filter(item => {
    const statuses = getStatuses(item);
    const matchesStatus = status === 'All' || statuses.includes(status) || (status === 'Available' && statuses.includes('OK'));
    return item.name.toLowerCase().includes(search.toLowerCase()) && (category === 'All' || item.category === category) && matchesStatus;
  }), [items, search, category, status]);

  const openAdd = () => { setEditing(null); setForm(blank); setError(''); setModal(true); };
  const openEdit = item => { setEditing(item.id); setForm({ ...item }); setError(''); setModal(true); };
  const save = async event => {
    event.preventDefault();
    if (!form.name.trim() || !form.expiryDate) {
      setError('Please enter an item name and expiry date.');
      return;
    }
    try {
      if (pantryId) {
        const detailFields = {
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          expiryDate: form.expiryDate,
          lowStockThreshold: Number(form.lowStockThreshold),
          image: form.image || ''
        };
        if (editing) {
          const current = serverItems.find(item => item.id === editing);
          const changeAmount = Number(form.quantity) - Number(current?.quantity || 0);
          if (changeAmount) detailFields.changeAmount = changeAmount;
          await apiRequest(`/api/items/${editing}`, { method: 'PATCH', body: JSON.stringify(detailFields) });
        } else {
          await apiRequest(`/api/pantries/${pantryId}/items`, {
            method: 'POST',
            body: JSON.stringify({ ...detailFields, quantity: Number(form.quantity) })
          });
        }
        await loadItems(pantryId);
      } else if (editing) {
        updateInventoryItem(editing, form);
      } else {
        addInventoryItem({ ...form, pantryId: 'p1' });
      }
      setModal(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const remove = async id => {
    if (pantryId) {
      if (!window.confirm('Delete this inventory item?')) return;
      try {
        await apiRequest(`/api/items/${id}`, { method: 'DELETE' });
        await loadItems(pantryId);
      } catch (requestError) {
        setError(requestError.message);
      }
    } else {
      removeInventoryItem(id);
    }
  };

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">Shared pantry</p><h1>Inventory</h1><p>Manage and track pantry items.</p></div><button className="btn" disabled={!pantriesLoaded || (apiMode && !pantryId)} onClick={openAdd}><Plus size={18}/> Add item</button></div>
    {pantriesLoaded && pantries.length > 1 && <label>Pantry<select aria-label="Select pantry" value={pantryId} onChange={event => setSearchParams(event.target.value ? { pantryId: event.target.value } : {})}><option value="">Select a pantry</option>{pantries.map(pantry => <option key={pantry.id} value={pantry.id}>{pantry.name}</option>)}</select></label>}
    {error && !modal && <div className="form-error" role="alert">{error}</div>}
    {apiMode && !pantryId && <div className="empty-state"><h3>{pantries.length ? 'Select a pantry' : 'No owned pantries yet'}</h3><p>Choose an owned pantry to view and edit its inventory.</p></div>}
    <section className="panel inventory-panel">
      <div className="inventory-toolbar">
        <label className="search-field"><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search items..." /></label>
        <button type="button" className={`btn secondary inventory-filter-button ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(open => !open)}><Filter size={17}/> Filters</button>
        {filtersOpen && <><select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)}><option value="All">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter by stock status" value={status} onChange={event => setStatus(event.target.value)}><option>All</option><option>Available</option><option>Low Stock</option><option>Expiring Soon</option><option>Expired</option></select></>}
      </div>
      {loading ? <p className="empty-state" aria-busy="true">Loading inventory…</p> : <div className="table-wrap"><table><thead><tr><th>Item name</th><th>Category</th><th>Quantity</th><th>Expiry date</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {filtered.map(item => { const statuses = getStatuses(item); return <tr key={item.id}><td><span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}><ItemThumbnail item={item}/><strong>{item.name}</strong></span></td><td>{item.category}</td><td>{item.quantity} {item.unit}</td><td>{item.expiryDate}</td><td><span className={`status ${statuses[0].toLowerCase().replaceAll(' ','-')}`}>{statuses[0]}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`}><Edit3 size={17}/></button><button className="icon-button danger" onClick={() => remove(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={17}/></button></div></td></tr>; })}
      </tbody></table></div>}
      {!loading && !filtered.length && !apiMode && <div className="empty-state"><Search size={28}/><h3>No items found</h3><p>Try changing your search or filters.</p><button className="btn secondary" onClick={() => { setSearch(''); setCategory('All'); setStatus('All'); }}>Clear filters</button></div>}
      {!loading && !filtered.length && pantryId && <div className="empty-state"><Search size={28}/><h3>No items in this pantry yet</h3><p>Add an item to start tracking this pantry's stock.</p></div>}
    </section>
    {modal && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setModal(false)}><form className="modal" onSubmit={save} noValidate><div className="modal-heading"><div><h2>{editing ? 'Edit item' : 'Add a new item'}</h2><p>Update your pantry inventory.</p></div><button type="button" className="icon-button" onClick={() => setModal(false)}>×</button></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="form-grid"><label>Item name<input value={form.name} onChange={event => setForm({...form,name:event.target.value})}/></label><label>Category<select value={form.category} onChange={event => setForm({...form,category:event.target.value})}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label>Quantity<input type="number" min="0" value={form.quantity} onChange={event => setForm({...form,quantity:Number(event.target.value)})}/></label><label>Unit<input value={form.unit} onChange={event => setForm({...form,unit:event.target.value})}/></label><label>Expiry date<input type="date" value={form.expiryDate} onChange={event => setForm({...form,expiryDate:event.target.value})}/></label><label>Low-stock threshold<input type="number" min="0" value={form.lowStockThreshold} onChange={event => setForm({...form,lowStockThreshold:Number(event.target.value)})}/></label><label>Product image URL<input type="url" value={form.image || ''} placeholder="https://…" onChange={event => setForm({...form,image:event.target.value})}/></label></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn">{editing ? 'Save changes' : 'Add item'}</button></div></form></div>}
  </div>;
}
