import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';

export default function Advice() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/advice', token)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="layout">
      <header className="navbar">
        <h1 className="navbar-title">BalanceVision</h1>
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost">Dashboard</button>
      </header>

      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Consigli finanziari</h2>
            <p className="card-subtitle">Analisi personalizzata basata sulle tue transazioni</p>
          </div>

          {loading && <p className="text-secondary">Analisi in corso...</p>}

          {data && data.summary && (
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Saldo</span>
                <span className="summary-value">\u20AC{data.summary.current_balance.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Entrate totali</span>
                <span className="summary-value text-success">\u20AC{data.summary.total_income.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Spese totali</span>
                <span className="summary-value text-danger">\u20AC{data.summary.total_expenses.toFixed(2)}</span>
              </div>
            </div>
          )}

          {data && data.advice && (
            <ul className="advice-list">
              {data.advice.map((tip, i) => (
                <li key={i} className="advice-item">{tip}</li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}