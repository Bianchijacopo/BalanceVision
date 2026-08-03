import { useState } from 'react';
import { apiPost } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import OtpPopup from '../components/OtpPopup';

export default function ChangePassword() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError(t('profile.allFieldsRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('profile.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordsDontMatch'));
      return;
    }

    setSaving(true);
    try {
      await apiPost('/auth/send-otp', { purpose: 'cambio_password' }, token);
      setOtpError('');
      setPopupOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(code) {
    setError('');
    setSaving(true);
    try {
      await apiPost('/auth/change-password', { oldPassword, newPassword, otp: code }, token);
      setPopupOpen(false);
      setSuccess(t('profile.passwordChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="layout">
      <Topbar title={t('profile.changePasswordTitle')} />
      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title gradient-title">{t('profile.changePasswordTitle')}</h2>
            <p className="card-subtitle">{t('profile.changePasswordSubtitle')}</p>
          </div>

          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="oldPassword">{t('profile.currentPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input id="oldPassword" type={showOld ? 'text' : 'password'} className="form-input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required style={{ paddingRight: 80 }} />
                <span onClick={() => setShowOld(!showOld)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', userSelect: 'none', zIndex: 1, display: 'flex', alignItems: 'center', padding: '4px' }}
                  title={showOld ? 'Nascondi password' : 'Mostra password'}
                >
                  {showOld ? (
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
            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">{t('profile.newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input id="newPassword" type={showNew ? 'text' : 'password'} className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ paddingRight: 80 }} />
                <span onClick={() => setShowNew(!showNew)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', userSelect: 'none', zIndex: 1, display: 'flex', alignItems: 'center', padding: '4px' }}
                  title={showNew ? 'Nascondi password' : 'Mostra password'}
                >
                  {showNew ? (
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
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">{t('profile.confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ paddingRight: 80 }} />
                <span onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888', userSelect: 'none', zIndex: 1, display: 'flex', alignItems: 'center', padding: '4px' }}
                  title={showConfirm ? 'Nascondi password' : 'Mostra password'}
                >
                  {showConfirm ? (
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
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => navigate('/profile')} className="btn btn-secondary" style={{ flex: 1 }}>
                {t('profile.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {saving ? t('profile.saving') : t('profile.changePasswordBtn')}
              </button>
            </div>
          </form>
        </div>

        <OtpPopup
          open={popupOpen}
          title={t('profile.changePasswordTitle')}
          onConfirm={handleConfirm}
          onClose={() => setPopupOpen(false)}
          loading={saving}
          error={otpError}
        />
      </main>
    </div>
  );
}
