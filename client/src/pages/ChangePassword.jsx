import { useState } from 'react';
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
    if (newPassword.length < 6) {
      setError(t('profile.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordsDontMatch'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
              <input id="oldPassword" type="password" className="form-input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">{t('profile.newPassword')}</label>
              <input id="newPassword" type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">{t('profile.confirmPassword')}</label>
              <input id="confirmPassword" type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
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
