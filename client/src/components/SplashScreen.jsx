import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const { t, lang, setLang } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setVisible(true);
      if (firstInputRef.current) firstInputRef.current.focus();
    }, 3000);
    return () => clearTimeout(t1);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const LETTERS = ['B','a','l','a','n','c','e','V','i','s','i','o','n'];
  const DELAYS = ['0.0s','0.12s','0.24s','0.36s','0.48s','0.60s','0.72s','0.88s','1.00s','1.12s','1.24s','1.36s','1.48s'];

  return (
    <div className="splash-root">
      <div className="splash-bg-glow" />

      <button
        onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
        className="theme-toggle lang-switch-top"
        title={lang === 'it' ? 'Switch to English' : 'Passa all\'italiano'}
        style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}
      >
        {lang === 'it' ? 'EN' : 'IT'}
      </button>

      <div className={`splash-top ${visible ? 'splash-top--compact' : ''}`}>
        <h1 className="splash-name splash-name--enter">
          {LETTERS.map((l, i) => (
            <span key={i} className={`splash-name-letter${l === 'V' ? ' splash-name-accent' : ''}`} style={{ animationDelay: DELAYS[i] }}>{l}</span>
          ))}
        </h1>

        <p className={`splash-tagline ${visible ? 'splash-tagline--visible' : ''}`}>
          {t('login.welcomeSubtitle')}
        </p>
      </div>

      <div className={`splash-form-wrap ${visible ? 'splash-form-wrap--visible' : ''}`}>
        <div className="card splash-card">
          <div className="card-header">
            <p className="card-subtitle">{t('login.accessAccount')}</p>
          </div>
          <form onSubmit={handleSubmit}>
            {error && <div className="alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="splash-email">{t('login.email')}</label>
              <input
                ref={firstInputRef}
                id="splash-email"
                type="text"
                className="form-input"
                placeholder={t('login.email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="splash-password">{t('login.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="splash-password" type={showPw ? 'text' : 'password'} className="form-input"
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
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? 'Accesso in corso...' : t('login.submit')}
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

        <div className="cookie-banner">
          <span>{t('login.cookieNotice')}</span>
          <Link to="/disclaimer" className="link cookie-banner-link">
            {t('login.cookieRead')}
          </Link>
        </div>
      </div>
    </div>
  );
}
