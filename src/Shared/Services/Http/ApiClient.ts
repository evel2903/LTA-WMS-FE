import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { ENV } from '@app/Config/Env';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { ApiErrorBody, ApiResponse } from '@shared/Types/Api';

/**
 * The single configured Axios instance for the whole app.
 *
 * Auth model (see Auth-Integration-FE.md): JWTs live in HttpOnly cookies, so
 * JavaScript never reads/attaches tokens. The two non-negotiables are:
 *   1. `withCredentials: true` on every request (the browser sends the cookies).
 *   2. NO `Authorization` header — authentication is entirely cookie-based.
 *
 * Repositories depend on the `HttpClient` interface below, never on Axios
 * directly, keeping the Infrastructure layer in charge of all HTTP detail.
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${ENV.apiBaseUrl}${ENV.apiPrefix}`,
  timeout: ENV.apiTimeout,
  withCredentials: true, // REQUIRED — always send the auth cookies
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Auth endpoints live at the host root (`/auth/...`), outside the WMS API
 * prefix. Repositories pass this config so those calls bypass `apiPrefix`.
 */
export const AUTH_REQUEST_CONFIG: AxiosRequestConfig = { baseURL: ENV.apiBaseUrl };

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// ── Single-flight refresh ───────────────────────────────────────────────────
// CRITICAL: refresh tokens rotate and old ones are revoked on use. If several
// 401s fire a refresh in parallel, the second replays a revoked token → the
// server treats it as reuse/theft and kills ALL sessions. So at most one
// /auth/refresh may be in flight; concurrent 401s await the same promise.
let refreshing: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  // No body — the server reads the refresh_token cookie. Hits the host root.
  return axiosInstance
    .post('/auth/refresh', null, AUTH_REQUEST_CONFIG)
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(
        new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Lỗi kết nối mạng' }),
      );
    }

    const status = error.response?.status ?? 0;
    const original = error.config as RetriableConfig | undefined;
    const url = original?.url ?? '';

    // Never auto-refresh the auth endpoints themselves, and retry at most once.
    const isAuthFlow =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    if (status === 401 && original && !original._retried && !isAuthFlow) {
      original._retried = true;
      try {
        refreshing ??= refreshSession();
        await refreshing;
        return await axiosInstance(original); // retry with the fresh cookies
      } catch {
        // Refresh failed → session is over. Let guards redirect to /login.
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }

    const body = error.response?.data as ApiErrorBody | undefined;
    return Promise.reject(ApiError.fromBody(status, body));
  },
);

/**
 * Transport-agnostic contract that repositories depend on. Returns unwrapped
 * `Data` payloads — the `{ Success, Data }` envelope is handled here.
 */
export interface HttpClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

type AxiosPayload<T> = ApiResponse<T> | T;

function isApiResponse<T>(payload: AxiosPayload<T>): payload is ApiResponse<T> {
  return Boolean(payload && typeof payload === 'object' && 'Data' in payload && 'Success' in payload);
}

function unwrap<T>(payload: AxiosPayload<T>): T {
  return isApiResponse(payload) ? payload.Data : payload;
}

export const httpClient: HttpClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig) => {
    const response = await axiosInstance.get<AxiosPayload<T>>(url, config);
    return unwrap(response.data);
  },
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => {
    const response = await axiosInstance.post<AxiosPayload<T>>(url, body, config);
    return unwrap(response.data);
  },
  put: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => {
    const response = await axiosInstance.put<AxiosPayload<T>>(url, body, config);
    return unwrap(response.data);
  },
  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => {
    const response = await axiosInstance.patch<AxiosPayload<T>>(url, body, config);
    return unwrap(response.data);
  },
  delete: async <T>(url: string, config?: AxiosRequestConfig) => {
    const response = await axiosInstance.delete<AxiosPayload<T>>(url, config);
    return unwrap(response.data);
  },
};

export { axiosInstance };
