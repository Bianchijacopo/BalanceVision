import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function OtpPopup({ open, title, onConfirm, onClose, loading }) {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function handleConfirm(e) {
    e.preventDefault();
    if (input.length < 6) {
      setError(t('otpPopup.mismatch'));
      return;
    }
    onConfirm(input);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 380, maxWidth: '100%', padding: 24 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '0 0 16px 0' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: 16 }}>{title}</h3>
          <button className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <p className="text-secondary" style={{ fontSize: 13, margin: '0 0 16px 0', lineHeight: 1.5 }}>
          {t('otpPopup.message')}
        </p>

        {error && <div className="alert-error" style={{ marginBottom: 8 }}>{error}</div>}

        <form onSubmit={handleConfirm}>
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            placeholder="_ _ _ _ _ _"
            value={input}
            onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', 'Consolas', monospace" }}
            autoComplete="one-time-code"
          />
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 12 }} disabled={loading || input.length < 6}>
            {loading ? t('otpPopup.verifying') : t('otpPopup.confirm')}
          </button>
        </form>
      </div>
    </div>
  );
}
