import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

export default function Profile() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteStep, setDeleteStep] = useState('confirm');

  useEffect(() => {
    apiGet('/auth/profile', token)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDeleteRequest() {
    try {
      const res = await apiPost('/auth/send-otp', {}, token);
      setDeleteOtpSent(true);
      setDeleteStep('otp');
      if (res.otp) {
        alert('OTP di test: ' + res.otp);
      }
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

  if (loading) return (
    <div className="layout">
      <Topbar title="Profilo" />
      <main className="main-content narrow">
        <div className="loading">Caricamento...</div>
      </main>
    </div>
  );

  const fullName = [profile?.name, profile?.surname].filter(Boolean).join(' ');

  return (
    <div className="layout">
      <Topbar title="Profilo" />
      <main className="main-content narrow">
        <div className="card profile-card">
          <div className="card-header">
            <h2 className="card-title gradient-title">Profilo</h2>
            <p className="card-subtitle">I tuoi dati personali</p>
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
                  placeholder="Codice OTP a 6 cifre"
                  value={deleteOtp}
                  onChange={e => setDeleteOtp(e.target.value)}
                  style={{ textAlign: 'center', letterSpacing: 4, fontSize: 18 }}
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
