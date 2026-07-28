import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

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
  const { token, user, setUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteStep, setDeleteStep] = useState('confirm');
  const [uploading, setUploading] = useState(false);
  const [reportEnabled, setReportEnabled] = useState(false);
  const [reportDay, setReportDay] = useState(1);
  const [lastReport, setLastReport] = useState(null);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/auth/profile', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(p => { setProfile(p); setUser(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetch('http://localhost:3001/api/reports/settings', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(s => { setReportEnabled(s.report_enabled); setReportDay(s.report_day); setLastReport(s.last_report_sent); })
      .catch(() => {});
  }, [token]);

  async function handleSaveReportSettings() {
    try {
      const res = await fetch('http://localhost:3001/api/reports/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ report_enabled: reportEnabled, report_day: reportDay }),
      });
      if (res.ok) addToast(t('reports.settingsSaved'), 'success');
    } catch (e) { addToast(e.message, 'error'); }
  }

  async function handleSendReport() {
    setSendingReport(true);
    try {
      const res = await fetch('http://localhost:3001/api/reports/send?lang=' + lang, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Error');
      addToast(t('reports.sent'), 'success');
      const now = new Date().toISOString().slice(0, 10);
      setLastReport(now);
    } catch (e) { addToast(e.message, 'error'); }
    setSendingReport(false);
  }

  async function handleDeleteRequest() {
    try {
      const res = await fetch('http://localhost:3001/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      setDeleteStep('otp');
      if (data.otp) alert('OTP di test: ' + data.otp);
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  async function handleDeleteConfirm() {
    try {
      const res = await fetch('http://localhost:3001/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ otp: deleteOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('Immagine troppo grande (max 4MB)'); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        const res = await fetch('http://localhost:3001/api/auth/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ avatar: base64 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setProfile(p => ({ ...p, avatar: base64 }));
        setUser(p => ({ ...p, avatar: base64 }));
      };
      reader.readAsDataURL(file);
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

      </main>
    </div>
  );
}
