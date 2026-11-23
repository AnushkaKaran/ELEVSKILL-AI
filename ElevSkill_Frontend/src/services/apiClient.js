export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const AUTH_TOKEN_KEY = 'elevskill_auth_token';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  try {
    if (!token) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch {
    // ignore storage errors
  }
}

export class BackendApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR', details = null } = {}) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body = null, isFormData = false, signal } = {}) {
  const token = getAuthToken();
  const headers = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!isFormData && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === null ? undefined : isFormData ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new BackendApiError('Request cancelled.', { code: 'ABORTED' });
    }
    throw new BackendApiError(
      'Unable to reach the ELEVSKILL backend server. Please ensure it is running.',
      { code: 'NETWORK_ERROR' }
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new BackendApiError('Received an invalid response from the backend server.', {
      status: response.status,
      code: 'INVALID_RESPONSE',
    });
  }

  if (!response.ok || payload?.success === false) {
    throw new BackendApiError(
      payload?.message || `Request failed with status ${response.status}`,
      {
        status: response.status,
        code: payload?.code || 'API_ERROR',
        details: payload?.details || null,
      }
    );
  }

  return payload?.data ?? payload;
}
