import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut } from '../context/ApiContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

function formatCurrency(v) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FREQUENZE = [
  { value: 'weekly', label: 'Settimanale' },
  { value: 'monthly', label: 'Mensile' },
  { value: 'yearly', label: 'Annuale' },
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
  const { token } = useAuth();
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
    const method = editId ? 'PUT' : 'POST';
    const url = editId
      ? 'http://localhost:3001/api/recurring/' + editId
      : 'http://localhost:3001/api/recurring';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          amount: parseFloat(form.amount),
          category: form.category || null,
          note: form.note || null,
          frequency: form.frequency,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore durante il salvataggio' }));
        throw new Error(err.error);
      }
      addToast(editId ? 'Transazione ricorrente aggiornata' : 'Transazione ricorrente creata', 'success');
      resetForm();
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch('http://localhost:3001/api/recurring/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore durante l\'eliminazione' }));
        throw new Error(err.error);
      }
      addToast('Transazione ricorrente eliminata', 'success');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      const res = await fetch('http://localhost:3001/api/recurring/process', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore durante la generazione' }));
        throw new Error(err.error);
      }
      addToast('Transazioni generate con successo', 'success');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    }
    setProcessing(false);
  }

  function toggleActive(item) {
    apiPut('/recurring/' + item.id, { active: !item.active }, token)
      .then(() => { addToast(item.active ? 'Disattivata' : 'Attivata', 'success'); load(); })
      .catch(e => addToast(e.message, 'error'));
  }

  return (
    <div className="layout">
      <Topbar title="Transazioni Ricorrenti" />

      <main className="main-content">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Elenco ricorrenti</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
              Nuova ricorrente
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleProcess} disabled={processing}>
              {processing ? 'Generazione...' : 'Genera ora'}
            </button>
          </div>
        </div>

        {loading && <div className="loading">Caricamento...</div>}

        {!loading && data.length === 0 && !showForm && (
          <div className="card-chart" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-secondary" style={{ marginBottom: 16 }}>Nessuna transazione ricorrente impostata</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>Crea la prima ricorrente</button>
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
                      {item.category && <span className="badge">{item.category}</span>}
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {FREQUENZE.find(f => f.value === item.frequency)?.label || item.frequency}
                      </span>
                      {item.start_date && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          Dal {item.start_date.slice(0, 10)}
                        </span>
                      )}
                      {item.end_date && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          al {item.end_date.slice(0, 10)}
                        </span>
                      )}
                      {item.next_date && (
                        <span style={{ fontSize: 11, color: 'var(--brand)' }}>
                          Prossima: {item.next_date.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums',
                      color: item.type === 'income' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {item.type === 'income' ? '+' : '–'}€{formatCurrency(item.amount)}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px', minWidth: 60 }}
                    onClick={() => toggleActive(item)}
                  >
                    {item.active ? 'Attivo' : 'Inattivo'}
                  </button>
                  <button className="btn-icon" onClick={() => handleEdit(item)} title="Modifica">&#9998;</button>
                  <button className="btn-delete" onClick={() => handleDelete(item.id)} title="Elimina">&times;</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 16 }}>
                {editId ? 'Modifica ricorrente' : 'Nuova transazione ricorrente'}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Titolo</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Es. Affitto, Stipendio" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Importo (€)</label>
                  <input className="form-input" type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="expense">Spesa</option>
                    <option value="income">Entrata</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <input className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Es. Casa, Lavoro" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Frequenza</label>
                  <select className="form-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    {FREQUENZE.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nota (opzionale)</label>
                  <input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note..." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data inizio</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data fine (opzionale)</label>
                  <input className="form-input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">
                  {editId ? 'Aggiorna' : 'Crea ricorrente'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Annulla</button>
              </div>
            </form>
          </div>
        )}

        <div className="section" style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Torna alla dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
