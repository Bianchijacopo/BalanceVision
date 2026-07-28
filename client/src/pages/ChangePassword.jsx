import { useState } from 'react';
import { apiPost } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

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
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

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
      await apiPost('/auth/change-password', { oldPassword, newPassword }, token);
      setSuccess(t('profile.passwordChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err) {
      setError(err.message);
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
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, color: '#888', userSelect: 'none', zIndex: 1 }}
                >{showOld ? 'NASCONDI' : 'MOSTRA'}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">{t('profile.newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input id="newPassword" type={showNew ? 'text' : 'password'} className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ paddingRight: 80 }} />
                <span onClick={() => setShowNew(!showNew)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, color: '#888', userSelect: 'none', zIndex: 1 }}
                >{showNew ? 'NASCONDI' : 'MOSTRA'}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">{t('profile.confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ paddingRight: 80 }} />
                <span onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, color: '#888', userSelect: 'none', zIndex: 1 }}
                >{showConfirm ? 'NASCONDI' : 'MOSTRA'}</span>
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
      </main>
    </div>
  );
}
