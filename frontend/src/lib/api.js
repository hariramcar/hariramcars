import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:5000/api';

// Validate API URL is not empty
if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not set');
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,        // 15s timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Attach JWT bearer token if available
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('admin_token');
      if (storedToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
    }

    // Force Vercel to bypass Next.js and hit the backend directly (only on live domains)
    const isLiveDomain = typeof window !== 'undefined' && 
      (window.location.hostname.includes('hariramcars.com') || window.location.hostname.includes('vercel.app'));

    if (process.env.NODE_ENV === 'production' && config.url && isLiveDomain) {
      // Remove leading slash if present
      const cleanPath = config.url.startsWith('/') ? config.url.substring(1) : config.url;
      // Split path and query parameters to prevent Vercel swallowing them
      const [basePath, searchStr] = cleanPath.split('?');
      config.baseURL = '';
      config.url = `/backend/server.js?path=${basePath}${searchStr ? '&' + searchStr : ''}`;
    } else if (config.url) {
      config.headers['X-Original-Path'] = config.url;
    }

    // Add CSRF protection header safely
    if (typeof document !== 'undefined') {
      try {
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf='))
          ?.split('=')[1];

        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      } catch (err) {
        console.warn('Could not read CSRF cookie');
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error codes
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        if (
          window.location.pathname.startsWith('/admin') &&
          window.location.pathname !== '/admin/login'
        ) {
          window.location.href = '/admin/login';
        }
      }
    }

    // Handle network errors
    if (!error.response && !axios.isCancel(error) && error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
      console.error('Network error — check your connection');
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    }

    return Promise.reject(error);
  }
);

export default api;
