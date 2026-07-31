import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Disclaimer() {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="page-center" style={{ padding: '40px 16px' }}>
      <button
        onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
        className="theme-toggle lang-switch-top"
        title={lang === 'it' ? 'Switch to English' : 'Passa all\'italiano'}
        style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}
      >
        {lang === 'it' ? 'EN' : 'IT'}
      </button>
      <div className="card" style={{ maxWidth: 640, width: '100%' }}>
        <div className="card-header">
          <h1 className="card-title gradient-title">BalanceVision</h1>
          <p className="card-subtitle">{t('disclaimer.title')}</p>
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <p className="text-secondary" style={{ marginBottom: 12 }}>
            {t('disclaimer.intro')}
          </p>

          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 6px 0' }}>{t('disclaimer.emailTitle')}</h3>
          <p className="text-secondary" style={{ margin: 0 }}>{t('disclaimer.emailText')}</p>

          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 6px 0' }}>{t('disclaimer.dataTitle')}</h3>
          <p className="text-secondary" style={{ margin: 0 }}>{t('disclaimer.dataText')}</p>

          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 6px 0' }}>{t('disclaimer.privacyTitle')}</h3>
          <p className="text-secondary" style={{ margin: 0 }}>{t('disclaimer.privacyText')}</p>

          <h3 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 6px 0' }}>{t('disclaimer.cookiesTitle')}</h3>
          <p className="text-secondary" style={{ margin: 0 }}>{t('disclaimer.cookiesText')}</p>
        </div>

        <button onClick={() => navigate('/login')} className="btn btn-primary btn-full" style={{ marginTop: 24 }}>
          {t('disclaimer.accept')}
        </button>

        <div className="card-footer">
          <span className="text-secondary">{t('disclaimer.backTo')}</span>
          <Link to="/login" className="link">{t('disclaimer.loginLink')}</Link>
        </div>
      </div>
    </div>
  );
}
