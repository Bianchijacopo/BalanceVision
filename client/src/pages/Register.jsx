import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await register(email, password, name, surname);
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
          <div className="form-row" style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
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
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="surname">{t('register.surname')}</label>
              <input
                id="surname"
                type="text"
                className="form-input"
                placeholder={t('register.surnamePlaceholder')}
                value={surname}
                onChange={e => setSurname(e.target.value)}
              />
            </div>
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
            <div style={{ position: 'relative' }}>
              <input id="password" type={showPw ? 'text' : 'password'} className="form-input"
                placeholder={t('register.passwordHint')} value={password}
                onChange={e => setPassword(e.target.value)} style={{ paddingRight: 80 }}
              />
              <span onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, color: '#888', userSelect: 'none', zIndex: 1 }}
              >{showPw ? 'NASCONDI' : 'MOSTRA'}</span>
            </div>
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