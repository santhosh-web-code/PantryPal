import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock3, Package, Plus, ShoppingBasket, TriangleAlert, ArrowUpRight, Activity, Users, Boxes } from 'lucide-react';
import { members } from '../data/mockData.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePantry } from '../context/PantryContext.jsx';
import { getStatuses } from '../components/StatusBadge.jsx';
import ItemThumbnail from '../components/ItemThumbnail.jsx';
import { getDashboardTime } from '../utils/dashboardTime.js';
import { apiRequest } from '../utils/api.js';

export default function Dashboard() {
  const { items, activities: activity } = usePantry();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [dashboardTime, setDashboardTime] = useState(() => getDashboardTime());
  const [pantries, setPantries] = useState([]);
  const [pantryError, setPantryError] = useState('');
  useEffect(() => {
    apiRequest('/api/pantries/owned')
      .then(payload => setPantries(payload.pantries))
      .catch(requestError => setPantryError(requestError.message));
  }, []);
  useEffect(() => { const timer = window.setInterval(() => setDashboardTime(getDashboardTime()), 30000); return () => window.clearInterval(timer); }, []);
  const low = items.filter(i => getStatuses(i).includes('Low Stock'));
  const expiring = items.filter(i => getStatuses(i).includes('Expiring Soon'));
  const cards = [
    { label: 'Total Items', value: items.length, detail: 'In your pantry', icon: Package, tone: 'green' },
    { label: 'Low Stock', value: low.length, detail: 'Needs attention', icon: TriangleAlert, tone: 'amber' },
    { label: 'Expiring Soon', value: expiring.length, detail: 'Within 7 days', icon: Clock3, tone: 'orange' },
    { label: 'Total Members', value: members.length, detail: 'With pantry access', icon: Users, tone: 'blue' },
  ];

  return <div className="page">
    <div className="page-heading welcome-heading">
      <div><p className="eyebrow">{dashboardTime.day} overview · {dashboardTime.date} · {dashboardTime.time}</p><h1>{dashboardTime.greeting}, {user.name}</h1><p>Here’s what’s happening in your shared pantry.</p></div>
      <button className="btn" onClick={() => navigate('/inventory')}><Plus size={18}/> Add item</button>
    </div>

    {showToast && <div className="toast"><ShoppingBasket size={18}/><span>Add item opened in the Inventory workspace.</span><button onClick={() => { setShowToast(false); window.location.assign('/inventory'); }}>Open</button></div>}

    <div className="stat-grid">
      {cards.map(({ label, value, detail, icon: Icon, tone }) => <div className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>)}
    </div>

    <section className="panel">
      <div className="panel-heading"><div><h2>Your owned pantries</h2><p>Only pantries where you are the owner</p></div><Link to="/pantries">Manage pantries <ArrowUpRight size={16}/></Link></div>
      {pantryError ? <p className="form-error" role="alert">{pantryError}</p> : pantries.length ? pantries.map(pantry => <div className="buyer-list-row" key={pantry.id}><span className="item-avatar"><Boxes size={18}/></span><div><strong>{pantry.name}</strong><small>{pantry.memberIds.filter(id => id !== pantry.ownerId).length} members</small></div><Link to="/pantries" aria-label={`Manage ${pantry.name}`}><ArrowUpRight size={17}/></Link></div>) : <p className="empty-state">You do not own any pantries yet.</p>}
    </section>

    <div className="dashboard-grid">
      <section className="panel inventory-overview">
        <div className="panel-heading"><div><h2>Inventory overview</h2><p>Popular pantry items</p></div><Link to="/inventory">View all <ArrowUpRight size={16}/></Link></div>
        <div className="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Status</th></tr></thead><tbody>{items.slice(0,5).map(item => <tr key={item.id}><td><span style={{ alignItems: 'center', display: 'inline-flex', gap: 10 }}><ItemThumbnail item={item}/><strong>{item.name}</strong></span></td><td>{item.category}</td><td>{item.quantity} {item.unit}</td><td><span className={`status ${getStatuses(item)[0]?.toLowerCase().replaceAll(' ','-')}`}>{getStatuses(item)[0]}</span></td></tr>)}</tbody></table></div>
      </section>
      <section className="panel alerts-panel">
        <div className="panel-heading"><div><h2>Stock alerts</h2><p>{low.length} items need restocking</p></div></div>
        {low.slice(0,3).map(item => <div className="alert-row" key={item.id}><span className="alert-icon amber"><TriangleAlert size={18}/></span><div><strong>{item.name}</strong><small>{item.quantity} {item.unit} remaining</small></div><span className="threshold">Min. {item.lowStockThreshold}</span></div>)}
        <Link className="text-link" to="/low-stock">View all low-stock items <ArrowUpRight size={16}/></Link>
      </section>
    </div>

    <div className="dashboard-grid bottom-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Expiry notifications</h2><p>Keep track before items go bad</p></div><Link to="/expiry-alerts">View all</Link></div>
        {expiring.length ? expiring.slice(0,3).map(item => <div className="expiry-row" key={item.id}><div className="item-avatar">{item.name[0]}</div><div><strong>{item.name}</strong><small>{item.quantity} {item.unit}</small></div><span className="expiry-date">Expires {item.expiryDate}</span></div>) : <p className="empty-state">No expiring items. You’re all caught up!</p>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest changes to inventory</p></div><Link to="/activity">History</Link></div>
        {activity.slice(0,4).map(entry => <div className="activity-row" key={entry.id}><span className={`activity-dot ${entry.changeAmount > 0 ? 'added' : ''}`}><Activity size={15}/></span><div><strong>{entry.user} {entry.changeAmount > 0 ? 'added' : 'used'} {entry.item}</strong><small>{entry.note} · {entry.time}</small></div></div>)}
      </section>
    </div>
  </div>;
}
