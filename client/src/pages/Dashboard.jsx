import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../context/ApiContext';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#4f46e5'];

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    apiGet('/balance', token).then(setBalance).catch(console.error);
    apiGet('/transactions', token).then(setTransactions).catch(console.error);
  }, [token]);

  const balanceHistory = buildBalanceHistory(transactions, balance?.initial_balance || 0);

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const existing = acc.find(c => c.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, []);

  return (
    <div className="layout">
      <header className="navbar">
        <h1 className="navbar-title">BalanceVision</h1>
        <div className="navbar-right">
          <span className="navbar-user">{user?.name || user?.email}</span>
          <button onClick={() => { logout(); navigate('/login'); }} className="btn btn-ghost">Esci</button>
        </div>
      </header>

      <main className="main-content">
        <div className="balance-card">
          <p className="balance-label">Saldo corrente</p>
          <h2 className="balance-value">
            {balance ? `\u20AC${balance.current_balance.toFixed(2)}` : '...'}
          </h2>
          <div className="balance-details">
            <span className="text-success">+{balance ? balance.total_income.toFixed(2) : '...'}</span>
            <span className="text-danger">-{balance ? balance.total_expenses.toFixed(2) : '...'}</span>
          </div>
        </div>

        <div className="grid-2">
          <div className="card-chart">
            <h3 className="chart-title">Andamento del saldo</h3>
            {balanceHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">Aggiungi transazioni per vedere il grafico</p>
            )}
          </div>

          <div className="card-chart">
            <h3 className="chart-title">Spese per categoria</h3>
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">Aggiungi spese per vedere il grafico</p>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Transazioni recenti</h3>
            <button onClick={() => navigate('/transactions/new')} className="btn btn-primary">
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
                    <td>{t.date}</td>
                    <td>{t.title}</td>
                    <td><span className="badge">{t.category}</span></td>
                    <td className={t.type === 'income' ? 'text-success' : 'text-danger'}>
                      {t.type === 'income' ? '+' : '-'}\u20AC{t.amount.toFixed(2)}
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

        <div className="section">
          <button onClick={() => navigate('/advice')} className="btn btn-secondary">
            Ottieni consigli finanziari
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