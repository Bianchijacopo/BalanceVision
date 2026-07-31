import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiGet, apiPost, apiPut } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import OtpPopup from '../components/OtpPopup';

export default function EditProfile() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [popupOpen, setPopupOpen] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    apiGet('/auth/profile', token)
      .then(p => {
        setName(p.name || '');
        setSurname(p.surname || '');
        setEmail(p.email);
        setOriginalEmail(p.email);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setError('');
    setSuccess('');
    if (!name.trim()) { setError(t('profile.nameRequired')); return; }

    setSaving(true);
    try {
      if (email !== originalEmail) {
        const res = await apiPost('/auth/send-otp', {}, token);
        setOtp(res.otp);
        setPopupOpen(true);
        return;
      }

      await apiPut('/auth/profile', { name: name.trim(), surname: surname.trim() }, token);
      setSuccess(t('profile.profileUpdated'));
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyOtp(code) {
    setError('');
    setSaving(true);
    try {
      await apiPost('/auth/verify-otp', { otp: code, newEmail: email }, token);
      await apiPut('/auth/profile', { name: name.trim(), surname: surname.trim() }, token);
      setPopupOpen(false);
      setSuccess(t('profile.profileUpdated'));
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err) {
      setError(err.message);
      setPopupOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="layout">
      <Topbar title={t('profile.editProfileTitle')} />
      <main className="main-content narrow"><div className="loading">{t('profile.loading')}</div></main>
    </div>
  );

  return (
    <div className="layout">
      <Topbar title={t('profile.editProfileTitle')} />
      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title gradient-title">{t('profile.editProfileTitle')}</h2>
            <p className="card-subtitle">{t('profile.editProfileSubtitle')}</p>
          </div>

          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">{t('profile.name')}</label>
              <input id="name" type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="surname">{t('profile.surname')}</label>
              <input id="surname" type="text" className="form-input" value={surname} onChange={e => setSurname(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">{t('profile.email')}</label>
              <input id="email" type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
              {email !== originalEmail && (
                <p className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>
                  {t('profile.emailChangeOtp')}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => navigate('/profile')} className="btn btn-secondary" style={{ flex: 1 }}>
                {t('profile.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {saving ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </div>
          </form>
        </div>

        <OtpPopup
          open={popupOpen}
          otp={otp}
          title={t('profile.editProfileTitle')}
          onConfirm={handleVerifyOtp}
          onClose={() => setPopupOpen(false)}
          loading={saving}
        />
      </main>
    </div>
  );
}
