import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const { t } = useLanguage();
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
        <p className="welcome-subtitle">{t('login.welcomeSubtitle')}</p>
      </div>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <p className="card-subtitle">{t('login.accessAccount')}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t('login.email')}</label>
            <input
              id="email"
              type="text"
              className="form-input"
              placeholder={t('login.email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <PasswordInput
            id="password"
            label={t('login.password')}
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-full">
            {t('login.submit')}
          </button>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/forgot-password" className="link" style={{ fontSize: 13 }}>{t('login.forgotPw')}</Link>
          </div>
        </form>
        <div className="card-footer">
          <span className="text-secondary">{t('login.noAccount')}</span>
          <Link to="/register" className="link">{t('login.register')}</Link>
        </div>
      </div>
    </div>
  );
}