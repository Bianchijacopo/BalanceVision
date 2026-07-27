import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useLanguage } from '../context/LanguageContext';

export default function Advice() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      <Topbar title={t('advice.title')} />

      <main className="main-content narrow">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('advice.title')}</h2>
            <p className="card-subtitle">{t('advice.subtitle')}</p>
            {data && (
              <span className={`badge ${aiMode ? 'badge-ai' : ''}`}
                style={{ fontSize: 11, marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: aiMode ? 'var(--brand)' : 'var(--bg-muted)', color: aiMode ? 'var(--btn-primary-text)' : 'var(--text-tertiary)' }}>
                {aiMode ? t('advice.aiActive') : t('advice.baseRules')}
              </span>
            )}
          </div>

          {loading && <div className="loading">{t('advice.loading')}</div>}

          {data && data.summary && (
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">{t('advice.balance')}</span>
                <span className="summary-value">€{data.summary.current_balance.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">{t('advice.totalIncome')}</span>
                <span className="summary-value text-success">€{data.summary.total_income.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">{t('advice.totalExpenses')}</span>
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
            <p className="text-secondary text-center">{t('advice.noAdvice')}</p>
          )}
        </div>

        {!aiMode && (
          <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: 24 }}>
            <p className="text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>
              {t('advice.groqSetup')}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              {t('advice.groqStep1')}<br />
              {t('advice.groqStep2')}<br />
              {t('advice.groqStep3')}<br />
              <code>{t('advice.groqApiKey')}</code><br />
              {t('advice.groqStep4')}
            </p>
          </div>
        )}

        {aiMode && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 15 }}>{t('advice.chatTitle')}</h3>
              <p className="card-subtitle" style={{ fontSize: 12 }}>{t('advice.chatSubtitle')}</p>
            </div>
            <div className="chat-box">
              {chat.length === 0 && (
                <p className="text-secondary text-center" style={{ fontSize: 13, padding: 16 }}>
                  {t('advice.chatEmpty')}
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
              {chatLoading && <div className="chat-msg ai" style={{ color: 'var(--text-tertiary)' }}>{t('advice.writing')}</div>}
              <div ref={chatEnd} />
            </div>
            <div className="chat-input-row" style={{ marginTop: 8 }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                placeholder={t('advice.chatPlaceholder')}
                onKeyDown={e => e.key === 'Enter' && sendChat()} />
              <button className="chat-send-btn" onClick={sendChat} disabled={chatLoading || !chatMsg.trim()}>
                {t('advice.send')}
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            {t('advice.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}
