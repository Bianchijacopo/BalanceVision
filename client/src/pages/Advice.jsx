import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

export default function Advice() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiMode, setAiMode] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef(null);

  useEffect(() => {
    apiGet('/advice', token)
      .then(res => { setData(res); setAiMode(res?._ai || false); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  async function sendChat() {
    const msg = chatMsg.trim();
    if (!msg || chatLoading) return;
    setChatMsg('');
    setChat(c => [...c, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/advice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error('Errore');
      const json = await res.json();
      setChat(c => [...c, { role: 'ai', text: json.reply }]);
    } catch (e) {
      setChat(c => [...c, { role: 'ai', text: 'Errore: ' + e.message }]);
    }
    setChatLoading(false);
  }

  return (
    <div className="layout">
      <Topbar title="Consigli finanziari" />

      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Consigli finanziari</h2>
            <p className="card-subtitle">Analisi personalizzata basata sulle tue transazioni</p>
            {data && (
              <span className={`badge ${aiMode ? 'badge-ai' : ''}`}
                style={{ fontSize: 11, marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: aiMode ? 'var(--brand)' : 'var(--bg-muted)', color: aiMode ? 'var(--btn-primary-text)' : 'var(--text-tertiary)' }}>
                {aiMode ? 'AI attiva' : 'Regole base'}
              </span>
            )}
          </div>

          {loading && <div className="loading">Analisi in corso...</div>}

          {data && data.summary && (
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Saldo</span>
                <span className="summary-value">€{data.summary.current_balance.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Entrate totali</span>
                <span className="summary-value text-success">€{data.summary.total_income.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Spese totali</span>
                <span className="summary-value text-danger">€{data.summary.total_expenses.toFixed(2)}</span>
              </div>
            </div>
          )}

          {data && data.advice && data.advice.length > 0 && (
            <ul className="advice-list">
              {data.advice.map((tip, i) => (
                <li key={i} className="advice-item">{tip}</li>
              ))}
            </ul>
          )}

          {data && data.advice && data.advice.length === 0 && (
            <p className="text-secondary text-center">Nessun consiglio disponibile. Aggiungi transazioni per ricevere suggerimenti.</p>
          )}
        </div>

        {!aiMode && (
          <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: 24 }}>
            <p className="text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>
              Per consigli AI, imposta la chiave <strong>Groq</strong> (gratis).
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              1. Vai su <strong>console.groq.com</strong> e registrati<br />
              2. Genera una chiave API<br />
              3. Apri <code>.env</code> nella cartella del progetto e aggiungi:<br />
              <code>GROQ_API_KEY=la_tua_chiave</code><br />
              4. Riavvia l'app
            </p>
          </div>
        )}

        {aiMode && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 15 }}>Parla con l'AI</h3>
              <p className="card-subtitle" style={{ fontSize: 12 }}>Fai domande sulle tue finanze</p>
            </div>
            <div className="chat-box">
              {chat.length === 0 && (
                <p className="text-secondary text-center" style={{ fontSize: 13, padding: 16 }}>
                  Chiedimi qualsiasi cosa: "Come posso risparmiare?", "Analizza le mie spese", "Dove spendo troppo?"
                </p>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`} dangerouslySetInnerHTML={{
                  __html: m.text
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/\n\n/g, '<br><br>')
                    .replace(/\n- /g, '<br>- ')
                }} />
              ))}
              {chatLoading && <div className="chat-msg ai" style={{ color: 'var(--text-tertiary)' }}>Scrivendo...</div>}
              <div ref={chatEnd} />
            </div>
            <div className="chat-input-row" style={{ marginTop: 8 }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                placeholder="Scrivi un messaggio..."
                onKeyDown={e => e.key === 'Enter' && sendChat()} />
              <button className="chat-send-btn" onClick={sendChat} disabled={chatLoading || !chatMsg.trim()}>
                Invia
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Torna alla dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
