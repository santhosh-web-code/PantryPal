import { useEffect, useState } from 'react';
import { ArrowRight, PackageSearch, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePantry } from '../context/PantryContext.jsx';
import { getDashboardTime } from '../utils/dashboardTime.js';
import { apiRequest } from '../utils/api.js';

export default function BuyerDashboard(){
 const navigate=useNavigate();
 const { items, notifications, markNotificationRead }=usePantry();
 const { user }=useAuth();
 const available=items.filter(item=>item.pantryId==='p1');
 const [dashboardTime, setDashboardTime] = useState(() => getDashboardTime());
 const [pantries,setPantries]=useState([]);
 const [pantryError,setPantryError]=useState('');
 useEffect(() => { const timer = window.setInterval(() => setDashboardTime(getDashboardTime()), 30000); return () => window.clearInterval(timer); }, []);
 useEffect(() => { apiRequest('/api/pantries/member').then(payload=>setPantries(payload.pantries)).catch(error=>setPantryError(error.message)); }, []);
 return <div className="page"><div className="page-heading"><div><p className="eyebrow">{dashboardTime.day} overview · {dashboardTime.date} · {dashboardTime.time}</p><h1>{dashboardTime.greeting}, {user.name}</h1><p>Browse shared inventory and add quantities to pantry items.</p></div><Link className="btn" to="/buyer/shop"><PackageSearch size={18}/> Browse inventory</Link></div><div className="buyer-stat-grid"><div className="buyer-stat"><PackageSearch/><span>Available products<strong>{available.filter(item=>item.quantity>0).length}</strong></span></div><div className="buyer-stat"><Users/><span>Member pantries<strong>{pantries.length}</strong></span></div></div><section className="panel"><div className="panel-heading"><div><h2>Your member pantries</h2><p>Only pantries where you have a member relationship</p></div><Link to="/pantries">View all</Link></div>{pantryError?<p className="form-error" role="alert">{pantryError}</p>:pantries.length?pantries.map(pantry=><div className="buyer-list-row" key={pantry.id}><span className="item-avatar"><PackageSearch size={18}/></span><div><strong>{pantry.name}</strong><small>Shared with you as a member</small></div><Link to="/pantries" aria-label={`View ${pantry.name}`}><ArrowRight size={17}/></Link></div>):<div className="empty-state"><p>No pantries have been shared with you yet.</p><Link to="/pantries">View member pantries</Link></div>}</section><div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Pantry inventory</h2><p>Live stock shared with the owner</p></div><Link to="/buyer/shop">View inventory</Link></div>{available.slice(0,6).map(item=> <div className="buyer-list-row" key={item.id}><span className="item-avatar">{item.name[0]}</span><div><strong>{item.name}</strong><small>{item.quantity>0?`${item.quantity} ${item.unit} available`:'Out of stock'}</small></div><span className={`priority ${item.quantity>0?'medium':'high'}`}>{item.quantity>0?'Available':'Out'}</span><Link aria-label={`View ${item.name}`} to="/buyer/shop"><ArrowRight size={17}/></Link></div>)}</section><section className="panel"><div className="panel-heading"><div><h2>New pantry items</h2><p>Updates from the owner</p></div></div>{notifications.length ? notifications.slice(0,5).map(notification=><button key={notification.id} className={`notification-item ${notification.read?'':'unread'}`} onClick={()=>{ markNotificationRead(notification.id); navigate('/buyer/shop'); }}><span className="notification-dot"/><div><strong>{notification.itemName}</strong><p>{notification.message}</p><small>{notification.time}</small></div></button>) : <div className="empty-state"><p>New owner inventory updates will appear here.</p></div>}</section></div></div>;
}
