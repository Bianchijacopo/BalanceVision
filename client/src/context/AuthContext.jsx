import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API = 'http://localhost:3001/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      setJustRegistered(false);
    }
  }, [token]);

  async function login(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login fallito');
    setToken(data.token);
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
    setUser(data.user);
    setJustRegistered(true);
    return data;
  }

  function logout() {
    setToken(null);
    setUser(null);
    setJustRegistered(false);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, setUser, justRegistered, setJustRegistered }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
