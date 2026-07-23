import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet } from '../context/ApiContext';
import { useToast } from '../context/ToastContext';
import { ComposedChart, Area, LineChart, Line, PieChart, Pie, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { getCategoryColors } from '../utils/categoryColors';

const RADIAN = Math.PI / 180;

function CustomCursor({ points, height }) {
  if (!points || points.length === 0) return null;
  const x = points[0].x;
  return (
    <line x1={x} y1={0} x2={x} y2={height} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'var(--chart-tooltip-bg)',
      border: '1px solid var(--chart-tooltip-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-md)',
      letterSpacing: '0.2px'
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 2, fontSize: 11 }}>{label}</div>
      {payload.filter(p => p.value != null).map((p, i) => (
        <div key={i} style={{ fontWeight: 600, color: p.color }}>
          {p.name}: €{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'var(--chart-tooltip-bg)',
      border: '1px solid var(--chart-tooltip-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{ fontWeight: 600 }}>{payload[0]?.name}</div>
      <div>€{payload[0]?.value?.toFixed(2)}</div>
    </div>
  );
}

function PiePercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (!percent || percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="var(--btn-primary-text)" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

function formatCurrency(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [modal, setModal] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null);
  const { addToast } = useToast();
  const prevBalanceRef = useRef(null);
  const [animClass, setAnimClass] = useState('');

  async function deleteTransaction(id) {
    const res = await fetch('http://localhost:3001/api/transactions/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      apiGet('/balance', token).then(setBalance).catch(console.error);
    }
  }

  useEffect(() => {
    apiGet('/balance', token).then(setBalance).catch(console.error);
    apiGet('/transactions', token).then(setTransactions).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (prevBalanceRef.current != null && balance?.current_balance !== prevBalanceRef.current) {
      setAnimClass('animating');
      const t = setTimeout(() => setAnimClass(''), 700);
      return () => clearTimeout(t);
    }
    prevBalanceRef.current = balance?.current_balance;
  }, [balance?.current_balance]);

  const balanceHistory = buildBalanceHistory(transactions, balance?.initial_balance || 0);
  const projectionData = buildProjection(transactions, balance);

  const categoryColors = getCategoryColors();

  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const displayMonth = targetDate.getFullYear() + '-' + String(targetDate.getMonth() + 1).padStart(2, '0');
  const monthName = targetDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(displayMonth));
  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const hasMonthlyIncome = monthlyTransactions.some(t => t.type === 'income');
  const hasMonthlyExpense = monthlyTransactions.some(t => t.type === 'expense');

  const monthlyExpenseByCategory = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const existing = acc.find(c => c.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, []);

  const monthlyTopExpenses = [...monthlyExpenseByCategory].sort((a, b) => b.value - a.value).slice(0, 8);

  const incomeTransactions = transactions.filter(t => t.type === 'income').sort((a, b) => new Date(b.date) - new Date(a.date));
  const expenseTransactions = transactions.filter(t => t.type === 'expense').sort((a, b) => new Date(b.date) - new Date(a.date));

  function getChartStats(data, key) {
    if (!data || data.length === 0) return null;
    const values = data.filter(d => d[key] != null).map(d => d[key]);
    return {
      start: values[0],
      end: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  const balanceStats = getChartStats(balanceHistory, 'balance');
  const projStats = getChartStats(projectionData, 'projected');

  function handleBalanceHover(data) {
    if (data?.activePayload) {
      const point = data.activePayload.find(p => p.value != null);
      if (point) setHoveredPoint(point.payload);
    }
  }

  function handleBalanceLeave() {
    setHoveredPoint(null);
  }

  const displayBalance = hoveredPoint ? hoveredPoint.balance : balance?.current_balance;
  const displayLabel = hoveredPoint ? 'Saldo al ' + hoveredPoint.date : 'Saldo corrente';

  const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const dailyAvg = monthlyTransactions.length > 0 ? monthlyExpenses / Math.max(1, new Set(monthlyTransactions.map(t => t.date)).size) : 0;
  const topCat = [...monthlyExpenseByCategory].sort((a, b) => b.value - a.value)[0];
  const topCategory = topCat?.name || '-';
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const projectedEndBalance = balance ? balance.current_balance + (monthlyIncome - monthlyExpenses) * ((daysInMonth - targetDate.getDate()) / Math.max(1, daysInMonth)) : 0;

  function handleCategoryClick(entry) {
    const txns = monthlyTransactions.filter(t => t.category === entry.name && t.type === 'expense');
    setCategoryModal({ category: entry.name, transactions: txns, total: entry.value });
  }

  function toggleFocus() {
    setFocusMode(p => !p);
    addToast(focusMode ? 'Focus mode disattivato' : 'Focus mode attivato', 'info');
  }

  function handleDeleteWithToast(id) {
    deleteTransaction(id);
    addToast('Transazione eliminata', 'success');
  }

  return (
    <>
    <div className={`layout ${focusMode ? 'focus-mode' : ''}`}>
      <Topbar title="Dashboard" />

      <main className="main-content">
          <div className={`balance-card clickable balance-countup ${animClass}`} onClick={() => setModal('balance')}>
            <p className="balance-label">{displayLabel}</p>
            <h2 className="balance-value">
              {displayBalance != null ? <><span className="dollar-brand">€</span>{formatCurrency(displayBalance)}</> : '...'}
            </h2>
          </div>

          <div className="insights-grid">
            {monthlyTransactions.length > 0 && (
              <>
              <div className="insight-card">
                <div className="insight-label">Spesa media/giorno</div>
                <div className="insight-value">€{formatCurrency(dailyAvg)}</div>
              </div>
              <div className="insight-card">
                <div className="insight-label">Categoria dominante</div>
                <div className="insight-value" style={{ fontSize: 14 }}>{topCategory || '-'}</div>
              </div>
              <div className="insight-card">
                <div className="insight-label">Risparmio</div>
                <div className={`insight-value ${savingsRate >= 0 ? 'text-success' : 'text-danger'}`}>
                  {savingsRate.toFixed(1)}%
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-label">Previsione fine mese</div>
                <div className="insight-value">€{formatCurrency(projectedEndBalance)}</div>
              </div>
              </>
            )}
          </div>

          <div className="monthly-summary">
            <div className="monthly-header">
              <button className="monthly-arrow" onClick={() => setMonthOffset(prev => prev - 1)}>←</button>
              <p className="monthly-label">{monthName}</p>
              <button className="monthly-arrow" onClick={() => setMonthOffset(prev => Math.min(prev + 1, 0))} disabled={monthOffset === 0}>→</button>
            </div>
            <div className="monthly-grid" key={displayMonth}>
              <div className="monthly-item">
                <span className="monthly-item-label">Entrate</span>
                <span className="monthly-item-value text-success">{hasMonthlyIncome ? '+€' + formatCurrency(monthlyIncome) : '-'}</span>
              </div>
              <div className="monthly-item">
                <span className="monthly-item-label">Spese</span>
                <span className="monthly-item-value text-danger">{hasMonthlyExpense ? '-€' + formatCurrency(monthlyExpenses) : '-'}</span>
              </div>
              <div className="monthly-item">
                <span className="monthly-item-label">Saldo mese</span>
                <span className={`monthly-item-value ${monthlyIncome >= monthlyExpenses ? 'text-success' : 'text-danger'}`}>
                  {(hasMonthlyIncome || hasMonthlyExpense) ? '€' + formatCurrency(monthlyIncome - monthlyExpenses) : '-'}
                </span>
              </div>
            </div>
          </div>

        <div className="grid-2">
          <div className="card-chart clickable" onClick={() => setModal('chart-line')}>
            <h3 className="chart-title">Andamento del saldo</h3>
            {balanceHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={balanceHistory} onMouseMove={handleBalanceHover} onMouseLeave={handleBalanceLeave}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<ChartTooltip />} cursor={<CustomCursor />} />
                  <Area type="monotone" dataKey="balance" fill="url(#balanceFill)" stroke="none" />
                  <Line type="monotone" dataKey="balance" stroke="var(--chart-line)" strokeWidth={2} dot={false} animationDuration={800} activeDot={{ r: 4, fill: 'var(--chart-line)', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">Aggiungi transazioni per visualizzare il grafico</p>
            )}
          </div>

          <div className="card-chart clickable" onClick={() => setModal('chart-pie')}>
            <h3 className="chart-title">Spese per categoria</h3>
            {monthlyTopExpenses.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 250 }}>
                <div style={{ flex: '0 0 180px', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthlyTopExpenses}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value"
                        animationDuration={800}
                        onClick={handleCategoryClick}
                      >
                        {monthlyTopExpenses.map(entry => (
                          <Cell key={entry.name} fill={categoryColors[entry.name] || '#6366F1'} />
                        ))}
                        <LabelList content={<PiePercentLabel />} />
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {monthlyTopExpenses.map(entry => {
                    const total = monthlyTopExpenses.reduce((s, e) => s + e.value, 0);
                    return (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <div style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: categoryColors[entry.name] || '#6366F1',
                          flexShrink: 0
                        }} />
                        <span style={{ color: 'var(--text-secondary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.name}
                        </span>
                        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          €{entry.value.toFixed(2)}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
                          {((entry.value / total) * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="chart-empty">Aggiungi spese per visualizzare il grafico</p>
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="card-chart clickable" onClick={() => setModal('chart-projection')}>
            <h3 className="chart-title">Proiezione saldo (30 giorni)</h3>
            {projectionData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<ChartTooltip />} cursor={<CustomCursor />} />
                  <Line type="monotone" dataKey="balance" stroke="var(--chart-line)" strokeWidth={2} dot={false} animationDuration={800} activeDot={{ r: 4, fill: 'var(--chart-line)', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="projected" stroke="var(--brand-deep)" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={800} activeDot={{ r: 4, fill: 'var(--brand-deep)', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">Servono piu transazioni per generare una proiezione</p>
            )}
          </div>

          <div className="card-chart">
            <h3 className="chart-title">Riepilogo</h3>
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              {balance && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div className="summary-label">Entrate totali</div>
                    <div className="summary-value text-success" style={{ fontSize: 24 }}>
                      €{formatCurrency(balance.total_income)}
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div className="summary-label">Spese totali</div>
                    <div className="summary-value text-danger" style={{ fontSize: 24 }}>
                      €{formatCurrency(balance.total_expenses)}
                    </div>
                  </div>
                  <div>
                    <div className="summary-label">Transazioni</div>
                    <div className="summary-value" style={{ fontSize: 24 }}>
                      {transactions.length}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Transazioni di {monthName}</h3>
          </div>
          <div className="timeline">
            {monthlyTransactions.map(t => (
              <div key={t.id} className="timeline-item">
                <div className="timeline-dot" style={{ borderColor: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }} />
                <div className="timeline-content">
                  <span className="timeline-date">{t.date}</span>
                  <span className="timeline-title">{t.title}</span>
                  <span className="timeline-cat"><span className="badge">{t.category}</span></span>
                  <span className={`timeline-amount ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {t.type === 'income' ? '+' : '-'}€{t.amount.toFixed(2)}
                  </span>
                  <button className="btn-delete" onClick={() => handleDeleteWithToast(t.id)} title="Elimina">&times;</button>
                </div>
              </div>
            ))}
            {monthlyTransactions.length === 0 && (
              <p className="text-secondary text-center" style={{ padding: 24 }}>Nessuna transazione in questo mese</p>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Transazioni recenti</h3>
            <button onClick={() => navigate('/transactions/new')} className="btn btn-primary btn-sm">
              Nuova transazione
            </button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Titolo</th>
                  <th>Categoria</th>
                  <th>Importo</th>
                  <th className="delete-cell"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map(t => (
                  <tr key={t.id}>
                    <td className="text-sm">{t.date}</td>
                    <td>{t.title}</td>
                    <td><span className="badge">{t.category}</span></td>
                    <td className={t.type === 'income' ? 'text-success' : 'text-danger'}>
                      {t.type === 'income' ? '+' : '-'}€{t.amount.toFixed(2)}
                    </td>
                    <td className="delete-cell">
                      <button className="btn-delete" onClick={() => handleDeleteWithToast(t.id)} title="Elimina">&times;</button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-secondary">Nessuna transazione</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section" style={{ textAlign: 'center' }}>
          <button onClick={() => navigate('/analytics')} className="btn btn-secondary">
            Analisi Avanzata
          </button>
        </div>
      </main>
    </div>

    <button className="focus-toggle" onClick={toggleFocus} title="Attiva/disattiva focus mode">
      {focusMode ? '◉' : '○'}
    </button>

    {categoryModal && (
      <div className="modal-overlay" onClick={() => setCategoryModal(null)}>
        <div className="modal-panel modal-panel-chart" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="chart-title" style={{ margin: 0 }}>{categoryModal.category}</h3>
            <button className="modal-close" onClick={() => setCategoryModal(null)}>×</button>
          </div>
          <div className="category-modal-transactions">
            {categoryModal.transactions.map(t => (
              <div key={t.id} className="modal-entry">
                <span className="modal-entry-date">{t.date}</span>
                <span className="modal-entry-title">{t.title}</span>
                <span className="text-danger">-€{t.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Totale: €{categoryModal.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )}

    {modal && (
      <DashboardModal
        type={modal}
        onClose={() => setModal(null)}
        balance={balance}
        transactions={transactions}
        incomeTransactions={incomeTransactions}
        expenseTransactions={expenseTransactions}
        balanceHistory={balanceHistory}
        projectionData={projectionData}
          topExpenses={monthlyTopExpenses}
          categoryColors={categoryColors}
        balanceStats={balanceStats}
        projStats={projStats}
      />
    )}
    </>
  );
}

function DashboardModal({ type, onClose, balance, incomeTransactions, expenseTransactions, balanceHistory, projectionData, topExpenses, categoryColors, balanceStats, projStats }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function formatCurrency(v) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  let title, content;

  if (type === 'balance') {
    const totalIncome = incomeTransactions.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((s, t) => s + t.amount, 0);
    title = 'Dettaglio saldo';
    content = (
      <>
        <div className="modal-balance-total">
          <span className="modal-balance-label">Saldo totale</span>
          <span className="modal-balance-value">€{formatCurrency(balance?.current_balance || 0)}</span>
        </div>
        <div className="modal-split">
          <div className="modal-column modal-column-income">
            <div className="modal-column-header">
              <span>Entrate</span>
              <span className="text-success">€{formatCurrency(totalIncome)}</span>
            </div>
            <div className="modal-column-list">
              {incomeTransactions.map(t => (
                <div className="modal-entry" key={t.id}>
                  <span className="modal-entry-date">{t.date}</span>
                  <span className="modal-entry-title">{t.title}</span>
                  <span className="badge">{t.category}</span>
                  <span className="text-success">+€{t.amount.toFixed(2)}</span>
                </div>
              ))}
              {incomeTransactions.length === 0 && <p className="text-secondary text-center" style={{ padding: 24 }}>Nessuna entrata</p>}
            </div>
          </div>
          <div className="modal-column modal-column-expense">
            <div className="modal-column-header">
              <span>Uscite</span>
              <span className="text-danger">€{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="modal-column-list">
              {expenseTransactions.map(t => (
                <div className="modal-entry" key={t.id}>
                  <span className="modal-entry-date">{t.date}</span>
                  <span className="modal-entry-title">{t.title}</span>
                  <span className="badge">{t.category}</span>
                  <span className="text-danger">-€{t.amount.toFixed(2)}</span>
                </div>
              ))}
              {expenseTransactions.length === 0 && <p className="text-secondary text-center" style={{ padding: 24 }}>Nessuna uscita</p>}
            </div>
          </div>
        </div>
      </>
    );
  } else if (type === 'chart-line') {
    title = 'Andamento del saldo';
    content = (
      <div className="modal-chart-layout">
        <div className="modal-chart-area">
          {balanceHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={balanceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip content={<ChartTooltip />} cursor={<CustomCursor />} />
                <Line type="monotone" dataKey="balance" stroke="var(--chart-line)" strokeWidth={2} dot={false} animationDuration={800} activeDot={{ r: 4, fill: 'var(--chart-line)', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">Dati insufficienti</p>
          )}
        </div>
        <div className="modal-chart-sidebar">
          <div className="modal-stat">
            <span className="modal-stat-label">Saldo iniziale</span>
            <span className="modal-stat-value">€{formatCurrency(balanceStats?.start || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Saldo attuale</span>
            <span className="modal-stat-value">€{formatCurrency(balanceStats?.end || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Minimo</span>
            <span className="modal-stat-value text-danger">€{formatCurrency(balanceStats?.min || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Massimo</span>
            <span className="modal-stat-value text-success">€{formatCurrency(balanceStats?.max || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Transazioni</span>
            <span className="modal-stat-value">{balanceStats?.count || 0}</span>
          </div>
        </div>
      </div>
    );
  } else if (type === 'chart-pie') {
    title = 'Spese per categoria';
    const totalExpenseAmount = topExpenses.reduce((s, e) => s + e.value, 0);
    content = (
      <div className="modal-chart-layout">
        <div className="modal-chart-area">
          {topExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={topExpenses} cx="50%" cy="50%" outerRadius={120} dataKey="value" animationDuration={800}>
                  {topExpenses.map(entry => (
                    <Cell key={entry.name} fill={categoryColors[entry.name] || '#6366F1'} />
                  ))}
                  <LabelList content={<PiePercentLabel />} />
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">Nessuna spesa</p>
          )}
        </div>
        <div className="modal-chart-sidebar">
          <div className="modal-stat">
            <span className="modal-stat-label">Totale spese</span>
            <span className="modal-stat-value">€{formatCurrency(totalExpenseAmount)}</span>
          </div>
          {topExpenses.map(entry => (
            <div key={entry.name} className="modal-stat">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColors[entry.name] || '#6366F1', flexShrink: 0 }} />
                <span className="modal-stat-label">{entry.name}</span>
              </div>
              <span className="modal-stat-value">
                €{formatCurrency(entry.value)}
                <span className="text-secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                  ({((entry.value / totalExpenseAmount) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (type === 'chart-projection') {
    title = 'Proiezione saldo (30 giorni)';
    const dailyChange = balanceStats && balanceStats.count > 1
      ? ((balanceStats.end - balanceStats.start) / balanceStats.count)
      : 0;
    content = (
      <div className="modal-chart-layout">
        <div className="modal-chart-area">
          {projectionData.length > 1 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                <Tooltip content={<ChartTooltip />} cursor={<CustomCursor />} />
                <Line type="monotone" dataKey="balance" stroke="var(--chart-line)" strokeWidth={2} dot={false} animationDuration={800} activeDot={{ r: 4, fill: 'var(--chart-line)', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="projected" stroke="var(--brand-deep)" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={800} activeDot={{ r: 4, fill: 'var(--brand-deep)', stroke: 'var(--bg-primary)', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">Dati insufficienti</p>
          )}
        </div>
        <div className="modal-chart-sidebar">
          <div className="modal-stat">
            <span className="modal-stat-label">Saldo attuale</span>
            <span className="modal-stat-value">€{formatCurrency(balanceStats?.end || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Proiettato (30g)</span>
            <span className="modal-stat-value">€{formatCurrency(projStats?.end || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Variazione giornaliera</span>
            <span className={`modal-stat-value ${dailyChange >= 0 ? 'text-success' : 'text-danger'}`}>
              €{formatCurrency(Math.abs(dailyChange))}/g
            </span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Data proiezione</span>
            <span className="modal-stat-value text-secondary">
              {projectionData.length > 1 ? projectionData[projectionData.length - 1].date : '-'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-panel ${type === 'balance' ? 'modal-panel-balance' : 'modal-panel-chart'}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="chart-title" style={{ margin: 0 }}>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {content}
      </div>
    </div>
  );
}

function buildBalanceHistory(transactions, initialBalance) {
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = initialBalance;
  return sorted.map(t => {
    running += t.type === 'income' ? t.amount : -t.amount;
    return { date: t.date, balance: Math.round(running * 100) / 100 };
  });
}

function buildProjection(transactions, balance) {
  if (!balance || transactions.length < 3) return [];

  const history = buildBalanceHistory(transactions, balance.initial_balance);
  if (history.length < 2) return [];

  const lastDate = new Date(history[history.length - 1].date);
  const firstDate = new Date(history[0].date);
  const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
  const balanceChange = history[history.length - 1].balance - history[0].balance;
  const dailyChange = balanceChange / daysDiff;

  const lastBalance = history[history.length - 1].balance;
  const result = [...history];

  for (let i = 1; i <= 30; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + i);
    const dateStr = nextDate.toISOString().split('T')[0];
    const projected = lastBalance + dailyChange * i;
    result.push({ date: dateStr, balance: null, projected: Math.round(projected * 100) / 100 });
  }

  return result;
}
