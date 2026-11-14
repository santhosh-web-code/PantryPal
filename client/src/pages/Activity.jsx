import { History } from 'lucide-react';
import { usePantryActivity } from '../hooks/usePantryActivity.js';

export default function ActivityHistory() {
  const { activities, loading, error } = usePantryActivity();
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Audit log</p><h1>Activity History</h1><p>Review recorded changes made to your authorized pantries.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}<section className="panel activity-panel">{loading ? <p className="empty-state" aria-busy="true">Loading activity…</p> : activities.length ? <div className="activity-timeline">{activities.map(entry => <div className="timeline-row" key={entry.id}><div className="timeline-marker"><History size={17}/></div><div className="timeline-card"><div><div className="activity-user"><span className="mini-avatar">{entry.user?.[0] || '?'}</span><strong>{entry.user}</strong></div><span className="timeline-time">{entry.time}</span></div><p>{entry.description || 'Recorded inventory update'}</p>{entry.note && <div className="timeline-meta"><span>{entry.note}</span></div>}</div></div>)}</div> : !error && <p className="empty-state">No activity recorded yet.</p>}</section></div>;
}
