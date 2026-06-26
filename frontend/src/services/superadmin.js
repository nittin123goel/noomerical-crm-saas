import axios from 'axios';

// Same backend as the tenant app, but the superadmin panel keeps its own token
// (sa_token) so it never collides with a tenant user session.
const base = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/superadmin`
  : '/api/superadmin';

const saApi = axios.create({ baseURL: base, timeout: 30_000 });

saApi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

saApi.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 403 || err.response?.status === 401) {
      localStorage.removeItem('sa_token');
      if (!window.location.pathname.endsWith('/superadmin/login'))
        window.location.href = '/superadmin/login';
    }
    return Promise.reject(err);
  },
);

export default saApi;
