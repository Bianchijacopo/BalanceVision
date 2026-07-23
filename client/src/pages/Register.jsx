import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await register(email, password, name);
      navigate('/verify-email', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <h1 className="card-title gradient-title">BalanceVision</h1>
          <p className="card-subtitle">Crea il tuo account</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nome</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Mario Rossi"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
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
              placeholder="Minimo 6 caratteri"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            Registrati
          </button>
        </form>
        <div className="card-footer">
          <span className="text-secondary">Hai gia un account?</span>
          <Link to="/login" className="link">Accedi</Link>
        </div>
      </div>
    </div>
  );
}