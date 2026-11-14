import { useEffect, useState } from 'react';
import { ArrowRight, PackageSearch, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePantryActivity } from '../hooks/usePantryActivity.js';
import { getDashboardTime } from '../utils/dashboardTime.js';
import { apiRequest } from '../utils/api.js';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { activities, loading: activityLoading, error: activityError } = usePantryActivity();
  const [pantries, setPantries] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardTime, setDashboardTime] = useState(() => getDashboardTime());

  useEffect(() => {
    const timer = window.setInterval(() => setDashboardTime(getDashboardTime()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const { pantries: memberPantries } = await apiRequest('/api/pantries/member');
        const results = await Promise.all(memberPantries.map(pantry => apiRequest(`/api/pantries/${pantry.id}/items`)));
        if (active) {
          setPantries(memberPantries);
          setItems(results.flatMap(result => result.items));
          setError('');
        }
      } catch (requestError) {
        if (active) {
          setPantries([]);
          setItems([]);
          setError(requestError.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">{dashboardTime.day} overview · {dashboardTime.date} · {dashboardTime.time}</p><h1>{dashboardTime.greeting}, {user.name}</h1><p>Browse shared inventory and record actual stock changes.</p></div><Link className="btn" to="/buyer/shop"><PackageSearch size={18}/> Browse inventory</Link></div>
    {(error || activityError) && <div className="form-error" role="alert">{error || activityError}</div>}
    <div className="buyer-stat-grid"><div className="buyer-stat"><PackageSearch/><span>Available products<strong>{loading ? '—' : items.filter(item => item.quantity > 0).length}</strong></span></div><div className="buyer-stat"><Users/><span>Member pantries<strong>{loading ? '—' : pantries.length}</strong></span></div></div>
    <section className="panel"><div className="panel-heading"><div><h2>Your member pantries</h2><p>Only pantries where you have a member relationship</p></div><Link to="/pantries">View all</Link></div>{loading ? <p className="empty-state" aria-busy="true">Loading member pantries…</p> : error ? null : pantries.length ? pantries.map(pantry => <div className="buyer-list-row" key={pantry.id}><span className="item-avatar"><PackageSearch size={18}/></span><div><strong>{pantry.name}</strong><small>Shared with you as a member</small></div><Link to={`/buyer/shop?pantryId=${pantry.id}`} aria-label={`View ${pantry.name}`}><ArrowRight size={17}/></Link></div>) : <div className="empty-state"><p>No pantries have been shared with you yet.</p><Link to="/pantries">View member pantries</Link></div>}</section>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Pantry inventory</h2><p>Live stock shared with you</p></div><Link to="/buyer/shop">View inventory</Link></div>{loading ? <p className="empty-state" aria-busy="true">Loading inventory…</p> : items.length ? items.slice(0, 6).map(item => <div className="buyer-list-row" key={item.id}><span className="item-avatar">{item.name[0]}</span><div><strong>{item.name}</strong><small>{item.quantity > 0 ? `${item.quantity} ${item.unit} available` : 'Out of stock'}</small></div><span className={`priority ${item.quantity > 0 ? 'medium' : 'high'}`}>{item.quantity > 0 ? 'Available' : 'Out'}</span><Link aria-label={`View ${item.name}`} to={`/buyer/shop?pantryId=${item.pantryId}`}><ArrowRight size={17}/></Link></div>) : !error && <div className="empty-state"><p>No data available yet.</p></div>}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Recent pantry activity</h2><p>Recorded updates in your member pantries</p></div><Link to="/buyer/shop">Inventory</Link></div>{activities.slice(0, 5).map(entry => <div className="activity-row" key={entry.id}><span className="activity-dot"/><div><strong>{entry.user}</strong><small>{entry.description} · {entry.time}</small></div></div>)}{!activityLoading && !activityError && !activities.length && <div className="empty-state"><p>No activity recorded yet.</p></div>}</section>
    </div>
  </div>;
}
