import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const { token, user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteStep, setDeleteStep] = useState('confirm');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/auth/profile', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(p => { setProfile(p); setUser(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

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
      <Topbar title="Profilo" />
      <main className="main-content narrow"><div className="loading">Caricamento...</div></main>
    </div>
  );

  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(' ');

  return (
    <div className="layout">
      <Topbar title="Profilo" />
      <main className="main-content narrow">
        <div className="card profile-card">
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ fontSize: 13 }}>
              &larr; Dashboard
            </button>
          </div>
          <div className="card-header">
            <h2 className="card-title gradient-title">Profilo</h2>
            <p className="card-subtitle">I tuoi dati personali</p>
          </div>

          <div className="profile-avatar-section">
            <div className="profile-avatar" onClick={() => fileRef.current?.click()}>
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" className="profile-avatar-img" />
              ) : (
                <DefaultAvatarBig />
              )}
              <div className="profile-avatar-overlay">
                {uploading ? 'Caricamento...' : 'Cambia foto'}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="profile-info">
            <div className="profile-row">
              <span className="profile-label">Nome</span>
              <span className="profile-value">{fullName || '-'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Email</span>
              <span className="profile-value">{profile?.email}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Verifica email</span>
              <span className={`profile-value ${profile?.email_verified ? 'text-success' : 'text-danger'}`}>
                {profile?.email_verified ? 'Verificata' : 'Non verificata'}
              </span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Data registrazione</span>
              <span className="profile-value">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('it-IT') : '-'}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button onClick={() => navigate('/profile/edit')} className="btn btn-primary btn-full">
              Modifica dati
            </button>
            <button onClick={() => navigate('/profile/change-password')} className="btn btn-secondary btn-full">
              Cambia password
            </button>
            {deleteStep === 'confirm' && (
              <button onClick={handleDeleteRequest} className="btn btn-full" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                Elimina account
              </button>
            )}
            {deleteStep === 'otp' && (
              <div className="profile-delete-otp">
                <p className="text-secondary" style={{ fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                  Inserisci il codice OTP inviato alla tua email per confermare l'eliminazione.
                </p>
                {deleteError && <div className="alert-error">{deleteError}</div>}
                <input
                  type="text"
                  className="form-input"
                  placeholder="_ _ _ _ _ _"
                  value={deleteOtp}
                  onChange={e => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', 'Consolas', monospace" }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setDeleteStep('confirm')} className="btn btn-secondary" style={{ flex: 1 }}>
                    Annulla
                  </button>
                  <button onClick={handleDeleteConfirm} className="btn btn-full" style={{ flex: 1, background: 'var(--danger)', color: '#fff', border: 'none' }}>
                    Elimina
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
