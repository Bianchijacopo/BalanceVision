import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut } from '../context/ApiContext';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { DEFAULT_COLORS, getCategoryColors, setCategoryColor, getUnusedColor } from '../utils/categoryColors';
import { getAllCategories, addCustomCategory, getCustomCategories, catName } from '../utils/categoryManager';
import { useLanguage } from '../context/LanguageContext';

export default function TransactionForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { t, lang } = useLanguage();

  const [type, setType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(getAllCategories()[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [loading, setLoading] = useState(isEdit);

  const showColorPicker = customCategory.trim().length > 0;

  useEffect(() => {
    if (!isEdit) return;
    apiGet('/transactions/' + id, token)
      .then(t => {
        setType(t.type);
        setTitle(t.title);
        setAmount(String(t.amount));
        setCategory(t.category);
        setDate(t.date);
        setNote(t.note || '');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    if (showColorPicker) {
      const colors = getCategoryColors();
      const existing = colors[customCategory.trim()];
      if (existing) {
        setSelectedColor(existing);
      } else {
        setSelectedColor(getUnusedColor(colors));
      }
    }
  }, [customCategory]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess('');
    try {
      const finalCategory = customCategory.trim() || category;
      if (customCategory.trim()) {
        setCategoryColor(customCategory.trim(), selectedColor);
        addCustomCategory(customCategory.trim());
      }
      const payload = { type, title, amount: parseFloat(amount), category: finalCategory, date, note };
      if (isEdit) {
        await apiPut('/transactions/' + id, payload, token);
        setSuccess('Transazione aggiornata con successo.');
      } else {
        await apiPost('/transactions', payload, token);
        setSuccess('Transazione salvata con successo.');
      }
      setTitle('');
      setAmount('');
      setNote('');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return (
    <div className="layout">
      <Topbar title={t('transactionForm.editTx')} />
      <main className="main-content narrow"><div className="loading">Caricamento...</div></main>
    </div>
  );

  return (
    <div className="layout">
      <Topbar title={isEdit ? t('transactionForm.editTx') : t('transactionForm.newTx')} />

      <main className="main-content narrow">
        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && <div className="alert-error">{error}</div>}
            {success && <div className="alert-success">{success}</div>}

            <div className="form-group">
              <label className="form-label">{t('transactionForm.type')}</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${type === 'expense' ? 'toggle-active' : ''}`}
                  onClick={() => setType('expense')}
                >
                  {t('transactionForm.expense')}
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${type === 'income' ? 'toggle-active' : ''}`}
                  onClick={() => setType('income')}
                >
                  {t('transactionForm.income')}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="title">{t('transactionForm.title')}</label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder={t('transactionForm.titlePlaceholder')}
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">{t('transactionForm.amount')}</label>
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
              <label className="form-label" htmlFor="category">{t('transactionForm.category')}</label>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {getAllCategories().map(c => (
                  <option key={c} value={c}>{catName(c, t, lang)}</option>
                ))}
              </select>
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Categoria personalizzata (opzionale)"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              </div>
              {showColorPicker && (
                <div style={{ marginTop: 12 }}>
                  <label className="form-label">{t('transactionForm.category')}</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: color,
                          border: selectedColor === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                          cursor: 'pointer',
                          outline: selectedColor === color ? '2px solid var(--brand)' : 'none',
                          outlineOffset: 2,
                          transition: 'all 0.15s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="date">{t('transactionForm.date')}</label>
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
              <label className="form-label" htmlFor="note">{t('transactionForm.note')}</label>
              <textarea
                id="note"
                className="form-input"
                placeholder={t('transactionForm.notePlaceholder')}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              {isEdit ? t('transactionForm.update') : t('transactionForm.save')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}