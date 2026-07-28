import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiGet, apiPost, apiPut } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

export default function EditProfile() {
  const { t } = useLanguage();
  const { token, user, login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

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
        setPendingEmail(email);
        const res = await apiPost('/auth/send-otp', {}, token);
        setOtpSent(true);
        if (res.otp) alert('OTP di test: ' + res.otp);
        setSaving(false);
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

  async function handleVerifyOtp() {
    setError('');
    setSaving(true);
    try {
      await apiPost('/auth/verify-otp', { otp, newEmail: pendingEmail }, token);

      await apiPut('/auth/profile', { name: name.trim(), surname: surname.trim() }, token);

      setSuccess(t('profile.emailVerified'));
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err) {
      setError(err.message);
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

          {!otpSent ? (
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
          ) : (
            <div>
              <p className="text-secondary" style={{ fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                {t('profile.otpSentTo')} <strong>{pendingEmail}</strong>
              </p>
              <input
                type="text"
                className="form-input"
                placeholder="_ _ _ _ _ _"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', 'Consolas', monospace" }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setOtpSent(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    {t('profile.back')}
                  </button>
                  <button onClick={handleVerifyOtp} className="btn btn-primary" style={{ flex: 1 }}>
                    {saving ? t('profile.verifying') : t('profile.verifyAndSave')}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
