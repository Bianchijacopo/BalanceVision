import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { apiGet } from '../context/ApiContext';
import { useToast } from '../context/ToastContext';
import { ComposedChart, Area, LineChart, Line, PieChart, Pie, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { getCategoryColors } from '../utils/categoryColors';
import { getAllCategories, isDefaultCategory, removeCustomCategory } from '../utils/categoryManager';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'it-IT';
  const timeOpts = lang === 'en' ? { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true } : { hour: '2-digit', minute: '2-digit', second: '2-digit' };
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
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [manageCats, setManageCats] = useState(false);
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(id); }, []);
  const chartRef = useRef(null);
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

  useEffect(() => {
    if (transactions.length > 0 && monthOffset === 0 && !sessionStorage.getItem('bv_nav')) {
      sessionStorage.setItem('bv_nav', '1');
      const curMonth = new Date().toISOString().slice(0, 7);
      if (!transactions.some(t => t.date.startsWith(curMonth))) {
        const latest = transactions.reduce((a, b) => a.date > b.date ? a : b).date;
        const ly = parseInt(latest.slice(0, 4)), lm = parseInt(latest.slice(5, 7));
        const curMonths = new Date().getFullYear() * 12 + new Date().getMonth();
        const latMonths = ly * 12 + (lm - 1);
        if (curMonths > latMonths) setMonthOffset(latMonths - curMonths);
      }
    }
  }, [transactions]);

  const balanceHistory = buildBalanceHistory(transactions, balance?.initial_balance || 0);
  const projectionData = buildProjection(transactions, balance);

  const categoryColors = getCategoryColors();

  const [monthOffset, setMonthOffset] = useState(() => {
    try { const s = sessionStorage.getItem('bv_moff'); return s !== null ? parseInt(s, 10) : 0; } catch { return 0; }
  });
  useEffect(() => { try { sessionStorage.setItem('bv_moff', String(monthOffset)); } catch {} }, [monthOffset]);
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const displayMonth = targetDate.getFullYear() + '-' + String(targetDate.getMonth() + 1).padStart(2, '0');
  const monthName = targetDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
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
  const displayLabel = hoveredPoint ? t('dashboard.balanceAt') + hoveredPoint.date : t('dashboard.balance');

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
    addToast(focusMode ? t('dashboard.focusOff') : t('dashboard.focusOn'), 'info');
  }

  function handleDeleteWithToast(id) {
    deleteTransaction(id);
    addToast(t('dashboard.txDeleted'), 'success');
  }

  const allCategories = getAllCategories();
  const filteredTransactions = transactions.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inTitle = t.title.toLowerCase().includes(q);
      const inNote = (t.note || '').toLowerCase().includes(q);
      if (!inTitle && !inNote) return false;
    }
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterType && t.type !== filterType) return false;
    if (filterDateFrom && t.date < filterDateFrom) return false;
    if (filterDateTo && t.date > filterDateTo) return false;
    if (filterAmountMin && t.amount < parseFloat(filterAmountMin)) return false;
    if (filterAmountMax && t.amount > parseFloat(filterAmountMax)) return false;
    return true;
  });
  const filteredMonthly = monthlyTransactions.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inTitle = t.title.toLowerCase().includes(q);
      const inNote = (t.note || '').toLowerCase().includes(q);
      if (!inTitle && !inNote) return false;
    }
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterType && t.type !== filterType) return false;
    if (filterDateFrom && t.date < filterDateFrom) return false;
    if (filterDateTo && t.date > filterDateTo) return false;
    if (filterAmountMin && t.amount < parseFloat(filterAmountMin)) return false;
    if (filterAmountMax && t.amount > parseFloat(filterAmountMax)) return false;
    return true;
  });

  const transactionsBeforeMonth = transactions.filter(t => t.date < displayMonth);
  let monthStartBalance = balance?.initial_balance || 0;
  transactionsBeforeMonth.forEach(t => {
    monthStartBalance += t.type === 'income' ? t.amount : -t.amount;
  });

  const monthlyHistory = balanceHistory.filter(h => h.date.startsWith(displayMonth));
  const peak = monthlyHistory.length > 0 ? monthlyHistory.reduce((a, b) => a.balance > b.balance ? a : b) : null;
  const low = monthlyHistory.length > 0 ? monthlyHistory.reduce((a, b) => a.balance < b.balance ? a : b) : null;

  async function downloadPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = margin;

    const brandColor = [0, 180, 90];
    const textDark = [30, 30, 30];
    const textMed = [100, 100, 100];
    const dangerColor = [220, 0, 50];

    doc.setFontSize(22);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('BalanceVision', pageW / 2, y, { align: 'center' });
    y += 9;

    doc.setFontSize(13);
    doc.setTextColor(textMed[0], textMed[1], textMed[2]);
    doc.text(t('dashboard.pdfReportTitle'), pageW / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(11);
    doc.text(monthName, pageW / 2, y, { align: 'center' });
    y += 4;

    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(textMed[0], textMed[1], textMed[2]);

    const summaryData = [
      { label: t('dashboard.pdfInitialBalance'), value: '€' + formatCurrency(monthStartBalance), color: textDark },
      { label: t('dashboard.pdfMonthlyIncome'), value: '+€' + formatCurrency(monthlyIncome), color: brandColor },
      { label: t('dashboard.pdfMonthlyExpenses'), value: '-€' + formatCurrency(monthlyExpenses), color: dangerColor },
      { label: t('dashboard.pdfFinalBalance'), value: '€' + formatCurrency(balance?.current_balance || 0), color: textDark },
    ];

    doc.setFontSize(9);
    doc.setTextColor(textMed[0], textMed[1], textMed[2]);
    doc.text(t('dashboard.pdfSummary'), margin, y);
    y += 6;

    for (const s of summaryData) {
      doc.setDrawColor(240, 240, 240);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, y, pageW - 2 * margin, 9, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setTextColor(textMed[0], textMed[1], textMed[2]);
      doc.text(s.label, margin + 4, y + 6.5);
      doc.setFontSize(11);
      doc.setTextColor(s.color[0], s.color[1], s.color[2]);
      doc.text(s.value, pageW - margin - 4, y + 6.5, { align: 'right' });
      y += 11;
    }

    if (peak || low) {
      y += 2;
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setTextColor(textMed[0], textMed[1], textMed[2]);
      doc.text(t('dashboard.pdfTrend'), margin, y);
      y += 6;

      if (peak) {
        doc.setFontSize(10);
        doc.setTextColor(textMed[0], textMed[1], textMed[2]);
        doc.text(t('dashboard.pdfPeak'), margin + 4, y + 3);
        doc.setFontSize(10);
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text('€' + formatCurrency(peak.balance), pageW - margin - 4, y + 3, { align: 'right' });
        doc.setFontSize(8);
        doc.setTextColor(textMed[0], textMed[1], textMed[2]);
        doc.text(peak.date, pageW - margin - 4, y + 8, { align: 'right' });
        y += 14;
      }

      if (low) {
        doc.setFontSize(10);
        doc.setTextColor(textMed[0], textMed[1], textMed[2]);
        doc.text(t('dashboard.pdfLow'), margin + 4, y + 3);
        doc.setFontSize(10);
        doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
        doc.text('€' + formatCurrency(low.balance), pageW - margin - 4, y + 3, { align: 'right' });
        doc.setFontSize(8);
        doc.setTextColor(textMed[0], textMed[1], textMed[2]);
        doc.text(low.date, pageW - margin - 4, y + 8, { align: 'right' });
        y += 14;
      }
    }

    const expenses = monthlyTransactions.filter(t => t.type === 'expense').sort((a, b) => new Date(b.date) - new Date(a.date));
    const incomes = monthlyTransactions.filter(t => t.type === 'income').sort((a, b) => new Date(b.date) - new Date(a.date));

    y += 4;
    if (expenses.length > 0) {
      if (y > 240) { doc.addPage(); y = margin; }

      doc.setFontSize(9);
      doc.setTextColor(textMed[0], textMed[1], textMed[2]);
      doc.text(t('dashboard.pdfExpenseDetail'), margin, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [[t('dashboard.pdfTableDate'), t('dashboard.pdfTableDesc'), t('dashboard.pdfTableCategory'), t('dashboard.pdfTableAmount')]],
        body: expenses.map(t => [t.date, t.title, t.category, '€' + t.amount.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: dangerColor, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: textDark },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        styles: { cellPadding: 2.5 },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (incomes.length > 0) {
      if (y > 240) { doc.addPage(); y = margin; }

      doc.setFontSize(9);
      doc.setTextColor(textMed[0], textMed[1], textMed[2]);
      doc.text(t('dashboard.pdfIncomeDetail'), margin, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [[t('dashboard.pdfTableDate'), t('dashboard.pdfTableDesc'), t('dashboard.pdfTableCategory'), t('dashboard.pdfTableAmount')]],
        body: incomes.map(t => [t.date, t.title, t.category, '€' + t.amount.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: brandColor, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: textDark },
        alternateRowStyles: { fillColor: [245, 255, 245] },
        styles: { cellPadding: 2.5 },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff',
          width: chartRef.current.scrollWidth,
          height: chartRef.current.scrollHeight,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgW = pageW - 2 * margin;
        const imgH = (canvas.height / canvas.width) * imgW;
        if (y + imgH > 280) { doc.addPage(); y = margin; }

        doc.setFontSize(9);
        doc.setTextColor(textMed[0], textMed[1], textMed[2]);
        doc.text(t('dashboard.pdfChartTrend'), margin, y);
        y += 6;
        doc.addImage(imgData, 'PNG', margin, y, imgW, Math.min(imgH, 120));
        y += Math.min(imgH, 120) + 8;
      } catch (e) {
        console.error('Chart capture failed:', e);
      }
    }

    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
    doc.setFontSize(7);
    doc.setTextColor(textMed[0], textMed[1], textMed[2]);
    doc.text(t('dashboard.pdfGeneratedBy') + new Date().toLocaleDateString(locale), pageW / 2, y, { align: 'center' });

    doc.save('BalanceVision_Report_' + displayMonth + '.pdf');
    addToast(t('dashboard.pdfSuccess'), 'success');
  }

  return (
    <>
    <div className={`layout ${focusMode ? 'focus-mode' : ''}`}>
      <Topbar title={t('nav.dashboard')} />

      <main className="main-content">
          <div className="clock-wrap">
            <div className="clock-date">{clock.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="clock-time">{clock.toLocaleTimeString(locale, timeOpts)}</div>
          </div>
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
                <div className="insight-label">{t('dashboard.dailyAvg')}</div>
                <div className="insight-value">€{formatCurrency(dailyAvg)}</div>
              </div>
              <div className="insight-card">
                <div className="insight-label">{t('dashboard.topCategory')}</div>
                <div className="insight-value" style={{ fontSize: 14 }}>{topCategory || '-'}</div>
              </div>
              <div className="insight-card">
                <div className="insight-label">{t('dashboard.savings')}</div>
                <div className={`insight-value ${savingsRate >= 0 ? 'text-success' : 'text-danger'}`}>
                  {savingsRate.toFixed(1)}%
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-label">{t('dashboard.projection')}</div>
                <div className="insight-value">€{formatCurrency(projectedEndBalance)}</div>
              </div>
              </>
            )}
          </div>

          {budgetData?.budgets?.length > 0 && (
            <div className="card-chart" style={{ marginBottom: 24 }}>
              <div className="section-header">
                <h3 className="chart-title" style={{ margin: 0 }}>{t('dashboard.budgetTitle')} {monthName}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/budgets')}>{t('dashboard.manage')}</button>
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
                    +{budgetData.budgets.length - 4} {t('dashboard.moreBudgets')}
                  </div>
                )}
              </div>
            </div>
          )}

          {goalData?.goals?.length > 0 && (
            <div className="card-chart" style={{ marginBottom: 24 }}>
              <div className="section-header">
                <h3 className="chart-title" style={{ margin: 0 }}>{t('dashboard.goalsTitle')}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/goals')}>{t('dashboard.manage')}</button>
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
                    +{goalData.goals.length - 3} {t('dashboard.moreGoals')}
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
                <span className="monthly-item-label">{t('dashboard.income')}</span>
                <span className="monthly-item-value text-success">{hasMonthlyIncome ? '+€' + formatCurrency(monthlyIncome) : '-'}</span>
              </div>
              <div className="monthly-item">
                <span className="monthly-item-label">{t('dashboard.expenses')}</span>
                <span className="monthly-item-value text-danger">{hasMonthlyExpense ? '-€' + formatCurrency(monthlyExpenses) : '-'}</span>
              </div>
              <div className="monthly-item">
                <span className="monthly-item-label">{t('dashboard.monthBalance')}</span>
                <span className={`monthly-item-value ${monthlyIncome >= monthlyExpenses ? 'text-success' : 'text-danger'}`}>
                  {(hasMonthlyIncome || hasMonthlyExpense) ? '€' + formatCurrency(monthlyIncome - monthlyExpenses) : '-'}
                </span>
              </div>
            </div>
          </div>

        <div className="grid-2">
          <div ref={chartRef} className="card-chart clickable" onClick={() => setModal('chart-line')}>
            <h3 className="chart-title">{t('dashboard.chartBalance')}</h3>
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
              <p className="chart-empty">{t('dashboard.chartBalanceEmpty')}</p>
            )}
          </div>

          <div className="card-chart clickable" onClick={() => setModal('chart-pie')}>
            <h3 className="chart-title">{t('dashboard.chartExpenses')}</h3>
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
              <p className="chart-empty">{t('dashboard.chartExpensesEmpty')}</p>
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="card-chart clickable" onClick={() => setModal('chart-projection')}>
            <h3 className="chart-title">{t('dashboard.chartProjection')}</h3>
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
              <p className="chart-empty">{t('dashboard.chartProjectionEmpty')}</p>
            )}
          </div>

          <div className="card-chart">
            <h3 className="chart-title">{t('dashboard.summary')}</h3>
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              {balance && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div className="summary-label">{t('dashboard.totalIncome')}</div>
                    <div className="summary-value text-success" style={{ fontSize: 24 }}>
                      €{formatCurrency(balance.total_income)}
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div className="summary-label">{t('dashboard.totalExpenses')}</div>
                    <div className="summary-value text-danger" style={{ fontSize: 24 }}>
                      €{formatCurrency(balance.total_expenses)}
                    </div>
                  </div>
                  <div>
                    <div className="summary-label">{t('dashboard.totalTransactions')}</div>
                    <div className="summary-value" style={{ fontSize: 24 }}>
                      {transactions.length}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="tx-block">
          <div className="tx-header">
            <h3>{t('dashboard.totalTransactions')}</h3>
            <span className="tx-header-count">{transactions.length} {t('dashboard.total')}</span>
          </div>

          <div className="tx-search-wrap">
            <input className="tx-search-input" placeholder={t('dashboard.search')}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div className="tx-filters">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">{t('dashboard.allCategories')}</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">{t('dashboard.allTypes')}</option>
              <option value="income">{t('dashboard.incomes')}</option>
              <option value="expense">{t('dashboard.expensesLabel')}</option>
            </select>
            <button className="btn-tx-ghost" onClick={() => setShowAdvFilters(!showAdvFilters)}
              style={{ background: showAdvFilters ? 'var(--brand)' : '', color: showAdvFilters ? 'var(--btn-primary-text)' : '' }}>
              {showAdvFilters ? t('dashboard.basicFilters') : t('dashboard.advFilters')}
            </button>
            {(searchQuery || filterCategory || filterType || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax) && (
              <button className="btn-tx-clear"
                onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterType('');
                  setFilterDateFrom(''); setFilterDateTo(''); setFilterAmountMin(''); setFilterAmountMax(''); }}>
                {t('dashboard.clearFilters')}
              </button>
            )}
            <button className="btn-tx-ghost"
              onClick={() => setManageCats(!manageCats)}>
              {t('dashboard.categories')}
            </button>
          </div>

          {showAdvFilters && (
            <div className="tx-adv-filters">
              <div className="tx-adv-row">
                <div className="tx-adv-field">
                  <label>{t('dashboard.fromDate')}</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                </div>
                <div className="tx-adv-field">
                  <label>{t('dashboard.toDate')}</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                </div>
              </div>
              <div className="tx-adv-row">
                <div className="tx-adv-field">
                  <label>{t('dashboard.amountMin')}</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={filterAmountMin} onChange={e => setFilterAmountMin(e.target.value)} />
                </div>
                <div className="tx-adv-field">
                  <label>{t('dashboard.amountMax')}</label>
                  <input type="number" step="0.01" min="0" placeholder="99999" value={filterAmountMax} onChange={e => setFilterAmountMax(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {manageCats && (
            <div className="tx-cats">
              <span className="tx-cats-label">{t('dashboard.custom')}</span>
              {getAllCategories().filter(c => !isDefaultCategory(c)).length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('dashboard.none')}</span>
              )}
              {getAllCategories().filter(c => !isDefaultCategory(c)).map(c => (
                <span key={c} className="tx-cat-tag">
                  {c}
                  <button onClick={() => { removeCustomCategory(c); forceUpdate(n => n + 1); }} title={t('dashboard.deleteBtn')}>&times;</button>
                </span>
              ))}
            </div>
          )}

          <div className="tx-list">
            {filteredTransactions.map(tx => (
              <div key={tx.id} className="tx-card">
                <span className="tx-card-date">{tx.date}</span>
                <div className="tx-card-body">
                  <span className="tx-card-category">{tx.category}</span>
                  <span className="tx-card-title">{tx.title}</span>
                </div>
                <span className={`tx-card-amount ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                  {tx.type === 'income' ? '+' : '-'}€{tx.amount.toFixed(2)}
                </span>
                <div className="tx-card-actions">
                  <button className="btn-edit" onClick={() => navigate('/transactions/edit/' + tx.id)} title={t('dashboard.editBtn')}>&#9998;</button>
                  <button className="btn-delete-tx" onClick={() => handleDeleteWithToast(tx.id)} title={t('dashboard.deleteBtn')}>&times;</button>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="tx-empty">
                {(searchQuery || filterCategory || filterType || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax)
                  ? t('dashboard.noFilter') : t('dashboard.noTx')}
              </div>
            )}
          </div>

          <div className="tx-new-btn-wrap">
            <button className="tx-new-btn" onClick={() => navigate('/transactions/new')}>
              {t('dashboard.newTx')}
            </button>
          </div>
        </div>

        <div className="section" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/analytics')} className="btn btn-secondary">{t('analytics.title')}</button>
            <button onClick={() => navigate('/budgets')} className="btn btn-secondary">{t('nav.budgets')}</button>
            <button onClick={() => navigate('/goals')} className="btn btn-secondary">{t('nav.goals')}</button>
            <button onClick={() => navigate('/advice')} className="btn btn-secondary">{t('nav.advice')}</button>
          </div>
        </div>
      </main>
    </div>

    <button className="focus-toggle" style={{ left: 24, right: 'auto' }} onClick={toggleFocus} title={t('dashboard.toggleFocus')}>
      {focusMode ? '◉' : '○'}
    </button>

    <button className="focus-toggle" style={{ background: 'var(--brand)', color: 'var(--btn-primary-text)', borderColor: 'var(--brand)' }} onClick={downloadPDF} title={t('dashboard.downloadPdf')}>
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
            {categoryModal.transactions.map(tx => (
              <div key={tx.id} className="modal-entry">
                <span className="modal-entry-date">{tx.date}</span>
                <span className="modal-entry-title">{tx.title}</span>
                <span className="text-danger">-€{tx.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('dashboard.modalTotal')} €{categoryModal.total.toFixed(2)}</span>
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
    title = t('dashboard.modalBalanceDetail');
    content = (
      <>
        <div className="modal-balance-total">
          <span className="modal-balance-label">{t('dashboard.modalTotalBalance')}</span>
          <span className="modal-balance-value">€{formatCurrency(balance?.current_balance || 0)}</span>
        </div>
        <div className="modal-split">
          <div className="modal-column modal-column-income">
            <div className="modal-column-header">
              <span>{t('dashboard.income')}</span>
              <span className="text-success">€{formatCurrency(totalIncome)}</span>
            </div>
            <div className="modal-column-list">
              {incomeTransactions.map(tx => (
                <div className="modal-entry" key={tx.id}>
                  <span className="modal-entry-date">{tx.date}</span>
                  <span className="modal-entry-title">{tx.title}</span>
                  <span className="badge">{tx.category}</span>
                  <span className="text-success">+€{tx.amount.toFixed(2)}</span>
                </div>
              ))}
              {incomeTransactions.length === 0 && <p className="text-secondary text-center" style={{ padding: 24 }}>{t('dashboard.modalNoIncome')}</p>}
            </div>
          </div>
          <div className="modal-column modal-column-expense">
            <div className="modal-column-header">
              <span>{t('dashboard.modalExpenses')}</span>
              <span className="text-danger">€{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="modal-column-list">
              {expenseTransactions.map(tx => (
                <div className="modal-entry" key={tx.id}>
                  <span className="modal-entry-date">{tx.date}</span>
                  <span className="modal-entry-title">{tx.title}</span>
                  <span className="badge">{tx.category}</span>
                  <span className="text-danger">-€{tx.amount.toFixed(2)}</span>
                </div>
              ))}
              {expenseTransactions.length === 0 && <p className="text-secondary text-center" style={{ padding: 24 }}>{t('dashboard.modalNoExpense')}</p>}
            </div>
          </div>
        </div>
      </>
    );
  } else if (type === 'chart-line') {
    title = t('dashboard.chartBalance');
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
            <p className="chart-empty">{t('dashboard.insufficientData')}</p>
          )}
        </div>
        <div className="modal-chart-sidebar">
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.pdfInitialBalance')}</span>
            <span className="modal-stat-value">€{formatCurrency(balanceStats?.start || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalCurrentBalance')}</span>
            <span className="modal-stat-value">€{formatCurrency(balanceStats?.end || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalMin')}</span>
            <span className="modal-stat-value text-danger">€{formatCurrency(balanceStats?.min || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalMax')}</span>
            <span className="modal-stat-value text-success">€{formatCurrency(balanceStats?.max || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.totalTransactions')}</span>
            <span className="modal-stat-value">{balanceStats?.count || 0}</span>
          </div>
        </div>
      </div>
    );
  } else if (type === 'chart-pie') {
    title = t('dashboard.chartExpenses');
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
            <p className="chart-empty">{t('dashboard.modalNoExpenseData')}</p>
          )}
        </div>
        <div className="modal-chart-sidebar">
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalTotalExpenses')}</span>
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
    title = t('dashboard.chartProjection');
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
            <p className="chart-empty">{t('dashboard.insufficientData')}</p>
          )}
        </div>
        <div className="modal-chart-sidebar">
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalCurrentBalance')}</span>
            <span className="modal-stat-value">€{formatCurrency(balanceStats?.end || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalProjected')}</span>
            <span className="modal-stat-value">€{formatCurrency(projStats?.end || 0)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalDailyChange')}</span>
            <span className={`modal-stat-value ${dailyChange >= 0 ? 'text-success' : 'text-danger'}`}>
              €{formatCurrency(Math.abs(dailyChange))}/g
            </span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">{t('dashboard.modalProjectionDate')}</span>
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
  return sorted.map(tx => {
    running += tx.type === 'income' ? tx.amount : -tx.amount;
    return { date: tx.date, balance: Math.round(running * 100) / 100 };
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
