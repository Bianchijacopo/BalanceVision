import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Cibo', 'Casa', 'Trasporti', 'Salute', 'Svago', 'Abbigliamento', 'Bolle', 'Stipendi', 'Extra'];

export default function TransactionForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await apiPost('/transactions', {
        type,
        title,
        amount: parseFloat(amount),
        category: customCategory || category,
        date,
        note
      }, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleInitialBalance(e) {
    e.preventDefault();
    try {
      await apiPost('/balance/initial-balance', { amount: parseFloat(amount) }, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="layout">
      <header className="navbar">
        <h1 className="navbar-title">BalanceVision</h1>
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost">Dashboard</button>
      </header>

      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Nuova transazione</h2>
            <p className="card-subtitle">Registra una entrata o una spesa</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${type === 'expense' ? 'toggle-active' : ''}`}
                  onClick={() => setType('expense')}
                >
                  Spesa
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${type === 'income' ? 'toggle-active' : ''}`}
                  onClick={() => setType('income')}
                >
                  Entrata
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="title">Titolo</label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder="Es. Supermercato, Affitto, Stipendio"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">Importo</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">Categoria</label>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                className="form-input"
                placeholder="Oppure inserisci una categoria personalizzata"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="date">Data</label>
              <input
                id="date"
                type="date"
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="note">Nota (opzionale)</label>
              <textarea
                id="note"
                className="form-input"
                placeholder="Note aggiuntive..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              Salva transazione
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}