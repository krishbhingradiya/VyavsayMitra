/**
 * VYAVSAYMITRA — Centralized API Client Layer
 *
 * Configurable via environment variables (VITE_API_BASE_URL or VITE_API_URL).
 * Normalizes requests, authentication tokens, error handling, and responses.
 */

// Normalized API base URL without trailing slash
const RAW_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_BASE_URL = RAW_URL.endsWith('/api')
  ? RAW_URL
  : RAW_URL.replace(/\/+$/, '') + '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Standard fetch wrapper with JSON serialization, timeout, and centralized error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 15000, headers = {}, ...customConfig } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...(headers as Record<string, string>),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({
      success: response.ok,
      status: response.status,
      message: response.statusText,
    }));

    if (!response.ok) {
      throw new Error(data.message || `API request failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your network or server status.');
    }
    throw err;
  }
}

// ─── Authentication API Service ──────────────────────────────────────────
export const authApi = {
  sendOtp: (email: string, name?: string, phone?: string) =>
    apiRequest<{
      success: boolean;
      message: string;
      cooldownRemaining?: number;
      expiresInSeconds?: number;
      data?: any;
    }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, name, phone }),
    }),

  verifyOtp: (email: string, otp: string) =>
    apiRequest<{
      success: boolean;
      message?: string;
      user?: any;
      token?: string;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  resendOtp: (email: string) =>
    apiRequest<{ success: boolean; message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  getMe: (token?: string) =>
    apiRequest<{ success: boolean; user: any }>('/auth/me', {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  logout: () =>
    apiRequest<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),
};

// ─── Business & Advisory API Service ────────────────────────────────────
export const businessApi = {
  analyzeBusiness: (payload: Record<string, any>) =>
    apiRequest('/business/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  calculateViability: (payload: Record<string, any>) =>
    apiRequest('/business/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  predictMl: (task: 'crop_yield' | 'crop_suitability' | 'mandi_price', params: Record<string, any>) =>
    apiRequest('/business/predict', {
      method: 'POST',
      body: JSON.stringify({ task, ...params }),
    }),

  classifyArchetype: (query: string) =>
    apiRequest(`/business/archetype?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    }),

  getBenchmark: (type: string) =>
    apiRequest(`/business/data/business/${encodeURIComponent(type)}`, {
      method: 'GET',
    }),

  getEligibleSchemes: (params: { type?: string; cost?: number; rural?: boolean }) => {
    const qs = new URLSearchParams();
    if (params.type) qs.append('type', params.type);
    if (params.cost !== undefined) qs.append('cost', String(params.cost));
    if (params.rural !== undefined) qs.append('rural', String(params.rural));
    return apiRequest(`/business/schemes?${qs.toString()}`, {
      method: 'GET',
    });
  },

  checkHealth: () =>
    apiRequest('/health', {
      method: 'GET',
    }),
};
