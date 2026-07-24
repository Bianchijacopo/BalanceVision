import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-center">
      <div className="welcome-section">
        <h1 className="welcome-title gradient-title">BalanceVision</h1>
        <p className="welcome-subtitle">Benvenuto su BalanceVision. Il tuo controllo finanziario, semplice e professionale.</p>
      </div>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <p className="card-subtitle">Accedi al tuo account</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="text"
              className="form-input"
              placeholder="mario@esempio.it"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Inserisci la password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            Accedi
          </button>
        </form>
        <div className="card-footer">
          <span className="text-secondary">Non hai un account?</span>
          <Link to="/register" className="link">Registrati</Link>
        </div>
      </div>
    </div>
  );
}