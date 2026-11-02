import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../utils/api.js';

export default function Members() {
  const [pantries, setPantries] = useState([]);
  const [pantryId, setPantryId] = useState('');
  const [members, setMembers] = useState([]);
  const [pantriesLoading, setPantriesLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMembers = useCallback(async id => {
    if (!id) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    try {
      const payload = await apiRequest(`/api/pantries/${id}/members`);
      setMembers(payload.members);
      setError('');
    } catch (requestError) {
      setMembers([]);
      setError(requestError.message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest('/api/pantries/owned')
      .then(payload => {
        if (!active) return;
        setPantries(payload.pantries);
        if (payload.pantries.length === 1) setPantryId(payload.pantries[0].id);
      })
      .catch(requestError => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setPantriesLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    loadMembers(pantryId);
  }, [pantryId, loadMembers]);

  const addMember = async event => {
    event.preventDefault();
    if (!pantryId || !email.trim()) return;
    try {
      const payload = await apiRequest(`/api/pantries/${pantryId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });
      setEmail('');
      setModal(false);
      setNotice(`${payload.member.name} added to ${pantries.find(pantry => pantry.id === pantryId)?.name}.`);
      await loadMembers(pantryId);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeMember = async member => {
    const pantry = pantries.find(candidate => candidate.id === pantryId);
    if (!window.confirm(`Remove ${member.name} from ${pantry?.name || 'this pantry'}?`)) return;
    try {
      await apiRequest(`/api/pantries/${pantryId}/members/${member.id}`, { method: 'DELETE' });
      setNotice(`${member.name} was removed from the pantry.`);
      await loadMembers(pantryId);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const selectedPantry = pantries.find(pantry => pantry.id === pantryId);

  return <div className="page members-page">
    <div className="page-heading">
      <div><p className="eyebrow">Shared access</p><h1>Members</h1><p>See the accounts that have been added to your owned pantries.</p></div>
      <button className="btn" type="button" disabled={!pantryId} onClick={() => { setError(''); setModal(true); }}><Plus size={18}/> Add member</button>
    </div>
    {notice && <div className="toast" role="status">{notice}<button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
    {error && !modal && <div className="form-error" role="alert">{error}</div>}
    {pantriesLoading ? <p className="empty-state" aria-busy="true">Loading your pantries…</p> : !pantries.length ? <div className="empty-state"><Users size={28}/><h3>No owned pantries yet</h3><p>Create a pantry before managing its members.</p><Link className="btn secondary" to="/pantries">Open my pantries</Link></div> : <>
      {pantries.length > 1 && <label>Pantry<select aria-label="Select an owned pantry" value={pantryId} onChange={event => { setPantryId(event.target.value); setError(''); setNotice(''); }}><option value="">Select a pantry</option>{pantries.map(pantry => <option key={pantry.id} value={pantry.id}>{pantry.name}</option>)}</select></label>}
      {selectedPantry && <div className="member-page-summary"><div><span>Selected pantry</span><strong>{selectedPantry.name}</strong></div><div><span>Members added</span><strong>{members.length}</strong></div></div>}
      {pantries.length > 1 && !pantryId ? <div className="empty-state"><Users size={28}/><h3>Select a pantry</h3><p>Choose an owned pantry to see who has Member access.</p></div> : membersLoading ? <p className="empty-state" aria-busy="true">Loading pantry members…</p> : members.length ? <div className="members-grid">{members.map(member => <article className="member-card" key={member.id}>
        <div className="member-avatar">{member.profileImage ? <img src={member.profileImage} alt={`${member.name} profile`}/> : member.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div className="member-info"><h2>{member.name}</h2><p>{member.email}</p><span className="role member">Member</span></div>
        <button type="button" className="icon-button danger" onClick={() => removeMember(member)} aria-label={`Remove ${member.name} from ${selectedPantry?.name}`}><Trash2 size={18}/></button>
      </article>)}</div> : <div className="empty-state"><Users size={28}/><h3>No members in {selectedPantry?.name}</h3><p>Add an existing registered account to give it Member access to this pantry.</p></div>}
    </>}
    {modal && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setModal(false)}><form className="modal small-modal" onSubmit={addMember}>
      <div className="modal-heading"><div><h2>Add member</h2><p>Add an existing account to {selectedPantry?.name}.</p></div><button type="button" className="icon-button" onClick={() => setModal(false)} aria-label="Close"> <X/></button></div>
      <label>Member email<input autoFocus type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" required/></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn" type="submit">Add member</button></div>
    </form></div>}
  </div>;
}
