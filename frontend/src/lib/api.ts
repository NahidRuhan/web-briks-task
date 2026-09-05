import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(public message: string, public status: number, public payload: ApiErrorPayload | null = null) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  const token = Cookies.get('accessToken');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let res = await fetch(url, config);

  // Simple token refresh logic
  if (res.status === 401) {
    const refreshToken = Cookies.get('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          Cookies.set('accessToken', data.accessToken);
          Cookies.set('refreshToken', data.refreshToken);
          
          // Retry original request
          headers.set('Authorization', `Bearer ${data.accessToken}`);
          res = await fetch(url, { ...config, headers });
        } else {
          // Refresh failed, log out
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          if (typeof window !== 'undefined') {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/login';
          }
        }
      } catch {
        // Network error during refresh
      }
    }
  }

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch {}

    throw new ApiError(
      payload?.message || payload?.error || 'Request failed',
      res.status,
      payload
    );
  }

  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
};
