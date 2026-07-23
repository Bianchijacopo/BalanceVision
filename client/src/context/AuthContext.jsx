import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API = 'http://localhost:3001/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    else localStorage.removeItem('refreshToken');
  }, [refreshToken]);

  const doRefresh = useCallback(async () => {
    const stored = localStorage.getItem('refreshToken');
    if (!stored) return false;
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored })
      });
      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!token && refreshToken) {
      doRefresh();
    }
  }, []);

  async function login(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fallito');
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    setJustRegistered(false);
    return data;
  }

  async function register(email, password, name) {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registrazione fallita');
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
    setJustRegistered(true);
    return data;
  }

  async function logout() {
    const t = localStorage.getItem('token');
    if (t) {
      try {
        await fetch(`${API}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + t }
        });
      } catch {}
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setJustRegistered(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, setUser, justRegistered, setJustRegistered, doRefresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
