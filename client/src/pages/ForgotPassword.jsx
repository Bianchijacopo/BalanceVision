import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function sendOtp(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/forgot-send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg('Codice inviato a ' + email + (json.otp ? ' (OTP: ' + json.otp + ')' : ''));
      setStep(2);
    } catch (e) {
      setError(e.message);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      navigate('/login');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="page-center">
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header">
          <h1 className="card-title gradient-title">BalanceVision</h1>
          <p className="card-subtitle">
            {step === 1 && 'Recupera la tua password'}
            {step === 2 && 'Inserisci il codice ricevuto'}
            {step === 3 && 'Scegli una nuova password'}
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {msg && <div className="alert-success">{msg}</div>}

        {step === 1 && (
          <form onSubmit={sendOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="text" className="form-input"
                placeholder="mario@esempio.it" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              Invia codice
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={e => { e.preventDefault(); setStep(3); }}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp">Codice di verifica</label>
              <input id="otp" type="text" className="form-input"
                placeholder="Inserisci il codice a 6 cifre" value={otp}
                onChange={e => setOtp(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              Verifica codice
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Nuova password</label>
              <input id="password" type="password" className="form-input"
                placeholder="Min. 8 caratteri, maiuscola, minuscola, numero" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              Cambia password
            </button>
          </form>
        )}

        <div className="card-footer">
          <span className="text-secondary">Torna al</span>
          <Link to="/login" className="link">Login</Link>
        </div>
      </div>
    </div>
  );
}
