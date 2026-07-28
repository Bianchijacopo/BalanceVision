import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
          <div className="form-group">
            <label className="form-label" htmlFor="password">{t('login.password')}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password" type={showPw ? 'text' : 'password'} className="form-input"
                placeholder={t('login.passwordPlaceholder')} value={password}
                onChange={e => setPassword(e.target.value)} style={{ paddingRight: 80 }}
              />
              <span onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', userSelect: 'none', zIndex: 1, display: 'flex', alignItems: 'center', padding: '4px' }}
                title={showPw ? 'Nascondi password' : 'Mostra password'}
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </span>
            </div>
          </div>
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