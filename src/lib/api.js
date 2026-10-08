const TOKEN_KEY = 'mizax.admin';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function api(path, { method = 'GET', body, admin = false, form } = {}) {
  const headers = {};
  if (admin) headers.Authorization = `Bearer ${getToken()}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* leer */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Fehler ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
