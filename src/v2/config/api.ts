import axios from 'axios';
import { demoAdapter } from '@/v2/demo/demoApi';
import { getToken, redirectToPortal } from '@/utils/session';

/**
 * Demo data (S1 prototype): VITE_DEMO_DATA=true answers every request in the
 * browser from generated data, so no request reaches scorecard-be. Off unless
 * the variable is set, so production builds never use it by default.
 */
export const DEMO_DATA = import.meta.env.VITE_DEMO_DATA === 'true';

/**
 * 2.0 API client. Live mode (S3) talks to scorecard-be v2 (BigQuery,
 * read-only) at VITE_API_BASE_URL with the portal session token, as 1.0 does
 * (FEAT-AUTH). A 401 sends the browser back to the portal to sign in.
 */
export const api = axios.create({
  baseURL: DEMO_DATA ? '/api' : import.meta.env.VITE_API_BASE_URL,
  timeout: 120_000,
  // Repeated keys (classification=A&classification=B), as scorecard-be expects.
  paramsSerializer: { indexes: null },
  ...(DEMO_DATA ? { adapter: demoAdapter } : {}),
});

if (!DEMO_DATA) {
  if (!import.meta.env.VITE_API_BASE_URL) console.warn('VITE_API_BASE_URL is not set: Supply Chain Pulse 2.0 has no API to call');
  api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  api.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error?.response?.status === 401) redirectToPortal();
      return Promise.reject(error);
    },
  );
}
