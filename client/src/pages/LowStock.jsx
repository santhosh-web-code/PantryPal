import { useState } from 'react';
import { PackageMinus, Plus, TriangleAlert, X, Trash2 } from 'lucide-react';
import { usePantry } from '../context/PantryContext.jsx';
import { deletePantryItem } from '../utils/pantryItems.js';
import { apiRequest } from '../utils/api.js';
import { useOwnedPantryItems } from '../hooks/useOwnedPantryItems.js';
import ItemThumbnail from '../components/ItemThumbnail.jsx';

export default function LowStock() {
  const { removeInventoryItem } = usePantry();
  const { items, loading, error: loadError, updateItem, removeItem } = useOwnedPantryItems();
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockToAdd, setStockToAdd] = useState(1);
  const [actionError, setActionError] = useState('');
  const low = items.filter(item => item.quantity <= item.lowStockThreshold);

  const openRestock = item => {
    setSelectedItem(item);
    setStockToAdd(Math.max(1, item.lowStockThreshold - item.quantity + 1));
  };
  const addStock = async event => {
    event.preventDefault();
    if (!selectedItem) return;
    const amount = Math.max(0, Number(stockToAdd) || 0);
    if (!amount) return;
    try {
      const { item } = await apiRequest(`/api/items/${selectedItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ changeAmount: amount })
      });
      updateItem(item);
      setSelectedItem(null);
      setActionError('');
    } catch (requestError) {
      setActionError(requestError.message);
    }
  };
  const deleteItem = async item => {
    if (!window.confirm(`Permanently delete "${item.name}" from this pantry's inventory?`)) return;
    try {
      await deletePantryItem(item);
      removeItem(item.id);
      removeInventoryItem(item.id);
      setActionError('');
    } catch (requestError) {
      setActionError(requestError.message);
    }
  };

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Attention needed</p><h1>Low Stock</h1><p>Items that have reached their minimum quantity.</p></div></div>{(loadError || actionError) && <div className="form-error" role="alert">{loadError || actionError}</div>}{loading ? <p className="empty-state" aria-busy="true">Loading low-stock items…</p> : <><div className="alert-summary"><TriangleAlert/><div><strong>{low.length} low-stock items</strong><span>Review these items and add stock to update availability.</span></div></div>{low.length ? <div className="item-card-grid">{low.map(item => <article className="stock-card" key={item.id}><div className="stock-card-top"><span className="stock-icon"><PackageMinus size={22}/></span><span className="status low-stock">Low stock</span></div><ItemThumbnail item={item} size={72}/><h2>{item.name}</h2><p>{item.category} · {item.unit}</p><div className="stock-progress"><div style={{width:`${Math.min(100, item.lowStockThreshold ? (item.quantity/item.lowStockThreshold)*100 : 100)}%`}}/></div><div className="stock-numbers"><div><small>Current</small><strong>{item.quantity} {item.unit}</strong></div><div><small>Minimum</small><strong>{item.lowStockThreshold} {item.unit}</strong></div></div><div className="modal-actions"><button className="btn low-stock-restock" type="button" onClick={() => openRestock(item)}><Plus size={17}/> Add stock</button><button className="icon-button danger" type="button" aria-label={`Delete ${item.name} from pantry inventory`} onClick={() => deleteItem(item)}><Trash2 size={17}/></button></div></article>)}</div> : <div className="empty-state"><PackageMinus/><h3>Everything is well stocked</h3><p>No items are currently below their threshold.</p></div>}</>}
  {selectedItem && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSelectedItem(null)}><form className="modal small-modal restock-modal" onSubmit={addStock}><div className="modal-heading"><div><h2>Add stock</h2><p>{selectedItem.name}</p></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setSelectedItem(null)}><X/></button></div><div className="restock-summary"><span>Available now<strong>{selectedItem.quantity} {selectedItem.unit}</strong></span><span>Minimum required<strong>{selectedItem.lowStockThreshold} {selectedItem.unit}</strong></span></div><label>Quantity to add<div className="stock-input-wrap"><input type="number" min="1" step="1" value={stockToAdd} onChange={event => setStockToAdd(event.target.value)} required /><span>{selectedItem.unit}</span></div></label>{actionError && <div className="form-error" role="alert">{actionError}</div>}<div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setSelectedItem(null)}>Cancel</button><button className="btn" type="submit"><Plus size={17}/> Update stock</button></div></form></div>}
  </div>;
}
