import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';
import SplashScreen from './components/SplashScreen';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import Disclaimer from './pages/Disclaimer';
import Guide from './pages/Guide';
import Dashboard from './pages/Dashboard';
import TransactionForm from './pages/TransactionForm';
import AnalisiAvanzata from './pages/AnalisiAvanzata';
import Budget from './pages/Budget';
import Goals from './pages/Goals';
import Advice from './pages/Advice';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import Recurring from './pages/Recurring';
import Categories from './pages/Categories';
import ImportCsv from './pages/ImportCsv';

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ color: '#D4AF37', fontSize: 18, fontWeight: 600 }}>BalanceVision</div>
    </div>
  );
}

function ProtectedRoute({ children, requireVerified }) {
  const { token, justRegistered } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (requireVerified && justRegistered) return <Navigate to="/verify-email" replace />;
  return children;
}

function VerifiedRoute({ children }) {
  return <ProtectedRoute requireVerified>{children}</ProtectedRoute>;
}

function PublicRoute({ children }) {
  const { token, justRegistered } = useAuth();
  if (token) {
    if (justRegistered) return <Navigate to="/verify-email" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function GuestRoute({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppContent() {
  const { verifying } = useAuth();
  if (verifying) return <LoadingScreen />;
  return (
    <Routes>
            <Route path="/" element={<GuestRoute><SplashScreen /></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><SplashScreen /></GuestRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/guida" element={<Guide />} />
            <Route path="/verify-email" element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />
            <Route path="/dashboard" element={<VerifiedRoute><Dashboard /></VerifiedRoute>} />
            <Route path="/transactions/new" element={<VerifiedRoute><TransactionForm /></VerifiedRoute>} />
            <Route path="/transactions/edit/:id" element={<VerifiedRoute><TransactionForm /></VerifiedRoute>} />
            <Route path="/analytics" element={<VerifiedRoute><AnalisiAvanzata /></VerifiedRoute>} />
            <Route path="/budgets" element={<VerifiedRoute><Budget /></VerifiedRoute>} />
            <Route path="/goals" element={<VerifiedRoute><Goals /></VerifiedRoute>} />
            <Route path="/recurring" element={<VerifiedRoute><Recurring /></VerifiedRoute>} />
            <Route path="/advice" element={<VerifiedRoute><Advice /></VerifiedRoute>} />
            <Route path="/categories" element={<VerifiedRoute><Categories /></VerifiedRoute>} />
            <Route path="/import" element={<VerifiedRoute><ImportCsv /></VerifiedRoute>} />
            <Route path="/profile" element={<VerifiedRoute><Profile /></VerifiedRoute>} />
            <Route path="/profile/edit" element={<VerifiedRoute><EditProfile /></VerifiedRoute>} />
            <Route path="/profile/change-password" element={<VerifiedRoute><ChangePassword /></VerifiedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
          <LanguageProvider>
          <CurrencyProvider>
            <AppContent />
          </CurrencyProvider>
          </LanguageProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
