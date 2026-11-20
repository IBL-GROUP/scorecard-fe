import axios from 'axios';
import { getToken, redirectToPortal } from '@/utils/session';

/**
 * API client: scorecard-be (BigQuery, read-only) at VITE_API_BASE_URL, with the
 * portal session token. A 401 sends the browser back to the portal to sign in.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 120_000,
  // Repeated keys (classification=A&classification=B), as scorecard-be expects.
  paramsSerializer: { indexes: null },
});

if (!import.meta.env.VITE_API_BASE_URL) console.warn('VITE_API_BASE_URL is not set: Supply Chain Pulse has no API to call');
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
