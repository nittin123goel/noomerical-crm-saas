import axios from 'axios';
import { currentTenant } from './tenant';

// In production VITE_API_URL = https://api.noomerical.website
// In dev the Vite proxy rewrites /api → localhost:3000
const base = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: base,
  timeout: 30_000,
});

// Attach JWT token + tenant subdomain to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  // Tell the backend which business this is (frontend & API are on different hosts)
  const tenant = currentTenant();
  if (tenant) cfg.headers['X-Tenant'] = tenant;
  return cfg;
});

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
