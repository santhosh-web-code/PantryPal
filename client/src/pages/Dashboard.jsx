import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Boxes, Clock3, Package, TriangleAlert, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePantryActivity } from '../hooks/usePantryActivity.js';
import { useOwnedPantryItems } from '../hooks/useOwnedPantryItems.js';
import { getStatuses } from '../components/StatusBadge.jsx';
import ItemThumbnail from '../components/ItemThumbnail.jsx';
import { apiRequest } from '../utils/api.js';
import { getDashboardTime } from '../utils/dashboardTime.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { items, loading: itemsLoading, error: itemsError } = useOwnedPantryItems();
  const { activities, loading: activityLoading, error: activityError } = usePantryActivity();
  const [pantries, setPantries] = useState([]);
  const [pantriesLoading, setPantriesLoading] = useState(true);
  const [pantryError, setPantryError] = useState('');
  const [dashboardTime, setDashboardTime] = useState(() => getDashboardTime());

  useEffect(() => {
    let active = true;
    apiRequest('/api/pantries/owned').then(payload => {
      if (active) {
        setPantries(payload.pantries);
        setPantriesLoading(false);
      }
    }).catch(requestError => {
      if (active) {
        setPantryError(requestError.message);
        setPantriesLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setDashboardTime(getDashboardTime()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const low = items.filter(item => getStatuses(item).includes('Low Stock'));
  const expiring = items.filter(item => getStatuses(item).includes('Expiring Soon'));
  const members = new Set(pantries.flatMap(pantry => pantry.memberIds.filter(id => id !== pantry.ownerId)));
  const loading = itemsLoading || activityLoading || pantriesLoading;
  const cards = [
    { label: 'Total Items', value: items.length, detail: 'In your owned pantries', icon: Package, tone: 'green' },
    { label: 'Low Stock', value: low.length, detail: 'Needs attention', icon: TriangleAlert, tone: 'amber' },
    { label: 'Expiring Soon', value: expiring.length, detail: 'Within 7 days', icon: Clock3, tone: 'orange' },
    { label: 'Total Members', value: members.size, detail: 'With pantry access', icon: Users, tone: 'blue' },
  ];

  return <div className="page">
    <div className="page-heading welcome-heading">
      <div><p className="eyebrow">{dashboardTime.day} overview · {dashboardTime.date} · {dashboardTime.time}</p><h1>{dashboardTime.greeting}, {user.name}</h1><p>Here’s what’s happening in your shared pantries.</p></div>
      <Link className="btn" to="/inventory">Add item</Link>
    </div>

    {loading && <p className="empty-state" aria-busy="true">Loading dashboard data…</p>}
    {(itemsError || activityError || pantryError) && <div className="form-error" role="alert">{itemsError || activityError || pantryError}</div>}
    <div className="stat-grid">
      {cards.map(({ label, value, detail, icon: Icon, tone }) => <div className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={21}/></div><div><span>{label}</span><strong>{loading || itemsError || pantryError ? '—' : value}</strong><small>{detail}</small></div></div>)}
    </div>

    <section className="panel">
      <div className="panel-heading"><div><h2>Your owned pantries</h2><p>Only pantries where you are the owner</p></div><Link to="/pantries">Manage pantries <ArrowUpRight size={16}/></Link></div>
      {pantriesLoading ? <p className="empty-state" aria-busy="true">Loading pantries…</p> : pantryError ? null : pantries.length ? pantries.map(pantry => <div className="buyer-list-row" key={pantry.id}><span className="item-avatar"><Boxes size={18}/></span><div><strong>{pantry.name}</strong><small>{pantry.memberIds.filter(id => id !== pantry.ownerId).length} members</small></div><Link to={`/inventory?pantryId=${pantry.id}`} aria-label={`Manage ${pantry.name}`}><ArrowUpRight size={17}/></Link></div>) : <p className="empty-state">You do not own any pantries yet.</p>}
    </section>

    <div className="dashboard-grid">
      <section className="panel inventory-overview">
        <div className="panel-heading"><div><h2>Inventory overview</h2><p>Items in your owned pantries</p></div><Link to="/inventory">View all <ArrowUpRight size={16}/></Link></div>
        {items.length ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Status</th></tr></thead><tbody>{items.slice(0, 5).map(item => {
          const itemStatus = getStatuses(item)[0];
          return <tr key={item.id}><td><span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}><ItemThumbnail item={item}/><strong>{item.name}</strong></span></td><td>{item.category}</td><td>{item.quantity} {item.unit}</td><td><span className={`status ${itemStatus.toLowerCase().replaceAll(' ', '-')}`}>{itemStatus}</span></td></tr>;
        })}</tbody></table></div> : !itemsLoading && !itemsError && <p className="empty-state">No data available yet.</p>}
      </section>
      <section className="panel alerts-panel">
        <div className="panel-heading"><div><h2>Stock alerts</h2><p>{loading ? 'Loading…' : `${low.length} items need restocking`}</p></div></div>
        {low.slice(0, 3).map(item => <div className="alert-row" key={item.id}><span className="alert-icon amber"><TriangleAlert size={18}/></span><div><strong>{item.name}</strong><small>{item.quantity} {item.unit} remaining</small></div><span className="threshold">Min. {item.lowStockThreshold}</span></div>)}
        {!loading && !itemsError && !low.length && <p className="empty-state">No low-stock items.</p>}
        <Link className="text-link" to="/low-stock">View all low-stock items <ArrowUpRight size={16}/></Link>
      </section>
    </div>

    <div className="dashboard-grid bottom-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Expiry notifications</h2><p>Keep track before items go bad</p></div><Link to="/expiry-alerts">View all</Link></div>
        {expiring.length ? expiring.slice(0, 3).map(item => <div className="expiry-row" key={item.id}><div className="item-avatar">{item.name[0]}</div><div><strong>{item.name}</strong><small>{item.quantity} {item.unit}</small></div><span className="expiry-date">Expires {item.expiryDate}</span></div>) : !itemsLoading && !itemsError && <p className="empty-state">No expiring items.</p>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest changes to your pantries</p></div><Link to="/activity">History</Link></div>
        {activities.slice(0, 4).map(entry => <div className="activity-row" key={entry.id}><span className={`activity-dot ${entry.changeAmount > 0 ? 'added' : ''}`}><Activity size={15}/></span><div><strong>{entry.user}</strong><small>{entry.description} · {entry.time}</small></div></div>)}
        {!activityLoading && !activityError && !activities.length && <p className="empty-state">No activity available yet.</p>}
      </section>
    </div>
  </div>;
}
