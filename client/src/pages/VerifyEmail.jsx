import { useState, useEffect } from 'react';
import { apiPost } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import OtpPopup from '../components/OtpPopup';

export default function VerifyEmail() {
  const { t } = useLanguage();
  const { token, setUser } = useAuth();
  const navigate = useNavigate();
  const [popupOpen, setPopupOpen] = useState(false);
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiPost('/auth/send-otp', {}, token);
        if (cancelled) return;
        setOtpError('');
        setPopupOpen(true);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleConfirm(code) {
    setError('');
    setLoading(true);
    try {
      const data = await apiPost('/auth/verify-otp', { otp: code }, token);
      if (data.user) setUser(data.user);
      setPopupOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <h2 className="card-title gradient-title">{t('verifyEmail.title')}</h2>
          <p className="card-subtitle">{t('verifyEmail.subtitle')}</p>
        </div>
        {error && <div className="alert-error">{error}</div>}
        <p className="text-secondary" style={{ fontSize: 13, textAlign: 'center' }}>
          {t('verifyEmail.popupHint')}
        </p>
      </div>

      <OtpPopup
        open={popupOpen}
        title={t('verifyEmail.title')}
        onConfirm={handleConfirm}
        onClose={() => setPopupOpen(false)}
        loading={loading}
        error={otpError}
      />
    </div>
  );
}
