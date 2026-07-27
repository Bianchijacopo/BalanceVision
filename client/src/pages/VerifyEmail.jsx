import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const { t } = useLanguage();
  const { token, user, setUser, setJustRegistered } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email_verified) navigate('/dashboard');
  }, [user]);

  async function handleVerify() {
    setError('');
    if (!otp || otp.length < 6) { setError(t('verifyEmail.error')); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(t('verifyEmail.success'));
      if (data.user) setUser(data.user);
      setJustRegistered(false);
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setOtp('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.otp) alert('OTP di test: ' + data.otp);
      setSuccess(t('verifyEmail.codeSent'));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <h2 className="card-title gradient-title">{t('verifyEmail.title')}</h2>
          <p className="card-subtitle">
            {t('verifyEmail.title')}: <strong>{user?.email}</strong>
          </p>
        </div>
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}
        <div className="form-group">
          <input
            type="text"
            className="form-input"
            placeholder="_ _ _ _ _ _"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', 'Consolas', monospace" }}
          />
        </div>
        <button onClick={handleVerify} className="btn btn-primary btn-full" disabled={loading || otp.length < 6}>
          {loading ? t('verifyEmail.verifying') : t('verifyEmail.verifyBtn')}
        </button>
        <div className="card-footer" style={{ flexDirection: 'column', gap: 8 }}>
          <button onClick={handleResend} className="link" style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', fontSize: 13 }}>
            {t('verifyEmail.resend')}
          </button>
        </div>
      </div>
    </div>
  );
}
