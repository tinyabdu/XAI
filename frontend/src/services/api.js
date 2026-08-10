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
      localStorage.removeItem('xai_role');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);


// ── Auth ───────────────────────────────────────────────────────────────
export const register  = (data)            => api.post('/api/auth/register', data);
export const login     = (email, password) => api.post('/api/auth/login', { email, password });
export const logout    = ()                => api.post('/api/auth/logout');
export const getMe     = ()                => api.get('/api/auth/me');

// ── Student ────────────────────────────────────────────────────────────
export const getProgrammes       = () => api.get('/api/programmes');
export const postApplication     = (data) => api.post('/api/applications', data);
export const getMyApplication    = () => api.get('/api/applications/me');
export const getDocTypes         = () => api.get('/api/documents/types');
export const getMyDocuments      = () => api.get('/api/applications/documents');
export const uploadDocument      = (docType, file) => {
  const fd = new FormData();
  fd.append('doc_type', docType);
  fd.append('file', file);
  return api.post('/api/applications/documents', fd);
};
export const deleteDocument      = (id) => api.delete(`/api/documents/${id}`);
export const downloadUrl         = (id) => {
  const token = localStorage.getItem('xai_token');
  return `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/documents/${id}/download?token=${encodeURIComponent(token || '')}`;
};

// ── Admin ──────────────────────────────────────────────────────────────
export const getAdminApplications = ()     => api.get('/api/admin/applications');
export const runAdmission        = ()      => api.post('/api/admin/run-admission');
export const overrideApplication = (id, data) => api.post(`/api/admin/applications/${id}/override`, data);
export const getDepartments      = ()      => api.get('/api/admin/departments');
export const createDepartment    = (data) => api.post('/api/admin/departments', data);
export const createCourse        = (data) => api.post('/api/admin/courses', data);
export const updateCourse        = (id, data) => api.put(`/api/admin/courses/${id}`, data);
export const deleteCourse        = (id)    => api.delete(`/api/admin/courses/${id}`);