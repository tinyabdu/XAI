import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('xai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('xai_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);



export const login       = (username, password)      => api.post('/api/auth/login', { username, password });
export const logout      = ()                        => api.post('/api/auth/logout');
export const getMe       = ()                        => api.get('/api/auth/me');
export const getReport   = (events = 25, hours = 8) => api.get(`/api/report?events=${events}&hours=${hours}`);
export const getSimulate = (n = 10, hours = 8)      => api.get(`/api/simulate?n=${n}&hours=${hours}`);
export const getShapGlobal = ()                      => api.get('/api/shap/global');
export const postPredict = (data)                    => api.post('/api/predict', data);
export const getHealth   = ()                        => api.get('/api/health');
export const getLogs     = (limit = 100)             => api.get(`/api/logs?limit=${limit}`);

export const postAction  = (data)         => api.post('/api/actions', data);
export const getActions  = ()             => api.get('/api/actions');
