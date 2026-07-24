import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

export default function Advice() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiMode, setAiMode] = useState(false);

  useEffect(() => {
    apiGet('/advice', token)
      .then(res => { setData(res); setAiMode(res?._ai || false); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="layout">
      <Topbar title="Consigli finanziari" />

      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Consigli finanziari</h2>
            <p className="card-subtitle">Analisi personalizzata basata sulle tue transazioni</p>
            {data && (
              <span className={`badge ${aiMode ? 'badge-ai' : ''}`}
                style={{ fontSize: 11, marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: aiMode ? 'var(--brand)' : 'var(--bg-muted)', color: aiMode ? 'var(--btn-primary-text)' : 'var(--text-tertiary)' }}>
                {aiMode ? 'AI attiva' : 'Regole base'}
              </span>
            )}
          </div>

          {loading && <div className="loading">Analisi in corso...</div>}

          {data && data.summary && (
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Saldo</span>
                <span className="summary-value">€{data.summary.current_balance.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Entrate totali</span>
                <span className="summary-value text-success">€{data.summary.total_income.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Spese totali</span>
                <span className="summary-value text-danger">€{data.summary.total_expenses.toFixed(2)}</span>
              </div>
            </div>
          )}

          {data && data.advice && data.advice.length > 0 && (
            <ul className="advice-list">
              {data.advice.map((tip, i) => (
                <li key={i} className="advice-item">{tip}</li>
              ))}
            </ul>
          )}

          {data && data.advice && data.advice.length === 0 && (
            <p className="text-secondary text-center">Nessun consiglio disponibile. Aggiungi transazioni per ricevere suggerimenti.</p>
          )}
        </div>

        {!aiMode && (
          <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: 24 }}>
            <p className="text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>
              Per consigli AI, imposta la chiave <strong>Groq</strong> (gratis).
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              1. Vai su <strong>console.groq.com</strong> e registrati<br />
              2. Genera una chiave API<br />
              3. Apri <code>.env</code> nella cartella del progetto e aggiungi:<br />
              <code>GROQ_API_KEY=la_tua_chiave</code><br />
              4. Riavvia l'app
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Torna alla dashboard
          </button>
        </div>
      </main>
    </div>
  );
}