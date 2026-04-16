import axios from 'axios';

// In dev, Vite proxies "/api" to localhost:4000 (see vite.config.js).
// In prod (Vercel), set VITE_API_URL to your Render backend URL, e.g. https://onpe-backend.onrender.com
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({ baseURL, timeout: 20000 });

export const getSnapshot = () => api.get('/election/snapshot').then((r) => r.data);
export const refreshSnapshot = () => api.post('/election/refresh').then((r) => r.data);
export const getCandidateHistory = (dni) =>
  api.get(`/election/history/${encodeURIComponent(dni)}`).then((r) => r.data);
export const getTimeline = () => api.get('/election/history/timeline').then((r) => r.data);
export const subscribe = (email, candidateDnis) =>
  api.post('/subscription/subscribe', { email, candidateDnis }).then((r) => r.data);
export const unsubscribe = (email) =>
  api.delete('/subscription/unsubscribe', { data: { email } }).then((r) => r.data);

export default api;
