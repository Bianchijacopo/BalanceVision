import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import OtpPopup from '../components/OtpPopup';

function DefaultAvatarBig() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="40" fill="var(--border)" />
      <circle cx="40" cy="30" r="12" fill="var(--text-secondary)" />
      <ellipse cx="40" cy="62" rx="22" ry="16" fill="var(--text-secondary)" />
    </svg>
  );
}

export default function Profile() {
  const { t, lang } = useLanguage();
  const { currency, supported, changeCurrency } = useCurrency();
  const locale = lang === 'en' ? 'en-US' : 'it-IT';
  const { token, setUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiGet('/auth/profile', token)
      .then(p => { setProfile(p); setUser(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDeleteRequest() {
    setDeleteError('');
    try {
      await apiPost('/auth/send-otp', {}, token);
      setPopupOpen(true);
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  async function handleDeleteConfirm(code) {
    setDeleting(true);
    try {
      await apiDelete('/auth/account?otp=' + encodeURIComponent(code), token);
      setPopupOpen(false);
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.message);
      setPopupOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('Immagine troppo grande (max 4MB)'); return; }
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await apiPut('/auth/avatar', { avatar: base64 }, token);
      setProfile(p => ({ ...p, avatar: base64 }));
      setUser(p => ({ ...p, avatar: base64 }));
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return (
    <div className="layout">
      <Topbar title={t('profile.title')} />
      <main className="main-content narrow"><div className="loading">{t('profile.loading')}</div></main>
    </div>
  );

  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(' ');

  return (
    <div className="layout">
      <Topbar title={t('profile.title')} />
      <main className="main-content narrow">
        <div className="card profile-card">
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ fontSize: 13 }}>
              &larr; {t('profile.backToDashboard')}
            </button>
          </div>
          <div className="card-header">
            <h2 className="card-title gradient-title">{t('profile.profileTitle')}</h2>
            <p className="card-subtitle">{t('profile.profileSubtitle')}</p>
          </div>

          <div className="profile-avatar-section">
            <div className="profile-avatar" onClick={() => fileRef.current?.click()}>
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" className="profile-avatar-img" />
              ) : (
                <DefaultAvatarBig />
              )}
              <div className="profile-avatar-overlay">
                {uploading ? t('profile.uploading') : t('profile.changePhoto')}
              </div>
            </div>
            <input type="file" ref={fileRef} hidden accept="image/*" onChange={handleAvatarChange} />
          </div>
          <div className="profile-info">
            <div className="profile-row">
              <span className="profile-label">{t('profile.name')}</span>
              <span className="profile-value">{profile?.name || '—'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">{t('profile.surname')}</span>
              <span className="profile-value">{profile?.surname || '—'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">{t('profile.email')}</span>
              <span className="profile-value">{profile?.email}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">{t('profile.registrationDate')}</span>
              <span className="profile-value">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString(locale) : '—'}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions" style={{ marginTop: 16 }}>
          <button onClick={() => navigate('/profile/edit')} className="btn btn-primary" style={{ width: '100%' }}>
            {t('profile.editData')}
          </button>
          <button onClick={() => navigate('/profile/change-password')} className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }}>
            {t('profile.changePassword')}
          </button>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: 15 }}>{t('currency.title')}</h3>
            <p className="card-subtitle">{t('currency.subtitle')}</p>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('currency.label')}</label>
              <select className="form-input" value={currency} onChange={e => { changeCurrency(e.target.value); addToast(t('currency.saved'), 'success'); }}>
                {supported.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: 15 }}>{t('profile.deleteAccount')}</h3>
            <p className="card-subtitle" style={{ fontSize: 12 }}>{t('profile.deleteOtpMessage')}</p>
          </div>
          {deleteError && <div className="alert-error">{deleteError}</div>}
          <button onClick={handleDeleteRequest} className="btn btn-danger" style={{ width: '100%' }}>
            {t('profile.deleteAccount')}
          </button>
        </div>

        <OtpPopup
          open={popupOpen}
          title={t('profile.deleteAccount')}
          onConfirm={handleDeleteConfirm}
          onClose={() => setPopupOpen(false)}
          loading={deleting}
        />

      </main>
    </div>
  );
}
