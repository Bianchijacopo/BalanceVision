import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../context/ApiContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { catName } from '../utils/categoryManager';

const FREQUENZE = [
  { value: 'weekly', label: 'weekly' },
  { value: 'monthly', label: 'monthly' },
  { value: 'yearly', label: 'yearly' },
];

const INITIAL_FORM = {
  type: 'expense',
  title: '',
  amount: '',
  category: '',
  note: '',
  frequency: 'monthly',
  start_date: '',
  end_date: '',
};

export default function Recurring() {
  const { t, lang } = useLanguage();
  const { token } = useAuth();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [processing, setProcessing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet('/recurring', token);
      setData(res || []);
    } catch (e) {
      addToast(e.message, 'error');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  function resetForm() {
    setShowForm(false);
    setEditId(null);
    setForm({ ...INITIAL_FORM });
  }

  function handleEdit(item) {
    setEditId(item.id);
    setForm({
      type: item.type,
      title: item.title,
      amount: String(item.amount),
      category: item.category || '',
      note: item.note || '',
      frequency: item.frequency,
      start_date: item.start_date ? item.start_date.slice(0, 10) : '',
      end_date: item.end_date ? item.end_date.slice(0, 10) : '',
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const body = {
      type: form.type,
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category || null,
      note: form.note || null,
      frequency: form.frequency,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    try {
      if (editId) {
        await apiPut('/recurring/' + editId + '?lang=' + lang, body, token);
      } else {
        await apiPost('/recurring?lang=' + lang, body, token);
      }
      addToast(editId ? t('recurring.toastUpdated') : t('recurring.toastCreated'), 'success');
      resetForm();
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  async function handleDelete(id) {
    try {
      await apiDelete('/recurring/' + id + '?lang=' + lang, token);
      addToast(t('recurring.toastDeleted'), 'success');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      await apiPost('/recurring/process', {}, token);
      addToast(t('recurring.toastGenerated'), 'success');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
    setProcessing(false);
  }

  function toggleActive(item) {
    apiPut('/recurring/' + item.id + '?lang=' + lang, { active: !item.active }, token)
      .then(() => { addToast(item.active ? t('recurring.toastDeactivated') : t('recurring.toastActivated'), 'success'); load(); })
      .catch(e => addToast(e.message, 'error'));
  }

  return (
    <div className="layout">
      <Topbar title={t('recurring.title')} />

      <main className="main-content">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h3 className="section-title">{t('recurring.list')}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
              {t('recurring.new')}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleProcess} disabled={processing}>
              {processing ? t('recurring.generating') : t('recurring.generateNow')}
            </button>
          </div>
        </div>

        {loading && <div className="loading">{t('recurring.loading')}</div>}

        {!loading && data.length === 0 && !showForm && (
          <div className="card-chart" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-secondary" style={{ marginBottom: 16 }}>{t('recurring.noRecurring')}</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>{t('recurring.createFirst')}</button>
          </div>
        )}

        {!loading && data.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.map(item => (
              <div key={item.id} className="card-chart" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: item.type === 'income' ? 'var(--success)' : 'var(--danger)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {item.category && <span className="badge">{catName(item.category, t, lang)}</span>}
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {t('recurring.' + (FREQUENZE.find(f => f.value === item.frequency)?.label || item.frequency))}
                      </span>
                      {item.start_date && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {t('recurring.from')} {item.start_date.slice(0, 10)}
                        </span>
                      )}
                      {item.end_date && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {t('recurring.to')} {item.end_date.slice(0, 10)}
                        </span>
                      )}
                      {item.next_date && (
                        <span style={{ fontSize: 11, color: 'var(--brand)' }}>
                          {t('recurring.next')} {item.next_date.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums',
                      color: item.type === 'income' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {item.type === 'income' ? '+' : '–'}{fmt(item.amount)}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px', minWidth: 60 }}
                    onClick={() => toggleActive(item)}
                  >
                    {item.active ? t('recurring.active') : t('recurring.inactive')}
                  </button>
                  <button className="btn-icon" onClick={() => handleEdit(item)} title={t('recurring.edit')}>&#9998;</button>
                  <button className="btn-delete" onClick={() => handleDelete(item.id)} title={t('recurring.delete')}>&times;</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 16 }}>
                {editId ? t('recurring.editTitle') : t('recurring.newTitle')}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('recurring.titleLabel')}</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('recurring.titlePlaceholder')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('recurring.amount')}</label>
                  <input className="form-input" type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('recurring.type')}</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="expense">{t('recurring.expense')}</option>
                    <option value="income">{t('recurring.income')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('recurring.category')}</label>
                  <input className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder={t('recurring.categoryPlaceholder')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('recurring.frequency')}</label>
                  <select className="form-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    {FREQUENZE.map(f => <option key={f.value} value={f.value}>{t('recurring.' + f.value)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('recurring.note')}</label>
                  <input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={t('recurring.notePlaceholder')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('recurring.startDate')}</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('recurring.endDate')}</label>
                  <input className="form-input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">
                  {editId ? t('recurring.update') : t('recurring.create')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>{t('recurring.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        <div className="section" style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            {t('recurring.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}
