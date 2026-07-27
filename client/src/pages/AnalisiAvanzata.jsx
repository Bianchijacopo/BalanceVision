import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Topbar from '../components/Topbar';
import { BarChart, Bar, LineChart, Line, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
      boxShadow: 'var(--shadow-md)'
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

function formatCurrency(v) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AnalisiAvanzata() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    apiGet('/transactions', token).then(setTransactions).catch(console.error);
    apiGet('/balance', token).then(setBalance).catch(console.error);
    apiGet('/budgets', token).then(setBudgetData).catch(console.error);
  }, [token]);

  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  const monthlyAgg = {};
  sorted.forEach(t => {
    const month = t.date.slice(0, 7);
    if (!monthlyAgg[month]) monthlyAgg[month] = { month, income: 0, expense: 0, count: 0 };
    monthlyAgg[month][t.type] += t.amount;
    monthlyAgg[month].count++;
  });
  const monthlyData = Object.values(monthlyAgg).sort((a, b) => a.month.localeCompare(b.month));

  let running = balance?.initial_balance || 0;
  const dailyBalanceMap = {};
  sorted.forEach(t => {
    running += t.type === 'income' ? t.amount : -t.amount;
    dailyBalanceMap[t.date] = Math.round(running * 100) / 100;
  });
  const dailyBalanceData = Object.entries(dailyBalanceMap)
    .map(([date, balanceVal]) => ({ date, balance: balanceVal }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const catAgg = {};
  sorted.filter(t => t.type === 'expense').forEach(t => {
    if (!catAgg[t.category]) catAgg[t.category] = { category: t.category, total: 0, count: 0 };
    catAgg[t.category].total += t.amount;
    catAgg[t.category].count++;
  });
  const categoryData = Object.values(catAgg).sort((a, b) => b.total - a.total);

  const topCategory = categoryData[0];
  const totalIncome = sorted.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = sorted.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const avgTransaction = sorted.length > 0 ? (totalIncome + totalExpenses) / sorted.length : 0;

  const filteredDaily = timeRange === 'all' ? dailyBalanceData : dailyBalanceData.slice(-parseInt(timeRange));

  return (
    <div className="layout">
      <Topbar title={t('analytics.title')} />

      <main className="main-content">
        <div className="summary-grid" style={{ marginBottom: 24 }}>
          <div className="summary-item">
            <span className="summary-label">{t('analytics.totalIncome')}</span>
            <span className="summary-value text-success">€{formatCurrency(totalIncome)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('analytics.totalExpenses')}</span>
            <span className="summary-value text-danger">€{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('analytics.savingsRate')}</span>
            <span className={`summary-value ${savingsRate >= 0 ? 'text-success' : 'text-danger'}`}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid-2">
          <div className="card-chart">
            <h3 className="chart-title">{t('analytics.monthlyTrend')}</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="income" name={t('analytics.income')} fill="var(--success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={t('analytics.expense')} fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">{t('analytics.insufficientData')}</p>
            )}
          </div>

          <div className="card-chart">
            <h3 className="chart-title">{t('analytics.dailyBalance')}</h3>
            {dailyBalanceData.length > 1 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={filteredDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="balance" fill="var(--chart-line)" fillOpacity={0.08} stroke="none" />
                  <Line type="monotone" dataKey="balance" stroke="var(--chart-line)" strokeWidth={2} dot={false} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">{t('analytics.insufficientData')}</p>
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="card-chart">
            <h3 className="chart-title">{t('analytics.expensesByCategory')}</h3>
            {categoryData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {categoryData.map(cat => {
                  const budget = budgetData?.budgets?.find(b => b.category === cat.category);
                  const hasBudget = budget && budget.amount > 0;
                  const aPct = hasBudget ? Math.round((cat.total / budget.amount) * 100) : null;
                  const aRem = hasBudget ? 100 - aPct : null;
                  const aIsOver = hasBudget && cat.total > budget.amount;
                  const aColor = aIsOver ? 'var(--danger)' : aRem >= 40 ? 'var(--brand)' : aRem >= 20 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{cat.category}</span>
                        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          <span style={{ fontWeight: 700 }}>€{formatCurrency(cat.total)}</span>
                          {hasBudget && (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                              {' / '}€{formatCurrency(budget.amount)}
                              <span style={{
                                marginLeft: 6, fontWeight: 700, fontSize: 12,
                                color: aIsOver ? 'var(--danger)' : aRem >= 40 ? 'var(--success)' : aRem >= 20 ? 'var(--warning)' : 'var(--danger)'
                              }}>
                                {aIsOver ? '+' + (aPct - 100) + '%' : aRem + t('analytics.budgetRemaining')}
                              </span>
                            </span>
                          )}
                          {!hasBudget && (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 11, marginLeft: 6 }}>
                              ({((cat.total / categoryData.reduce((s, c) => s + c.total, 0)) * 100).toFixed(1)}% {t('analytics.ofTotal')})
                            </span>
                          )}
                        </span>
                      </div>
                      {hasBudget && (
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                          <div style={{
                            width: Math.min(aPct, 100) + '%', height: '100%', borderRadius: 3,
                            background: aColor,
                            transition: 'width 0.6s ease'
                          }} />
                        </div>
                      )}
                      {!hasBudget && (
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                          <div style={{
                            width: Math.min((cat.total / Math.max(...categoryData.map(c => c.total))) * 100, 100) + '%',
                            height: '100%', borderRadius: 3,
                            background: 'var(--chart-line2)',
                            opacity: 0.4
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {budgetData?.budgets?.length === 0 && (
                  <p className="text-secondary text-center" style={{ fontSize: 12, padding: 8 }}>
                    {t('analytics.noBudgetSet')}
                  </p>
                )}
              </div>
            ) : (
              <p className="chart-empty">{t('analytics.noExpenses')}</p>
            )}
          </div>

          <div className="card-chart">
            <h3 className="chart-title">{t('analytics.statistics')}</h3>
            <div style={{ padding: '16px 0' }}>
              {balance && (
                <>
                  <div className="modal-stat" style={{ marginBottom: 16 }}>
                    <span className="modal-stat-label">{t('analytics.currentBalance')}</span>
                    <span className="modal-stat-value">€{formatCurrency(balance.current_balance)}</span>
                  </div>
                  <div className="modal-stat" style={{ marginBottom: 16 }}>
                    <span className="modal-stat-label">{t('analytics.totalTransactions')}</span>
                    <span className="modal-stat-value">{transactions.length}</span>
                  </div>
                  <div className="modal-stat" style={{ marginBottom: 16 }}>
                    <span className="modal-stat-label">{t('analytics.avgTransaction')}</span>
                    <span className="modal-stat-value">€{formatCurrency(avgTransaction)}</span>
                  </div>
                  <div className="modal-stat" style={{ marginBottom: 16 }}>
                    <span className="modal-stat-label">{t('analytics.topCategory')}</span>
                    <span className="modal-stat-value" style={{ fontSize: 16 }}>
                      {topCategory ? `${topCategory.category} (€${formatCurrency(topCategory.total)})` : '-'}
                    </span>
                  </div>
                  <div className="modal-stat" style={{ marginBottom: 16 }}>
                    <span className="modal-stat-label">{t('analytics.monthsActive')}</span>
                    <span className="modal-stat-value">{monthlyData.length}</span>
                  </div>
                  <div className="modal-stat">
                    <span className="modal-stat-label">{t('analytics.avgMonthlyExpenses')}</span>
                    <span className="modal-stat-value">
                      €{formatCurrency(monthlyData.length > 0 ? totalExpenses / monthlyData.length : 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="section" style={{ textAlign: 'center' }}>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            {t('analytics.backToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
}