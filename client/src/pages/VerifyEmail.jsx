import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const { token, user, setUser, setJustRegistered } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email_verified) navigate('/dashboard');
  }, [user]);

  async function handleVerify() {
    setError('');
    if (!otp || otp.length < 6) { setError('Inserisci il codice di 6 cifre'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Email verificata con successo');
      if (data.user) setUser(data.user);
      setJustRegistered(false);
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setOtp('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.otp) alert('OTP di test: ' + data.otp);
      setSuccess('Nuovo codice inviato');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <h2 className="card-title gradient-title">Verifica email</h2>
          <p className="card-subtitle">
            Inserisci il codice inviato a <strong>{user?.email}</strong>
          </p>
        </div>
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}
        <div className="form-group">
          <input
            type="text"
            className="form-input"
            placeholder="_ _ _ _ _ _"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', 'Consolas', monospace" }}
          />
        </div>
        <button onClick={handleVerify} className="btn btn-primary btn-full" disabled={loading || otp.length < 6}>
          {loading ? 'Verifica...' : 'Verifica email'}
        </button>
        <div className="card-footer" style={{ flexDirection: 'column', gap: 8 }}>
          <button onClick={handleResend} className="link" style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', fontSize: 13 }}>
            Invia di nuovo il codice
          </button>
        </div>
      </div>
    </div>
  );
}
