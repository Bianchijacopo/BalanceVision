import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

export default function Goals() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { fmt } = useCurrency();
  const [category, setCategory] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet('/goals', token);
      setData(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  function resetForm() {
    setShowForm(false);
    setEditId(null);
    setName('');
    setTarget('');
    setCurrent('');
    setDeadline('');
    setCategory('');
  }

  async function handleSave(e) {
    e.preventDefault();
    const method = editId ? 'PUT' : 'POST';
    const url = editId
      ? 'http://localhost:3001/api/goals/' + editId
      : 'http://localhost:3001/api/goals';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          name,
          target_amount: parseFloat(target),
          current_amount: parseFloat(current || '0'),
          deadline: deadline || '',
          category: category || '',
        }),
      });
      if (res.ok) {
        resetForm();
        load();
      }
    } catch (e) { console.error(e); }
  }

  async function handleDelete(id) {
    try {
      await fetch('http://localhost:3001/api/goals/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token },
      });
      load();
    } catch (e) { console.error(e); }
  }

  function handleEdit(g) {
    setEditId(g.id);
    setName(g.name);
    setTarget(String(g.target_amount));
    setCurrent(String(g.current_amount));
    setDeadline(g.deadline || '');
    setCategory(g.category || '');
    setShowForm(true);
  }

  async function syncBalance(goalId) {
    if (!data?.currentBalance) return;
    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) return;
    try {
      await fetch('http://localhost:3001/api/goals/' + goalId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          name: goal.name,
          target_amount: goal.target_amount,
          current_amount: data.currentBalance,
          deadline: goal.deadline || '',
          category: goal.category || '',
        }),
      });
      load();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="layout">
      <Topbar title={t('goals.title')} />

      <main className="main-content">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h3 className="section-title">{t('goals.yourGoals')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
            {t('goals.newGoal')}
          </button>
        </div>

        {data?.currentBalance != null && (
          <div className="insights-grid" style={{ marginBottom: 20 }}>
            <div className="insight-card">
              <div className="insight-label">{t('goals.currentBalance')}</div>
              <div className="insight-value">{fmt(data.currentBalance)}</div>
            </div>
            <div className="insight-card">
              <div className="insight-label">{t('goals.goals')}</div>
              <div className="insight-value">{data.goals.length}</div>
            </div>
            <div className="insight-card">
              <div className="insight-label">{t('goals.totalSaved')}</div>
              <div className="insight-value">
                {fmt(data.goals.reduce((s, g) => s + g.current_amount, 0))}
              </div>
            </div>
          </div>
        )}

        {loading && <div className="loading">{t('goals.loading')}</div>}

        {!loading && data?.goals.length === 0 && !showForm && (
          <div className="card-chart" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-secondary" style={{ marginBottom: 16 }}>{t('goals.noGoals')}</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>{t('goals.createFirst')}</button>
          </div>
        )}

        {!loading && data?.goals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.goals.map(g => {
              const pct = Math.round(g.progress);
              const achieved = pct >= 100;
              return (
                <div key={g.id} className="card-chart" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14,
                      background: achieved ? 'var(--success-light)' : 'var(--brand-light)',
                      color: achieved ? 'var(--success)' : 'var(--brand)',
                      flexShrink: 0,
                    }}>
                      {pct}%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{g.name}</div>
                      {g.category && <span className="badge">{g.category}</span>}
                      {g.deadline && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                          {t('goals.deadline')} {g.deadline}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(g.current_amount)}
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 13 }}>
                          {' / '}{fmt(g.target_amount)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {achieved ? t('goals.achieved') : t('goals.remaining', { amount: fmt(g.remaining) })}
                      </div>
                    </div>
                    <button className="btn-icon" onClick={() => handleEdit(g)} title={t('goals.editGoal')}>&#9998;</button>
                    <button className="btn-delete" onClick={() => handleDelete(g.id)} title={t('goals.delete')}>&times;</button>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                    <div style={{
                      width: Math.min(pct, 100) + '%', height: '100%', borderRadius: 4,
                      background: achieved ? 'var(--success)' : 'var(--brand)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  {!achieved && (
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}
                      onClick={() => syncBalance(g.id)}>
                      {t('goals.updateFromBalance')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 16 }}>
                {editId ? t('goals.editGoal') : t('goals.newGoal')}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">{t('goals.name')}</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)}
                  placeholder={t('goals.namePlaceholder')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('goals.targetAmount')}</label>
                  <input className="form-input" type="number" step="0.01" min="0.01" value={target}
                    onChange={e => setTarget(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('goals.currentAmount')}</label>
                  <input className="form-input" type="number" step="0.01" min="0" value={current}
                    onChange={e => setCurrent(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('goals.deadlineOptional')}</label>
                  <input className="form-input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('goals.categoryOptional')}</label>
                  <input className="form-input" value={category} onChange={e => setCategory(e.target.value)}
                    placeholder={t('goals.categoryPlaceholder')} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">
                  {editId ? t('goals.update') : t('goals.create')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>{t('goals.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        <div className="section" style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            {t('goals.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}