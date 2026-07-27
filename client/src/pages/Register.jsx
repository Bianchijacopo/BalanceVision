import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const { t } = useLanguage();
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
          <p className="card-subtitle">{t('register.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="name">{t('register.name')}</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder={t('register.namePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t('register.email')}</label>
            <input
              id="email"
              type="text"
              className="form-input"
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">{t('register.password')}</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder={t('register.passwordHint')}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            {t('register.submit')}
          </button>
        </form>
        <div className="card-footer">
          <span className="text-secondary">{t('register.haveAccount')}</span>
          <Link to="/login" className="link">{t('register.login')}</Link>
        </div>
      </div>
    </div>
  );
}