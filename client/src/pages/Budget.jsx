import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { getCategoryColors } from '../utils/categoryColors';
import { getAllCategories, catName } from '../utils/categoryManager';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

function fmt(v) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Budget() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { fmt } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editCategory, setEditCategory] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const categoryColors = getCategoryColors();

  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  async function loadBudgets() {
    setLoading(true);
    try {
      const res = await apiGet('/budgets?month=' + currentMonth, token);
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { loadBudgets(); }, [token]);

  const existingCategories = new Set((data?.budgets || []).map(b => b.category));

  async function handleSave(category) {
    try {
      const res = await fetch('http://localhost:3001/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ category, month: currentMonth, amount: parseFloat(editAmount) })
      });
      if (res.ok) {
        setEditCategory(null);
        setEditAmount('');
        loadBudgets();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id) {
    try {
      await fetch('http://localhost:3001/api/budgets/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      loadBudgets();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="layout">
      <Topbar title={t('budgets.title')} />

      <main className="main-content">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h3 className="section-title">{monthName}</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {data ? fmt(data.totalBudget) + ' ' + t('budgets.totalBudget') : ''}
          </span>
        </div>

        {loading && <div className="loading">{t('budgets.loading')}</div>}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data?.budgets || []).map(b => {
              const bPct = Math.round(b.progress);
              const bRem = 100 - bPct;
              const bColor = b.spent > b.amount ? 'var(--danger)' : bRem >= 40 ? 'var(--brand)' : bRem >= 20 ? 'var(--warning)' : 'var(--danger)';
              return (
                <div key={b.id} className="card-chart" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: categoryColors[b.category] || '#6366F1', flexShrink: 0
                    }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{catName(b.category, t, lang)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(b.spent)}
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 12 }}>
                        {' / '}{fmt(b.amount)}
                      </span>
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, minWidth: 48, textAlign: 'right',
                      color: b.spent > b.amount ? 'var(--danger)' : bRem >= 40 ? 'var(--success)' : bRem >= 20 ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {b.spent > b.amount ? '+' + (bPct - 100) + '%' : bRem + t('budgets.budgetRemaining')}
                    </span>
                    <button className="btn-icon" onClick={() => { setEditCategory(b); setEditAmount(String(b.amount)); }} title={t('budgets.editBudget')}>&#9998;</button>
                    <button className="btn-delete" onClick={() => handleDelete(b.id)} title={t('budgets.deleteBudget')}>&times;</button>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 3, background: 'var(--bg-muted)',
                    overflow: 'hidden', border: '1px solid var(--border-light)'
                  }}>
                    <div style={{
                      width: Math.min(bPct, 100) + '%', height: '100%',
                      borderRadius: 3,
                      background: bColor,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  {editCategory?.id === b.id && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-input"
                        style={{ width: 160, padding: '6px 10px', fontSize: 13 }}
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleSave(b.category)}>{t('budgets.save')}</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditCategory(null)}>{t('budgets.cancel')}</button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="card-chart" style={{ padding: '16px 20px' }}>
              <h3 className="chart-title" style={{ marginBottom: 12 }}>{t('budgets.addBudget')}</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {getAllCategories().filter(c => !existingCategories.has(c)).map(cat => (
                  <button
                    key={cat}
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setEditCategory(cat); setEditAmount(''); }}
                  >
                    {catName(cat, t, lang)}
                  </button>
                ))}
              </div>
              {typeof editCategory === 'string' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 80 }}>{catName(editCategory, t, lang)}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    style={{ width: 160, padding: '6px 10px', fontSize: 13 }}
                    placeholder={t('budgets.budgetPlaceholder')}
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => handleSave(editCategory)}>{t('budgets.create')}</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditCategory(null)}>{t('budgets.cancel')}</button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="section" style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            {t('budgets.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}