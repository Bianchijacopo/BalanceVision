import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import TransactionForm from './pages/TransactionForm';
import Advice from './pages/Advice';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';

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

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/verify-email" element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />
            <Route path="/dashboard" element={<VerifiedRoute><Dashboard /></VerifiedRoute>} />
            <Route path="/transactions/new" element={<VerifiedRoute><TransactionForm /></VerifiedRoute>} />
            <Route path="/advice" element={<VerifiedRoute><Advice /></VerifiedRoute>} />
            <Route path="/profile" element={<VerifiedRoute><Profile /></VerifiedRoute>} />
            <Route path="/profile/edit" element={<VerifiedRoute><EditProfile /></VerifiedRoute>} />
            <Route path="/profile/change-password" element={<VerifiedRoute><ChangePassword /></VerifiedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
