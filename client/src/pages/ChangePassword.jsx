import { useState } from 'react';
import { apiPost } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import PasswordInput from '../components/PasswordInput';

export default function ChangePassword() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
            <PasswordInput id="oldPassword" label={t('profile.currentPassword')} value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
            <PasswordInput id="newPassword" label={t('profile.newPassword')} value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            <PasswordInput id="confirmPassword" label={t('profile.confirmPassword')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
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
