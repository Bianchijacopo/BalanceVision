import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

export default function ImportCsv() {
  const { token } = useAuth();
  const { t, lang } = useLanguage();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch('http://localhost:3001/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ csv: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t('importCsv.error') }));
        throw new Error(err.error);
      }
      const json = await res.json();
      setResult(json);
      if (json.created > 0) {
        addToast(t('importCsv.created').replace('{n}', json.created), 'success');
      }
    } catch (e) {
      addToast(e.message, 'error');
    }
    setLoading(false);
  }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.endsWith('.csv')) {
        addToast(t('importCsv.invalidFile'), 'error');
        return;
      }
      setFile(f);
      setResult(null);
    }
  }

  return (
    <div className="layout">
      <Topbar title={t('importCsv.title')} />
      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('importCsv.title')}</h2>
            <p className="card-subtitle">{t('importCsv.subtitle')}</p>
          </div>

          <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            <p>{t('importCsv.formatHint1')}</p>
            <p>{t('importCsv.formatHint2')}</p>
            <p>{t('importCsv.formatHint3')}</p>
          </div>

          <div className="form-group">
            <div
              className="file-drop"
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: 8, padding: 32,
                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-muted)',
                transition: 'border-color 0.2s',
              }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--brand)'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--border)';
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  if (!f.name.endsWith('.csv')) {
                    addToast(t('importCsv.invalidFile'), 'error');
                    return;
                  }
                  setFile(f);
                  setResult(null);
                }
              }}
            >
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
              {file ? (
                <p style={{ fontWeight: 600, color: 'var(--brand)' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>{t('importCsv.dropHint')}</p>
              )}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleImport} disabled={!file || loading} style={{ width: '100%' }}>
            {loading ? t('importCsv.importing') : t('importCsv.importBtn')}
          </button>

          {result && (
            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>
                {t('importCsv.resultTitle')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('importCsv.createdCount').replace('{n}', result.created)} / {result.total}
              </p>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>{t('importCsv.errors')}</p>
                  {result.errors.slice(0, 10).map((err, i) => (
                    <p key={i} style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {lang === 'en' ? 'Row' : 'Riga'} {err.row}: {err.error}
                    </p>
                  ))}
                  {result.errors.length > 10 && (
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {t('importCsv.moreErrors').replace('{n}', result.errors.length - 10)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            {t('importCsv.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}
