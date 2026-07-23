const API = 'http://localhost:3001/api';

export function apiUrl(path) {
  return `${API}${path}`;
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function request(method, path, body, token, refresh) {
  const opts = { method, headers: authHeaders(token) };
  if (body) opts.body = JSON.stringify(body);

  let res = await fetch(apiUrl(path), opts);
  if (res.status === 401 && refresh) {
    const ok = await refresh();
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

export async function apiGet(path, token, refresh) {
  return request('GET', path, null, token, refresh);
}

export async function apiPost(path, body, token, refresh) {
  return request('POST', path, body, token, refresh);
}

export async function apiPut(path, body, token, refresh) {
  return request('PUT', path, body, token, refresh);
}
