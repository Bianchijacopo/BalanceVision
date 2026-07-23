const API = 'http://localhost:3001/api';

export function apiUrl(path) {
  return `${API}${path}`;
}

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function apiGet(path, token) {
  const res = await fetch(apiUrl(path), { headers: authHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore di rete' }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function apiPost(path, body, token) {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore di rete' }));
    throw new Error(err.error);
  }
  return res.json();
}