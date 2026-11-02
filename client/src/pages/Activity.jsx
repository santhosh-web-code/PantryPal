import { History } from 'lucide-react';
import { usePantry } from '../context/PantryContext.jsx';

export default function ActivityHistory() {
  const { activities: activity } = usePantry();
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Audit log</p><h1>Activity History</h1><p>Review every change made to your pantry inventory.</p></div></div><section className="panel activity-panel"><div className="activity-timeline">{activity.map((entry,index)=><div className="timeline-row" key={entry.id}><div className="timeline-marker"><History size={17}/></div><div className="timeline-card"><div><div className="activity-user"><span className="mini-avatar">{entry.user[0]}</span><strong>{entry.user}</strong></div><span className="timeline-time">{entry.time}</span></div><p><strong>{entry.action || (entry.changeAmount>0?'Added':'Used')}</strong> <strong>{entry.item}</strong></p><div className="timeline-meta"><span className={entry.changeAmount>0?'positive':'negative'}>{entry.changeAmount>0?'+':''}{entry.changeAmount}</span><span>{entry.note}</span></div></div></div>)}</div></section></div>;
}
