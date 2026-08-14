import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiGet, apiPost, apiDelete } from '../context/ApiContext';
import Topbar from '../components/Topbar';

export default function Family() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [groupData, inviteData] = await Promise.all([
        apiGet('/family/group', token),
        apiGet('/family/invites', token)
      ]);
      setGroup(groupData.group);
      setMembers(groupData.members || []);
      setInvites(inviteData || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function createGroup(e) {
    e.preventDefault();
    setError('');
    try {
      await apiPost('/family/group', { name: groupName }, token);
      setGroupName('');
      setSuccess(t('family.groupCreated') || 'Gruppo creato!');
      loadData();
    } catch (e) { setError(e.message); }
  }

  async function searchUser() {
    if (searchEmail.trim().length < 3) return;
    setSearching(true);
    try {
      const results = await apiGet(`/family/search?email=${encodeURIComponent(searchEmail.trim())}`, token);
      setSearchResults(results);
    } catch (e) { console.error(e); }
    setSearching(false);
  }

  async function sendInvite(email) {
    setError('');
    setSuccess('');
    try {
      const res = await apiPost('/family/invite', { email }, token);
      setSuccess(res.message);
      setSearchResults([]);
      setSearchEmail('');
    } catch (e) { setError(e.message); }
  }

  async function acceptInvite(id) {
    setError('');
    try {
      await apiPost(`/family/invites/${id}/accept`, {}, token);
      setSuccess(t('family.inviteAccepted') || 'Invito accettato!');
      loadData();
    } catch (e) { setError(e.message); }
  }

  async function rejectInvite(id) {
    setError('');
    try {
      await apiPost(`/family/invites/${id}/reject`, {}, token);
      loadData();
    } catch (e) { setError(e.message); }
  }

  async function removeMember(userId) {
    if (!window.confirm(t('family.confirmRemove') || 'Rimuovere questo membro?')) return;
    try {
      await apiDelete(`/family/members/${userId}`, token);
      loadData();
    } catch (e) { setError(e.message); }
  }

  async function leaveGroup() {
    if (!window.confirm(t('family.confirmLeave') || 'Vuoi lasciare il gruppo?')) return;
    try {
      await apiPost('/family/leave', {}, token);
      setGroup(null);
      setMembers([]);
      loadData();
    } catch (e) { setError(e.message); }
  }

  async function deleteGroup() {
    if (!window.confirm(t('family.confirmDelete') || 'Eliminare il gruppo? Tutti i membri verranno rimossi.')) return;
    try {
      await apiDelete('/family/group', token);
      setGroup(null);
      setMembers([]);
      loadData();
    } catch (e) { setError(e.message); }
  }

  if (loading) return (
    <div className="layout">
      <Topbar title={t('nav.family') || 'Famiglia'} />
      <main className="main-content"><div className="loading">...</div></main>
    </div>
  );

  const isOwner = group && members.find(m => m.id === JSON.parse(atob(token.split('.')[1])).userId)?.role === 'owner';

  return (
    <div className="layout">
      <Topbar title={t('nav.family') || 'Famiglia'} />
      <main className="main-content">
        <div className="section" style={{ maxWidth: 600, margin: '0 auto' }}>
          {error && <div className="alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          {success && <div className="alert-success" style={{ marginBottom: 12 }}>{success}</div>}

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, fontSize: 16 }}>{t('family.pendingInvites') || 'Inviti in attesa'}</h3>
              {invites.map(inv => (
                <div key={inv.id} className="tx-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.group_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {t('family.invitedBy') || 'Invitato da'}: {inv.inviter_name} {inv.inviter_surname}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => acceptInvite(inv.id)}>
                      {t('family.accept') || 'Accetta'}
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => rejectInvite(inv.id)}>
                      {t('family.reject') || 'Rifiuta'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!group ? (
            /* Create group */
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: 16 }}>{t('family.createGroup') || 'Crea Gruppo Famiglia'}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {t('family.createDesc') || 'Crea un gruppo per condividere le tue finanze con familiari e amici.'}
              </p>
              <form onSubmit={createGroup} style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder={t('family.groupName') || 'Nome gruppo'}
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary">{t('family.create') || 'Crea'}</button>
              </form>
            </div>
          ) : (
            /* Group view */
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{group.name}</h3>
                  {isOwner && (
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 11 }} onClick={deleteGroup}>
                      {t('family.deleteGroup') || 'Elimina'}
                    </button>
                  )}
                </div>

                {/* Invite form */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    {t('family.inviteMember') || 'Invita un membro'}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="email@esempio.com"
                      value={searchEmail}
                      onChange={e => { setSearchEmail(e.target.value); setSearchResults([]); }}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchUser())}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={searchUser} disabled={searching}>
                      {searching ? '...' : t('family.search') || 'Cerca'}
                    </button>
                  </div>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    {searchResults.map(u => (
                      <div key={u.id} className="tx-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name} {u.surname}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{u.email}</span>
                        </div>
                        <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => sendInvite(u.email)}>
                          {t('family.invite') || 'Invita'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Members list */}
              <div className="card">
                <h3 style={{ marginTop: 0, fontSize: 16 }}>{t('family.members') || 'Membri'} ({members.length})</h3>
                {members.map(m => (
                  <div key={m.id} className="tx-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name} {m.surname}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{m.email}</span>
                      {m.role === 'owner' && (
                        <span style={{ fontSize: 10, background: 'var(--brand)', color: '#000', padding: '2px 6px', borderRadius: 4, marginLeft: 8, fontWeight: 700 }}>
                          {t('family.owner') || 'Proprietario'}
                        </span>
                      )}
                    </div>
                    {isOwner && m.role !== 'owner' && (
                      <button className="btn-delete-tx" onClick={() => removeMember(m.id)} title={t('family.remove') || 'Rimuovi'}>&times;</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Leave group */}
              {!isOwner && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={leaveGroup}>
                    {t('family.leaveGroup') || 'Lascia il gruppo'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
