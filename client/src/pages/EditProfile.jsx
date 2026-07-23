import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

export default function EditProfile() {
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
    if (!name.trim()) { setError('Il nome e obbligatorio'); return; }

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

      const res = await fetch('http://localhost:3001/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ name: name.trim(), surname: surname.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Profilo aggiornato con successo');
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
      const res = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ otp, newEmail: pendingEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const profileRes = await fetch('http://localhost:3001/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ name: name.trim(), surname: surname.trim() })
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error);

      setSuccess('Profilo aggiornato e email verificata');
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="layout">
      <Topbar title="Modifica profilo" />
      <main className="main-content narrow"><div className="loading">Caricamento...</div></main>
    </div>
  );

  return (
    <div className="layout">
      <Topbar title="Modifica profilo" />
      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title gradient-title">Modifica dati</h2>
            <p className="card-subtitle">Aggiorna le tue informazioni personali</p>
          </div>

          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          {!otpSent ? (
            <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Nome</label>
                <input id="name" type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="surname">Cognome</label>
                <input id="surname" type="text" className="form-input" value={surname} onChange={e => setSurname(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                {email !== originalEmail && (
                  <p className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>
                    La modifica dell'email richiede la verifica tramite OTP.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => navigate('/profile')} className="btn btn-secondary" style={{ flex: 1 }}>
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-secondary" style={{ fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                Inserisci il codice OTP inviato a <strong>{pendingEmail}</strong> per verificare la nuova email.
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
                  Indietro
                </button>
                <button onClick={handleVerifyOtp} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? 'Verifica...' : 'Verifica e salva'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
