import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Boxes, Check, Plus, Trash2, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { apiRequest } from '../utils/api.js';

export default function PantryList() {
  const { user, portal } = useAuth();
  const [pantries, setPantries] = useState([]);
  const [discoverablePantries, setDiscoverablePantries] = useState([]);
  const [requestsByPantry, setRequestsByPantry] = useState({});
  const [resolvingRequest, setResolvingRequest] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningPantryId, setJoiningPantryId] = useState('');
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isOwner = portal === 'owner';

  const loadPantries = useCallback(async () => {
    setLoading(true);
    try {
      if (isOwner) {
        const [pantryPayload, requestsPayload] = await Promise.all([
          apiRequest('/api/pantries/owned'),
          apiRequest('/api/pantries/owned/join-requests')
        ]);
        setPantries(pantryPayload.pantries);
        setRequestsByPantry(requestsPayload.requests.reduce((grouped, request) => {
          grouped[request.pantryId] = [...(grouped[request.pantryId] || []), request];
          return grouped;
        }, {}));
      } else {
        const [memberPayload, discoverPayload] = await Promise.all([
          apiRequest('/api/pantries/member'),
          apiRequest('/api/pantries/discover')
        ]);
        setPantries(memberPayload.pantries);
        setDiscoverablePantries(discoverPayload.pantries);
      }
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => { loadPantries(); }, [loadPantries]);

  const openManagement = async pantry => {
    setSelected(pantry);
    setError('');
    setEmail('');
    setNewOwnerId('');
    if (!isOwner) return;
    try {
      const [membersPayload, requestsPayload] = await Promise.all([
        apiRequest(`/api/pantries/${pantry.id}/members`),
        apiRequest(`/api/pantries/${pantry.id}/join-requests`)
      ]);
      setMembers(membersPayload.members);
      setJoinRequests(requestsPayload.requests);
    } catch (requestError) {
      setMembers([]);
      setJoinRequests([]);
      setError(requestError.message);
    }
  };

  const requestMembership = async pantry => {
    setJoiningPantryId(pantry.id);
    setError('');
    try {
      await apiRequest(`/api/pantries/${pantry.id}/join-requests`, { method: 'POST' });
      setNotice(`Join request sent to ${pantry.ownerName}.`);
      await loadPantries();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setJoiningPantryId('');
    }
  };

  const resolveJoinRequest = async (pantry, member, action) => {
    const requestKey = `${pantry.id}:${member.id}`;
    setResolvingRequest(requestKey);
    setError('');
    try {
      await apiRequest(`/api/pantries/${pantry.id}/join-requests/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action })
      });
      setNotice(action === 'approve' ? `${member.name} joined ${pantry.name}.` : `Join request from ${member.name} rejected.`);
      setRequestsByPantry(previous => ({
        ...previous,
        [pantry.id]: (previous[pantry.id] || []).filter(request => request.id !== member.id)
      }));
      if (selected?.id === pantry.id) await openManagement(pantry);
      await loadPantries();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResolvingRequest('');
    }
  };

  const create = async event => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Pantry name is required.');
      return;
    }
    try {
      await apiRequest('/api/pantries', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      });
      setName('');
      setModal(false);
      setNotice('Pantry created.');
      await loadPantries();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const addMember = async event => {
    event.preventDefault();
    if (!selected || !email.trim()) return;
    try {
      await apiRequest(`/api/pantries/${selected.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });
      setEmail('');
      setNotice('Member added.');
      await openManagement(selected);
      await loadPantries();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeMember = async member => {
    if (!selected || !window.confirm(`Remove ${member.name} from ${selected.name}?`)) return;
    try {
      await apiRequest(`/api/pantries/${selected.id}/members/${member.id}`, { method: 'DELETE' });
      setNotice('Member removed.');
      await openManagement(selected);
      await loadPantries();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const transferOwnership = async event => {
    event.preventDefault();
    const newOwner = members.find(member => member.id === newOwnerId);
    if (!selected || !newOwner || !window.confirm(`Transfer ownership of "${selected.name}" to ${newOwner.name}? You will become a member.`)) return;
    try {
      await apiRequest(`/api/pantries/${selected.id}/transfer-ownership`, {
        method: 'PATCH',
        body: JSON.stringify({ newOwnerId })
      });
      setNotice(`Ownership transferred to ${newOwner.name}. You are now a member of this pantry.`);
      setSelected(null);
      await loadPantries();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deletePantry = async pantry => {
    const memberCount = pantry.memberIds.filter(id => id !== pantry.ownerId).length;
    if (memberCount) {
      await openManagement(pantry);
      setError('This pantry has members. Transfer ownership to one of them before deleting it.');
      return;
    }
    if (!window.confirm(`Delete "${pantry.name}" and its inventory and activity history? This cannot be undone.`)) return;
    try {
      await apiRequest(`/api/pantries/${pantry.id}`, { method: 'DELETE' });
      setNotice('Pantry deleted.');
      await loadPantries();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <div className="page">
    <div className="page-heading">
      <div><p className="eyebrow">{isOwner ? 'Owner workspace' : 'Member workspace'}</p><h1>My Pantries</h1><p>{isOwner ? 'Manage pantries you own and their members.' : 'Pantries shared with you as a member.'}</p></div>
      {isOwner && <button className="btn" onClick={() => { setError(''); setModal(true); }}><Plus size={18}/> Create pantry</button>}
    </div>
    {notice && <div className="toast" role="status">{notice}<button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
    {error && !selected && <div className="form-error" role="alert">{error}</div>}
    {loading ? <p className="empty-state" aria-busy="true">Loading pantries…</p> : pantries.length ? <div className="pantry-grid">
      {pantries.map((pantry, index) => {
        const memberCount = pantry.memberIds.filter(id => id !== pantry.ownerId).length;
        return <article className="pantry-card" key={pantry.id}>
          <div className={`pantry-cover cover-${index % 3}`}><span><Boxes size={28}/></span></div>
          <div className="pantry-card-body">
            <div className="pantry-title"><div><h2>{pantry.name}</h2><span>{isOwner ? 'Owned by you' : 'Shared pantry'}</span></div><ArrowUpRight size={20}/></div>
            {pantry.description && <p>{pantry.description}</p>}
            <div className="pantry-meta"><span><Users size={17}/><strong>{memberCount}</strong> members</span></div>
            <Link to={isOwner ? `/inventory?pantryId=${pantry.id}` : `/buyer/shop?pantryId=${pantry.id}`} className="pantry-open">Open pantry <ArrowUpRight size={16}/></Link>
            {isOwner && <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => openManagement(pantry)}>Manage members</button><button type="button" className="icon-button danger" onClick={() => deletePantry(pantry)} aria-label={`Delete ${pantry.name}`}><Trash2 size={17}/></button></div>}
            {isOwner && (requestsByPantry[pantry.id] || []).length > 0 && <section className="pantry-join-requests" aria-label={`Join requests for ${pantry.name}`}>
              <h3>Join requests <span>{requestsByPantry[pantry.id].length}</span></h3>
              {requestsByPantry[pantry.id].map(member => {
                const requestKey = `${pantry.id}:${member.id}`;
                return <div className="pantry-join-request" key={requestKey}>
                  <div><strong>{member.name}</strong><small>{member.email}</small></div>
                  <div className="pantry-join-actions">
                    <button type="button" className="btn pantry-join-accept" disabled={resolvingRequest === requestKey} onClick={() => resolveJoinRequest(pantry, member, 'approve')}><Check size={15}/> Accept</button>
                    <button type="button" className="btn secondary pantry-join-reject" disabled={resolvingRequest === requestKey} onClick={() => resolveJoinRequest(pantry, member, 'reject')}><X size={15}/> Reject</button>
                  </div>
                </div>;
              })}
            </section>}
          </div>
        </article>;
      })}
    </div> : <div className="empty-state"><Boxes size={28}/><h3>{isOwner ? 'No owned pantries yet' : 'No shared pantries yet'}</h3><p>{isOwner ? 'Create a pantry to start organizing shared inventory.' : 'Browse available pantries below and request access from an owner.'}</p></div>}

    {!isOwner && !loading && <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-heading"><div><h2>Pantries you can join</h2><p>Send a request to the owner to get access to shared inventory.</p></div></div>
      {discoverablePantries.length ? discoverablePantries.map(pantry => <div className="buyer-list-row" key={pantry.id}>
        <span className="item-avatar"><Boxes size={18}/></span>
        <div><strong>{pantry.name}</strong><small>Owner: {pantry.ownerName} · {pantry.memberCount} members{pantry.description ? ` · ${pantry.description}` : ''}</small></div>
        {pantry.status === 'member' ? <Link className="btn secondary" to={`/buyer/shop?pantryId=${pantry.id}`}>Open pantry</Link>
          : pantry.status === 'pending' ? <span className="status low-stock">Request pending</span>
            : <button type="button" className="btn secondary" disabled={joiningPantryId === pantry.id} onClick={() => requestMembership(pantry)}>{joiningPantryId === pantry.id ? 'Requesting…' : 'Request to join'}</button>}
      </div>) : <div className="empty-state"><p>No other pantries are available to join right now.</p></div>}
    </section>}

    {modal && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setModal(false)}><form className="modal small-modal" onSubmit={create}>
      <div className="modal-heading"><div><h2>Create a pantry</h2><p>You will be its owner.</p></div><button type="button" className="icon-button" onClick={() => setModal(false)}>×</button></div>
      <label>Pantry name<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Office Kitchen"/></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn">Create pantry</button></div>
    </form></div>}

    {selected && isOwner && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSelected(null)}><section className="modal small-modal">
      <div className="modal-heading"><div><h2>Manage {selected.name}</h2><p>Only existing members can receive ownership.</p></div><button type="button" className="icon-button" onClick={() => setSelected(null)}>×</button></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="form-grid single" onSubmit={addMember}><label>Add an existing member by email<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"/></label><button className="btn" type="submit">Add member</button></form>
      <div className="member-detail-section"><h3>Current members</h3>{members.length ? members.map(member => <div className="pantry-member-row" key={member.id}><div><strong>{member.name}</strong><small>{member.email}</small></div><button type="button" className="icon-button danger" onClick={() => removeMember(member)} aria-label={`Remove ${member.name}`}><Trash2 size={16}/></button></div>) : <div className="member-inline-empty">No members yet.</div>}</div>
      <div className="member-detail-section"><h3>Pending join requests</h3>{joinRequests.length ? joinRequests.map(member => <div className="pantry-member-row" key={member.id}><div><strong>{member.name}</strong><small>{member.email}</small></div><div className="row-actions"><button type="button" className="icon-button" onClick={() => resolveJoinRequest(selected, member, 'approve')} aria-label={`Approve ${member.name}`}><Check size={17}/></button><button type="button" className="icon-button danger" onClick={() => resolveJoinRequest(selected, member, 'reject')} aria-label={`Reject ${member.name}`}><X size={17}/></button></div></div>) : <div className="member-inline-empty">No pending join requests.</div>}</div>
      {members.length > 0 && <form className="form-grid single ownership-transfer-form" onSubmit={transferOwnership}><label>Transfer ownership to<select value={newOwnerId} onChange={event => setNewOwnerId(event.target.value)}><option value="">Select an existing member</option>{members.map(member => <option key={member.id} value={member.id}>{member.name} ({member.email})</option>)}</select></label><button className="btn" type="submit" disabled={!newOwnerId}>Transfer ownership</button></form>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setSelected(null)}>Close</button></div>
    </section></div>}
  </div>;
}
