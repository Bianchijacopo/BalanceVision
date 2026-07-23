import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiGet } from '../context/ApiContext';
import { useToast } from '../context/ToastContext';
import { ComposedChart, Area, LineChart, Line, PieChart, Pie, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { getCategoryColors } from '../utils/categoryColors';
import { getAllCategories, isDefaultCategory, removeCustomCategory } from '../utils/categoryManager';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
  if (!active || !payload || !payload[0]) return null;
  const total = payload[0]?.payload?.total || 1;
  const pct = ((payload[0].value / total) * 100).toFixed(1);
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
      <div style={{ fontWeight: 600 }}>{payload[0].name}</div>
      <div>€{payload[0].value?.toFixed(2)} ({pct}%)</div>
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
  const [budgetData, setBudgetData] = useState(null);
  const [goalData, setGoalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [manageCats, setManageCats] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [, forceUpdate] = useState(0);
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
    apiGet('/budgets', token).then(setBudgetData).catch(console.error);
    apiGet('/goals', token).then(setGoalData).catch(console.error);
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

  const monthlyExpenseTotal = monthlyExpenseByCategory.reduce((s, e) => s + e.value, 0);
const monthlyTopExpenses = [...monthlyExpenseByCategory].sort((a, b) => b.value - a.value).slice(0, 8).map(e => ({ ...e, total: monthlyExpenseTotal }));

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

  const allCategories = getAllCategories();
  const filteredTransactions = transactions.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterType && t.type !== filterType) return false;
    return true;
  });
  const filteredMonthly = monthlyTransactions.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterType && t.type !== filterType) return false;
    return true;
  });

  function exportCSV() {
    const list = (searchQuery || filterCategory || filterType) ? filteredTransactions : transactions;
    const headers = 'Data,Titolo,Categoria,Tipo,Importo,Note';
    const rows = list.map(t =>
      `"${t.date}","${t.title}","${t.category}","${t.type}",${t.amount},"${(t.note || '').replace(/"/g, '""')}"`
    ).join('\n');
    const csv = '\uFEFF' + headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transazioni_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    addToast('CSV esportato con successo', 'success');
  }

  const transactionsBeforeMonth = transactions.filter(t => t.date < displayMonth);
  let monthStartBalance = balance?.initial_balance || 0;
  transactionsBeforeMonth.forEach(t => {
    monthStartBalance += t.type === 'income' ? t.amount : -t.amount;
  });

  const monthlyHistory = balanceHistory.filter(h => h.date.startsWith(displayMonth));
  const peak = monthlyHistory.length > 0 ? monthlyHistory.reduce((a, b) => a.balance > b.balance ? a : b) : null;
  const low = monthlyHistory.length > 0 ? monthlyHistory.reduce((a, b) => a.balance < b.balance ? a : b) : null;

  function downloadPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(0, 180, 90);
    doc.text('BalanceVision', pageW / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Report mensile - ' + monthName, pageW / 2, y, { align: 'center' });
    y += 12;

    doc.setDrawColor(0, 180, 90);
    doc.line(20, y, pageW - 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('Saldo iniziale mese:', 20, y);
    doc.setFontSize(13);
    doc.setTextColor(0, 180, 90);
    doc.text('€' + formatCurrency(monthStartBalance), pageW - 20, y, { align: 'right' });
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('Totale entrate:', 20, y);
    doc.setFontSize(13);
    doc.setTextColor(0, 180, 90);
    doc.text('€' + formatCurrency(monthlyIncome), pageW - 20, y, { align: 'right' });
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('Totale spese:', 20, y);
    doc.setFontSize(13);
    doc.setTextColor(220, 0, 50);
    doc.text('-€' + formatCurrency(monthlyExpenses), pageW - 20, y, { align: 'right' });
    y += 10;

    doc.setDrawColor(200);
    doc.line(20, y, pageW - 20, y);
    y += 6;

    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('Saldo finale:', 20, y);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('€' + formatCurrency(balance?.current_balance || 0), pageW - 20, y, { align: 'right' });
    y += 6;

    if (peak || low) {
      doc.setDrawColor(200);
      doc.line(20, y, pageW - 20, y);
      y += 6;
      doc.setFontSize(11);
      doc.setTextColor(50);
      doc.text('Picco massimo:', 20, y);
      doc.setFontSize(12);
      doc.setTextColor(0, 180, 90);
      doc.text('€' + formatCurrency(peak?.balance || 0) + ' (' + (peak?.date || '-') + ')', pageW - 20, y, { align: 'right' });
      y += 8;
      doc.setFontSize(11);
      doc.setTextColor(50);
      doc.text('Punto minimo:', 20, y);
      doc.setFontSize(12);
      doc.setTextColor(220, 0, 50);
      doc.text('€' + formatCurrency(low?.balance || 0) + ' (' + (low?.date || '-') + ')', pageW - 20, y, { align: 'right' });
      y += 10;
    }

    y += 4;

    const expenses = monthlyTransactions.filter(t => t.type === 'expense').sort((a, b) => new Date(b.date) - new Date(a.date));
    const incomes = monthlyTransactions.filter(t => t.type === 'income').sort((a, b) => new Date(b.date) - new Date(a.date));

    if (expenses.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(50);
      doc.text('Spese del mese', 20, y);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [['Data', 'Titolo', 'Categoria', 'Importo']],
        body: expenses.map(t => [t.date, t.title, t.category, '€' + t.amount.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: [220, 0, 50], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [255, 240, 240] },
        styles: { cellPadding: 3 },
        margin: { left: 20, right: 20 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (incomes.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(50);
      doc.text('Entrate del mese', 20, y);
      y += 6;

      doc.autoTable({
        startY: y,
        head: [['Data', 'Titolo', 'Categoria', 'Importo']],
        body: incomes.map(t => [t.date, t.title, t.category, '€' + t.amount.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: [0, 180, 90], textColor: [255, 255, 255], fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [240, 255, 245] },
        styles: { cellPadding: 3 },
        margin: { left: 20, right: 20 },
      });
    }

    doc.save('report_' + displayMonth + '.pdf');
    addToast('PDF scaricato con successo', 'success');
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

          {budgetData?.budgets?.length > 0 && (
            <div className="card-chart" style={{ marginBottom: 24 }}>
              <div className="section-header">
                <h3 className="chart-title" style={{ margin: 0 }}>Budget {monthName}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/budgets')}>Gestisci</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {budgetData.budgets.slice(0, 4).map(b => {
                  const bPct = Math.round(b.progress);
                  const bRem = 100 - bPct;
                  const bColor = b.spent > b.amount ? 'var(--danger)' : bRem >= 40 ? 'var(--brand)' : bRem >= 20 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{b.category}</span>
                        <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          €{b.spent.toFixed(0)} / €{b.amount.toFixed(0)}
                          <span style={{ marginLeft: 6, fontWeight: 700, fontSize: 11,
                            color: b.spent > b.amount ? 'var(--danger)' : bRem >= 40 ? 'var(--success)' : bRem >= 20 ? 'var(--warning)' : 'var(--danger)'
                          }}>
                            {b.spent > b.amount ? '+' + (bPct - 100) + '%' : bRem + '%'}
                          </span>
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                        <div style={{
                          width: Math.min(bPct, 100) + '%', height: '100%', borderRadius: 3,
                          background: bColor,
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
                {budgetData.budgets.length > 4 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => navigate('/budgets')}>
                    +{budgetData.budgets.length - 4} altri budget
                  </div>
                )}
              </div>
            </div>
          )}

          {goalData?.goals?.length > 0 && (
            <div className="card-chart" style={{ marginBottom: 24 }}>
              <div className="section-header">
                <h3 className="chart-title" style={{ margin: 0 }}>Obiettivi di risparmio</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/goals')}>Gestisci</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {goalData.goals.slice(0, 3).map(g => {
                  const pct = Math.round(g.progress);
                  const achieved = pct >= 100;
                  return (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{g.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          €{g.current_amount.toFixed(0)} / €{g.target_amount.toFixed(0)}
                          <span style={{ marginLeft: 6, fontWeight: 700, color: achieved ? 'var(--success)' : 'var(--brand)' }}>
                            {pct}%
                          </span>
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                        <div style={{
                          width: Math.min(pct, 100) + '%', height: '100%', borderRadius: 3,
                          background: achieved ? 'var(--success)' : 'var(--brand)',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
                {goalData.goals.length > 3 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => navigate('/goals')}>
                    +{goalData.goals.length - 3} altri obiettivi
                  </div>
                )}
              </div>
            </div>
          )}

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

        <div className="card-chart" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="form-input" style={{ flex: 1, minWidth: 140, padding: '6px 10px', fontSize: 12 }}
              placeholder="Cerca transazioni..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <select className="form-input" style={{ width: 120, padding: '6px 10px', fontSize: 12 }}
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Tutte le categorie</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" style={{ width: 100, padding: '6px 10px', fontSize: 12 }}
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Tutti</option>
              <option value="income">Entrate</option>
              <option value="expense">Spese</option>
            </select>
            {(searchQuery || filterCategory || filterType) && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterType(''); }}>
                Cancella filtri
              </button>
            )}
            <button className={`btn btn-ghost btn-sm`}
              onClick={() => setManageCats(!manageCats)}>
              Categorie
            </button>
          </div>
          {manageCats && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>Categorie personalizzate:</span>
              {getAllCategories().filter(c => !isDefaultCategory(c)).length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Nessuna</span>
              )}
              {getAllCategories().filter(c => !isDefaultCategory(c)).map(c => (
                <span key={c} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: 'var(--brand-light)', color: 'var(--brand)',
                }}>
                  {c}
                  <button className="btn-delete" style={{ width: 16, height: 16, fontSize: 12 }}
                    onClick={() => { removeCustomCategory(c); forceUpdate(n => n + 1); }}
                    title="Elimina categoria">&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Transazioni di {monthName}</h3>
            {(searchQuery || filterCategory || filterType) && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                {filteredMonthly.length} risultati
              </span>
            )}
          </div>
          <div className="timeline">
            {filteredMonthly.map(t => (
              <div key={t.id} className="timeline-item">
                <div className="timeline-dot" style={{ borderColor: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }} />
                <div className="timeline-content">
                  <span className="timeline-date">{t.date}</span>
                  <span className="timeline-title">{t.title}</span>
                  <span className="timeline-cat"><span className="badge">{t.category}</span></span>
                  <span className={`timeline-amount ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {t.type === 'income' ? '+' : '-'}€{t.amount.toFixed(2)}
                  </span>
                  <button className="btn-icon" onClick={() => navigate('/transactions/edit/' + t.id)} title="Modifica">&#9998;</button>
                  <button className="btn-delete" onClick={() => handleDeleteWithToast(t.id)} title="Elimina">&times;</button>
                </div>
              </div>
            ))}
            {(searchQuery || filterCategory || filterType ? filteredMonthly.length === 0 : monthlyTransactions.length === 0) && (
              <p className="text-secondary text-center" style={{ padding: 24 }}>
                {searchQuery || filterCategory || filterType ? 'Nessuna transazione corrisponde ai filtri' : 'Nessuna transazione in questo mese'}
              </p>
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
                  <th className="actions-cell" colSpan={2}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 10).map(t => (
                  <tr key={t.id}>
                    <td className="text-sm">{t.date}</td>
                    <td>{t.title}</td>
                    <td><span className="badge">{t.category}</span></td>
                    <td className={t.type === 'income' ? 'text-success' : 'text-danger'}>
                      {t.type === 'income' ? '+' : '-'}€{t.amount.toFixed(2)}
                    </td>
                    <td className="actions-cell">
                      <button className="btn-icon" onClick={() => navigate('/transactions/edit/' + t.id)} title="Modifica">&#9998;</button>
                    </td>
                    <td className="actions-cell">
                      <button className="btn-delete" onClick={() => handleDeleteWithToast(t.id)} title="Elimina">&times;</button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-secondary">
                    {searchQuery || filterCategory || filterType ? 'Nessuna transazione corrisponde ai filtri' : 'Nessuna transazione'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/analytics')} className="btn btn-secondary">Analisi Avanzata</button>
            <button onClick={() => navigate('/budgets')} className="btn btn-secondary">Budget</button>
            <button onClick={() => navigate('/goals')} className="btn btn-secondary">Obiettivi</button>
            <button onClick={() => navigate('/advice')} className="btn btn-secondary">Consigli</button>
          </div>
        </div>
      </main>
    </div>

    <button className="focus-toggle" style={{ left: 24, right: 'auto' }} onClick={toggleFocus} title="Attiva/disattiva focus mode">
      {focusMode ? '◉' : '○'}
    </button>

    <button className="focus-toggle" style={{ background: 'var(--brand)', color: 'var(--btn-primary-text)', borderColor: 'var(--brand)' }} onClick={downloadPDF} title="Scarica report PDF">
      &#8595;
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
