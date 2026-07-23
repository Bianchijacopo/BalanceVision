import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet } from '../context/ApiContext';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { getCategoryColors } from '../utils/categoryColors';

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
      {payload.map((p, i) => (
        <div key={i} style={{ fontWeight: 600 }}>
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

function formatCurrency(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    apiGet('/balance', token).then(setBalance).catch(console.error);
    apiGet('/transactions', token).then(setTransactions).catch(console.error);
  }, [token]);

  const balanceHistory = buildBalanceHistory(transactions, balance?.initial_balance || 0);
  const projectionData = buildProjection(transactions, balance);

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const existing = acc.find(c => c.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, []);

  const topExpenses = [...expenseByCategory].sort((a, b) => b.value - a.value).slice(0, 8);
  const categoryColors = getCategoryColors();

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="layout">
      <Topbar title="Dashboard" />

      <main className="main-content">
          <div className="balance-card">
            <p className="balance-label">Saldo corrente</p>
            <h2 className="balance-value">
              {balance ? <><span className="dollar-brand">€</span>{formatCurrency(balance.current_balance)}</> : '...'}
            </h2>
          </div>

          <div className="monthly-summary">
            <p className="monthly-label">{monthName}</p>
            <div className="monthly-grid">
              <div className="monthly-item">
                <span className="monthly-item-label">Entrate</span>
                <span className="monthly-item-value text-success">+€{formatCurrency(monthlyIncome)}</span>
              </div>
              <div className="monthly-item">
                <span className="monthly-item-label">Spese</span>
                <span className="monthly-item-value text-danger">-€{formatCurrency(monthlyExpenses)}</span>
              </div>
              <div className="monthly-item">
                <span className="monthly-item-label">Saldo mese</span>
                <span className={`monthly-item-value ${monthlyIncome - monthlyExpenses >= 0 ? 'text-success' : 'text-danger'}`}>
                  €{formatCurrency(monthlyIncome - monthlyExpenses)}
                </span>
              </div>
            </div>
          </div>

        <div className="grid-2">
          <div className="card-chart">
            <h3 className="chart-title">Andamento del saldo</h3>
            {balanceHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="balance" stroke="var(--chart-line)" strokeWidth={2} dot={false} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">Aggiungi transazioni per visualizzare il grafico</p>
            )}
          </div>

          <div className="card-chart">
            <h3 className="chart-title">Spese per categoria</h3>
            {topExpenses.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 250 }}>
                <div style={{ flex: '0 0 180px', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topExpenses}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value"
                        animationDuration={800}
                      >
                        {topExpenses.map(entry => (
                          <Cell key={entry.name} fill={categoryColors[entry.name] || '#6366F1'} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topExpenses.map(entry => (
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
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="chart-empty">Aggiungi spese per visualizzare il grafico</p>
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="card-chart">
            <h3 className="chart-title">Proiezione saldo (30 giorni)</h3>
            {projectionData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="balance" stroke="var(--chart-line)" strokeWidth={2} dot={false} animationDuration={800} />
                  <Line type="monotone" dataKey="projected" stroke="var(--brand-deep)" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={800} />
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
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-secondary">Nessuna transazione</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section" style={{ textAlign: 'center' }}>
          <button onClick={() => navigate('/advice')} className="btn btn-secondary">
            Consigli finanziari
          </button>
        </div>
      </main>
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