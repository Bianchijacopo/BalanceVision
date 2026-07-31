import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { apiUrl } from '../context/ApiContext';
import OtpPopup from '../components/OtpPopup';

export default function ForgotPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [popupOpen, setPopupOpen] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendOtp(e) {
    e.preventDefault();
    setError(''); setMsg('');
    setSending(true);
    try {
      const res = await fetch(apiUrl('/auth/forgot-send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.otp) {
        setOtp(json.otp);
        setPopupOpen(true);
      } else {
        setMsg(t('forgotPassword.codeSent') + ' ' + email);
        setStep(2);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  function handleConfirm(code) {
    setPopupOpen(false);
    setOtp(code);
    setStep(3);
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await fetch(apiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      navigate('/login');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <h1 className="card-title gradient-title">BalanceVision</h1>
          <p className="card-subtitle">
            {step === 1 && t('forgotPassword.title1')}
            {step === 2 && t('forgotPassword.title2')}
            {step === 3 && t('forgotPassword.title3')}
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {msg && <div className="alert-success">{msg}</div>}

        {step === 1 && (
          <form onSubmit={sendOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">{t('forgotPassword.email')}</label>
              <input id="email" type="text" className="form-input"
                placeholder={t('forgotPassword.emailPlaceholder')} value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
              {sending ? t('forgotPassword.sending') : t('forgotPassword.sendCode')}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">{t('forgotPassword.newPasswordTitle')}</label>
              <div style={{ position: 'relative' }}>
                <input id="password" type={showPw ? 'text' : 'password'} className="form-input"
                  placeholder={t('forgotPassword.newPasswordPlaceholder')} value={password}
                  onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 80 }}
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
              {t('forgotPassword.changePassword')}
            </button>
          </form>
        )}

        <div className="card-footer">
          <span className="text-secondary">{t('forgotPassword.backToLogin')}</span>
          <Link to="/login" className="link">{t('forgotPassword.loginLink')}</Link>
        </div>
      </div>

      <OtpPopup
        open={popupOpen}
        otp={otp}
        title={t('forgotPassword.title2')}
        onConfirm={handleConfirm}
        onClose={() => setPopupOpen(false)}
      />
    </div>
  );
}
