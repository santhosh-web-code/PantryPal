import { CalendarClock, CircleCheck, Trash2 } from 'lucide-react';
import { usePantry } from '../context/PantryContext.jsx';
import { deletePantryItem } from '../utils/pantryItems.js';
import { useState } from 'react';
import { apiRequest } from '../utils/api.js';
import { useOwnedPantryItems } from '../hooks/useOwnedPantryItems.js';
import ItemThumbnail from '../components/ItemThumbnail.jsx';

export default function ExpiryAlerts() {
  const { removeInventoryItem } = usePantry();
  const { items, loading, error: loadError, updateItem, removeItem } = useOwnedPantryItems();
  const [error, setError] = useState('');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = item => Math.ceil((new Date(`${item.expiryDate}T00:00:00`) - today) / 86400000);
  const expired = items.filter(item => daysUntil(item) < 0);
  const soon = items.filter(item => { const days = daysUntil(item); return days >= 0 && days <= 7; });
  const safe = items.filter(item => daysUntil(item) > 7);
  const sections = [{ title: 'Expired', items: expired, tone: 'expired' }, { title: 'Expiring soon', items: soon, tone: 'soon' }, { title: 'Safe items', items: safe, tone: 'safe' }];
  const deleteItem = async item => {
    if (!window.confirm(`Permanently delete "${item.name}" from this pantry's inventory?`)) return;
    try {
      await deletePantryItem(item);
      removeItem(item.id);
      removeInventoryItem(item.id);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const updateExpiryDate = async (item, expiryDate) => {
    try {
      const { item: updatedItem } = await apiRequest(`/api/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ expiryDate })
      });
      updateItem(updatedItem);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Food freshness</p><h1>Expiry Alerts</h1><p>Select an expiry date to update it using the calendar.</p></div></div>{(loadError || error) && <div className="form-error" role="alert">{loadError || error}</div>}
    {loading ? <p className="empty-state" aria-busy="true">Loading expiry alerts…</p> : <><div className="expiry-summary"><div><span className="summary-dot red"/><strong>{expired.length}</strong><small>Expired</small></div><div><span className="summary-dot amber"/><strong>{soon.length}</strong><small>Expiring soon</small></div><div><span className="summary-dot green"/><strong>{safe.length}</strong><small>Safe</small></div></div>
    {sections.map(section => <section className="panel expiry-section" key={section.title}><div className="panel-heading"><div><h2>{section.title}</h2><p>{section.items.length} items</p></div><CalendarClock size={20}/></div>{section.items.length ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Quantity</th><th>Expiry date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{section.items.map(item => <tr key={item.id}><td><span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}><ItemThumbnail item={item}/><strong>{item.name}</strong></span></td><td>{item.quantity} {item.unit}</td><td><input className="expiry-date-input" type="date" value={item.expiryDate || ''} aria-label={`Change expiry date for ${item.name}`} onChange={event => updateExpiryDate(item, event.target.value)}/></td><td><span className={`status ${section.tone}`}>{section.title}</span></td><td><button className="icon-button danger" type="button" aria-label={`Delete ${item.name} from pantry inventory`} onClick={() => deleteItem(item)}><Trash2 size={17}/></button></td></tr>)}</tbody></table></div> : <div className="mini-empty"><CircleCheck size={18}/> No {section.title.toLowerCase()} items</div>}</section>)}</>}
  </div>;
    }