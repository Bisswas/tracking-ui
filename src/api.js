// Every call to the Spring Boot backend lives here.
export const API_URL = (import.meta.env.VITE_API_URL || 'https://product-api-nps7.onrender.com').replace(/\/$/, '');

const TOKEN_KEY = 'tracking_token';
let unauthorizedHandler = null;

export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(API_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Cannot reach the server. The free hosting may be waking up (up to a minute) - try again shortly.');
  }

  // An expired or invalid login token: go back to the login page
  if (res.status === 401 && token && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register')) {
    setToken(null);
    if (unauthorizedHandler) unauthorizedHandler();
  }

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || (body.errors && Object.values(body.errors).join(', ')) || message;
    } catch {
      /* body was not JSON */
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

const query = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, value);
  });
  return q.toString();
};

export const register = (email, password, name) =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });
export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const me = () => request('/api/auth/me');

export const listDevices = () => request('/api/devices');
export const createPairingCode = () => request('/api/devices/pairing-codes', { method: 'POST' });
export const removeDevice = (id) => request(`/api/devices/${id}`, { method: 'DELETE' });

export const latest = (id) => request(`/api/devices/${id}/latest`);
export const history = (id, params) => request(`/api/devices/${id}/history?${query(params)}`);
export const stats = (id, params) => request(`/api/devices/${id}/stats?${query(params)}`);
export const eta = (id, destLat, destLng) => request(`/api/devices/${id}/eta?${query({ destLat, destLng })}`);
