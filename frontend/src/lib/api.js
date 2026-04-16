import axios from 'axios';

// In dev, Vite proxies "/api" to localhost:4000 (see vite.config.js).
// In prod (Vercel), set VITE_API_URL to your Render backend URL, e.g. https://onpe-backend.onrender.com
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({ baseURL, timeout: 45000 });

/**
 * Retry interceptor — handles Render Free cold-starts. When the backend is
 * asleep, the first request gets a 404/502/503 with no CORS headers while the
 * container spins up (~30 s). We silently retry up to 3 times with exponential
 * backoff so the user sees a single "loading" state instead of an error flash.
 */
const RETRY_STATUS = new Set([0, 404, 502, 503, 504]);
const MAX_RETRIES = 3;

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config || {};
  const status = error.response?.status ?? 0;
  const isNetwork = !error.response; // CORS/network failures land here
  const retriable = isNetwork || RETRY_STATUS.has(status);

  config.__retryCount = config.__retryCount || 0;
  if (!retriable || config.__retryCount >= MAX_RETRIES) {
    return Promise.reject(error);
  }

  config.__retryCount += 1;
  const delayMs = 1500 * 2 ** (config.__retryCount - 1); // 1.5s, 3s, 6s
  console.warn(
    `[api] retry ${config.__retryCount}/${MAX_RETRIES} after ${delayMs}ms (${config.url})`
  );
  await new Promise((r) => setTimeout(r, delayMs));
  return api(config);
});

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
