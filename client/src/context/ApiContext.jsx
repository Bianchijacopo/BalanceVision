const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function apiUrl(path) {
  return `${API}${path}`;
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new CustomEvent('auth-expired'));
      return false;
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    window.dispatchEvent(new CustomEvent('auth-refresh', { detail: { token: data.token, refreshToken: data.refreshToken } }));
    return true;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new CustomEvent('auth-expired'));
    return false;
  }
}

async function request(method, path, body, token) {
  const opts = { method, headers: authHeaders(token) };
  if (body) opts.body = JSON.stringify(body);

  let res = await fetch(apiUrl(path), opts);
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      const newToken = localStorage.getItem('token');
      opts.headers = authHeaders(newToken);
      res = await fetch(apiUrl(path), opts);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore di rete' }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function apiGet(path, token) {
  return request('GET', path, null, token);
}

export async function apiPost(path, body, token) {
  return request('POST', path, body, token);
}

export async function apiPut(path, body, token) {
  return request('PUT', path, body, token);
}

export async function apiDelete(path, token) {
  return request('DELETE', path, null, token);
}
