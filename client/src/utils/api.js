const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    ...(options.headers || {})
  };
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && /^\/api\/(pantries|items)(\/|$)/.test(path)) {
    window.dispatchEvent(new Event('pantry-activity-updated'));
  }
  return payload;
}
