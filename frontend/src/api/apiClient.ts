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

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  data?: any;

  constructor(message: string, status: number, code?: string, requestId?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.data = data;
  }
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

  let authToken = '';
  try {
    authToken =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('vyavsaymitra-token') ||
      localStorage.getItem('token') ||
      '';
    if (!authToken) {
      const stored = localStorage.getItem('vyavsaymitra-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        authToken = parsed.state?.token || '';
      }
    }
  } catch {}

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
      const status = response.status;
      let errorMsg = data.message || data.error?.message;
      const errorCode = data.code || data.error?.code;
      const requestId = data.error?.requestId || response.headers.get('x-request-id') || undefined;

      if (status === 401) {
        // Expired or invalid token: clean up local authentication tokens safely
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('vyavsaymitra-token');
          localStorage.removeItem('token');
        } catch {}
        errorMsg = errorMsg || 'Your session has expired. Please log in again.';
      } else if (status === 403) {
        errorMsg = errorMsg || 'You do not have permission to access this resource.';
      } else if (status === 404) {
        errorMsg = errorMsg || 'The requested resource was not found.';
      } else if (status === 429) {
        errorMsg = errorMsg || 'Too many requests. Please wait a few moments before trying again.';
      } else if (status === 503) {
        errorMsg = errorMsg || 'The service is temporarily unavailable. Please try again shortly.';
      } else if (status >= 500) {
        errorMsg = errorMsg || 'A server error occurred. Please try again later.';
      }

      throw new ApiError(errorMsg, status, errorCode, requestId, data);
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your network or server status.', 408, 'REQUEST_TIMEOUT');
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

  getProfile: () =>
    apiRequest<{ success: boolean; data: any }>('/auth/profile', {
      method: 'GET',
    }),

  updateProfile: (profileData: any) =>
    apiRequest<{ success: boolean; data: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  login: (identifier: string, password?: string) =>
    apiRequest<{
      success: boolean;
      message?: string;
      token?: string;
      user?: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  ensureSession: () =>
    apiRequest<{
      success: boolean;
      message?: string;
      token?: string;
      user?: any;
    }>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({}),
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

// ─── Multi-Business & Workspace API Service ──────────────────────────────
export const businessesApi = {
  list: () =>
    apiRequest<{ success: boolean; count: number; data: any[] }>('/businesses', {
      method: 'GET',
    }),

  getStats: () =>
    apiRequest<{
      success: boolean;
      data: {
        businessesCount: number;
        completedAnalysesCount: number;
        savedReportsCount: number;
        matchedSchemesCount: number;
      };
    }>('/businesses/stats', {
      method: 'GET',
    }),

  create: (payload: {
    name: string;
    domain: 'agriculture' | 'foodtech';
    business_type: string;
    location?: any;
    inputs?: any;
  }) =>
    apiRequest<{ success: boolean; message: string; data: any }>('/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  get: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}`, {
      method: 'GET',
    }),

  update: (id: string, payload: any) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  analyze: (id: string, payload: any = {}) =>
    apiRequest<{
      success: boolean;
      message: string;
      data: {
        analysis: any;
        calculationResult: any;
        advisoryResult?: any;
      };
    }>(`/businesses/${encodeURIComponent(id)}/analyze`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMarket: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/market`, {
      method: 'GET',
    }),

  getSchemes: (id: string) =>
    apiRequest<{ success: boolean; count: number; data: any[] }>(`/businesses/${encodeURIComponent(id)}/schemes`, {
      method: 'GET',
    }),

  chatAi: (id: string, message: string) =>
    apiRequest<{
      success: boolean;
      data: {
        reply: string;
        source: string;
        contextUsed: any;
      };
    }>(`/businesses/${encodeURIComponent(id)}/ai`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  listReports: (id: string) =>
    apiRequest<{ success: boolean; count: number; data: any[] }>(`/businesses/${encodeURIComponent(id)}/reports`, {
      method: 'GET',
    }),

  createReport: (id: string, payload: { title?: string; reportType?: string; summary?: string }) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/reports`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Phase 7 Action Plan & Execution Endpoints
  getActionPlan: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/action-plan`, {
      method: 'GET',
    }),

  createTask: (id: string, payload: { title: string; description?: string; category?: string; priority?: string; due_date?: string }) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/action-plan/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTask: (id: string, taskId: string, updates: any) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/action-plan/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteTask: (id: string, taskId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/businesses/${encodeURIComponent(id)}/action-plan/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
    }),

  getDocuments: (id: string) =>
    apiRequest<{ success: boolean; count: number; data: any[] }>(`/businesses/${encodeURIComponent(id)}/documents`, {
      method: 'GET',
    }),

  updateDocument: (id: string, docId: string, payload: { status?: string; notes?: string; document_name?: string; rejection_reason?: string }) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getProgress: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/progress`, {
      method: 'GET',
    }),

  getTimeline: (id: string, limit = 50) =>
    apiRequest<{ success: boolean; count: number; data: any[] }>(`/businesses/${encodeURIComponent(id)}/timeline?limit=${limit}`, {
      method: 'GET',
    }),

  listDprVersions: (id: string) =>
    apiRequest<{ success: boolean; count: number; data: any[] }>(`/businesses/${encodeURIComponent(id)}/dpr-versions`, {
      method: 'GET',
    }),

  createDprVersion: (id: string, payload: { title?: string; summary?: string }) =>
    apiRequest<{ success: boolean; data: any }>(`/businesses/${encodeURIComponent(id)}/dpr-versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMarketTrends: (id: string) =>
    apiRequest<{ success: boolean; available: boolean; commodity?: string; unit?: string; dataPoints: any[]; message?: string }>(
      `/businesses/${encodeURIComponent(id)}/market/trends`,
      {
        method: 'GET',
      }
    ),

  // Phase 8 Document Vault Endpoints
  uploadDocument: (
    id: string,
    payload: {
      documentType: string;
      documentName?: string;
      fileName: string;
      mimeType: string;
      fileData: string;
      notes?: string;
    }
  ) =>
    apiRequest<{ success: boolean; message: string; data: { document: any; version: any } }>(
      `/businesses/${encodeURIComponent(id)}/documents/upload`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getDocument: (id: string, docId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
      {
        method: 'GET',
      }
    ),

  getDocumentDownloadUrl: (id: string, docId: string) =>
    `/api/businesses/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/download`,

  getDocumentPreviewUrl: (id: string, docId: string) =>
    `/api/businesses/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/preview`,

  deleteDocument: (id: string, docId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/businesses/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
      {
        method: 'DELETE',
      }
    ),

  listDocumentVersions: (id: string, docId: string) =>
    apiRequest<{ success: boolean; data: { documentId: string; currentVersion: number; versions: any[] } }>(
      `/businesses/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/versions`,
      {
        method: 'GET',
      }
    ),

  // Phase 8 Application Tracking Endpoints
  listApplications: (id: string) =>
    apiRequest<{ success: boolean; data: { businessId: string; applications: any[] } }>(
      `/businesses/${encodeURIComponent(id)}/applications`,
      {
        method: 'GET',
      }
    ),

  createApplication: (id: string, payload: any) =>
    apiRequest<{ success: boolean; message: string; data: any }>(
      `/businesses/${encodeURIComponent(id)}/applications`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getApplication: (id: string, appId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${encodeURIComponent(id)}/applications/${encodeURIComponent(appId)}`,
      {
        method: 'GET',
      }
    ),

  updateApplication: (id: string, appId: string, updates: any) =>
    apiRequest<{ success: boolean; message: string; data: any }>(
      `/businesses/${encodeURIComponent(id)}/applications/${encodeURIComponent(appId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    ),

  deleteApplication: (id: string, appId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/businesses/${encodeURIComponent(id)}/applications/${encodeURIComponent(appId)}`,
      {
        method: 'DELETE',
      }
    ),

  getApplicationTimeline: (id: string, appId: string) =>
    apiRequest<{ success: boolean; data: { applicationId: string; timeline: any[] } }>(
      `/businesses/${encodeURIComponent(id)}/applications/${encodeURIComponent(appId)}/timeline`,
      {
        method: 'GET',
      }
    ),

  linkApplicationDocument: (id: string, appId: string, documentId: string, isRequired = true) =>
    apiRequest<{ success: boolean; message: string; data: any }>(
      `/businesses/${encodeURIComponent(id)}/applications/${encodeURIComponent(appId)}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({ documentId, isRequired }),
      }
    ),

  unlinkApplicationDocument: (id: string, appId: string, documentId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/businesses/${encodeURIComponent(id)}/applications/${encodeURIComponent(appId)}/documents/${encodeURIComponent(documentId)}`,
      {
        method: 'DELETE',
      }
    ),

  // Phase 8 Execution Readiness & Smart Pending Actions
  getExecutionReadiness: (id: string) =>
    apiRequest<{ success: boolean; data: { businessId: string; overallState: string; scorecard: any } }>(
      `/businesses/${encodeURIComponent(id)}/execution/readiness`,
      {
        method: 'GET',
      }
    ),

  getBusinessPendingActions: (id: string) =>
    apiRequest<{ success: boolean; data: { count?: number; totalPending?: number; actions: any[] } }>(
      `/businesses/${encodeURIComponent(id)}/execution/pending-actions`,
      {
        method: 'GET',
      }
    ),

  getGlobalPendingActions: () =>
    apiRequest<{ success: boolean; data: { count?: number; totalPending?: number; actions: any[] } }>(
      `/businesses/execution/pending-actions`,
      {
        method: 'GET',
      }
    ),
};

// ─── Notifications API Service ──────────────────────────────────────────
export const notificationsApi = {
  list: () =>
    apiRequest<{
      success: boolean;
      count: number;
      data: Array<{
        id: string;
        user_id: string;
        business_id?: string;
        type: string;
        title: string;
        message: string;
        is_read: boolean;
        created_at: string;
      }>;
    }>('/notifications', {
      method: 'GET',
    }),

  markRead: (id: string) =>
    apiRequest<{ success: boolean; message: string; data?: any }>(
      `/notifications/${encodeURIComponent(id)}/read`,
      {
        method: 'PATCH',
      }
    ),

  markAllRead: () =>
    apiRequest<{ success: boolean; message: string }>('/notifications/read-all', {
      method: 'POST',
    }),
};

// ─── Phase 11 Pilot, Outcomes, Feedback & Admin API Services ─────────
export const outcomesApi = {
  list: (businessId: string) =>
    apiRequest<{ success: boolean; count: number; outcomes: any[] }>(
      `/businesses/${encodeURIComponent(businessId)}/outcomes`,
      { method: 'GET' }
    ),
  create: (businessId: string, payload: { outcome_type: string; value: number | string; unit?: string; period?: string; source?: string; notes?: string }) =>
    apiRequest<{ success: boolean; message: string; outcome: any }>(
      `/businesses/${encodeURIComponent(businessId)}/outcomes`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  getPerformance: (businessId: string) =>
    apiRequest<{ success: boolean; performance: any }>(
      `/businesses/${encodeURIComponent(businessId)}/performance`,
      { method: 'GET' }
    ),
  getAnalytics: (businessId: string) =>
    apiRequest<{ success: boolean; metrics: any }>(
      `/businesses/${encodeURIComponent(businessId)}/analytics`,
      { method: 'GET' }
    ),
  getEffectiveness: (businessId: string) =>
    apiRequest<{ success: boolean; effectiveness: any }>(
      `/businesses/${encodeURIComponent(businessId)}/recommendations/effectiveness`,
      { method: 'GET' }
    ),
  recordRecommendationAction: (businessId: string, payload: { recommendation_id: string; recommendation_type?: string; status: string; task_id?: string; metadata?: any }) =>
    apiRequest<{ success: boolean; record: any }>(
      `/businesses/${encodeURIComponent(businessId)}/recommendations/action`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
};

export const feedbackApi = {
  submit: (payload: { rating: number; category: string; message?: string; business_id?: string; feature?: string }) =>
    apiRequest<{ success: boolean; message: string; feedback: any }>(
      '/feedback',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  list: () =>
    apiRequest<{ success: boolean; feedback: any[] }>(
      '/feedback',
      { method: 'GET' }
    )
};

export const adminApi = {
  getMetrics: (params?: { window_days?: number }) => {
    const qs = new URLSearchParams();
    if (params?.window_days) qs.set('window_days', String(params.window_days));
    const qStr = qs.toString();
    return apiRequest<{ success: boolean; metrics: any; pilot: any; featureFlags: any }>(
      `/admin/metrics${qStr ? `?${qStr}` : ''}`,
      { method: 'GET' }
    );
  },
  getHealth: () =>
    apiRequest<{ success: boolean; health: any }>(
      '/admin/health',
      { method: 'GET' }
    ),
  getUsage: (params?: { event_type?: string; limit?: number; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.event_type) qs.set('event_type', params.event_type);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.page) qs.set('page', String(params.page));
    const qStr = qs.toString();
    return apiRequest<{ success: boolean; total: number; page: number; limit: number; items: any[] }>(
      `/admin/usage${qStr ? `?${qStr}` : ''}`,
      { method: 'GET' }
    );
  },
  getFeedback: (params?: { category?: string; min_rating?: number; limit?: number; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.min_rating) qs.set('min_rating', String(params.min_rating));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.page) qs.set('page', String(params.page));
    const qStr = qs.toString();
    return apiRequest<{ success: boolean; total: number; page: number; limit: number; items: any[] }>(
      `/admin/feedback${qStr ? `?${qStr}` : ''}`,
      { method: 'GET' }
    );
  },
  getOutcomes: () =>
    apiRequest<{ success: boolean; outcomes: any }>(
      '/admin/outcomes',
      { method: 'GET' }
    ),
  getOperations: () =>
    apiRequest<{ success: boolean; operations: any; timestamp: string }>(
      '/admin/operations',
      { method: 'GET' }
    ),
  getReliability: () =>
    apiRequest<{ success: boolean; reliability: any; timestamp: string }>(
      '/admin/reliability',
      { method: 'GET' }
    )
};

export const fieldOpsApi = {
  listVisits: (businessId?: string, params?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const qStr = qs.toString();
    const endpoint = businessId ? `/businesses/${businessId}/field-visits` : '/field-visits';
    return apiRequest<{ success: boolean; data: any[]; pagination?: any }>(
      `${endpoint}${qStr ? `?${qStr}` : ''}`,
      { method: 'GET' }
    );
  },
  createVisit: (businessId: string, payload: { scheduledDate: string; visitType?: string; officerId?: string; notes?: string; checklist?: any[] }) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/field-visits`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  updateVisit: (businessId: string, visitId: string, payload: { status?: string; notes?: string; verificationResult?: string }) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/field-visits/${visitId}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    ),
  updateChecklistItem: (businessId: string, visitId: string, payload: { itemId: string; completed: boolean; notes?: string; evidenceIds?: string[] }) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/field-visits/${visitId}/checklist`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
};

export const evidenceApi = {
  listEvidence: (businessId: string, params?: { taskId?: string; outcomeId?: string; evidenceType?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.taskId) qs.set('taskId', params.taskId);
    if (params?.outcomeId) qs.set('outcomeId', params.outcomeId);
    if (params?.evidenceType) qs.set('evidenceType', params.evidenceType);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const qStr = qs.toString();
    return apiRequest<{ success: boolean; data: any[]; pagination?: any }>(
      `/businesses/${businessId}/evidence${qStr ? `?${qStr}` : ''}`,
      { method: 'GET' }
    );
  },
  createEvidence: (businessId: string, payload: any) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/evidence`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  updateEvidence: (businessId: string, evidenceId: string, payload: { verificationStatus?: string; reviewNotes?: string }) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/evidence/${evidenceId}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    ),
  deleteEvidence: (businessId: string, evidenceId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/businesses/${businessId}/evidence/${evidenceId}`,
      { method: 'DELETE' }
    )
};

export const journeyApi = {
  getJourney: (businessId: string) =>
    apiRequest<{ success: boolean; businessId: string; stages: any[]; evaluatedAt: string }>(
      `/businesses/${businessId}/journey`,
      { method: 'GET' }
    ),
  getDataQuality: (businessId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/data-quality`,
      { method: 'GET' }
    ),
  getStaleData: (businessId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/stale-data`,
      { method: 'GET' }
    ),
  getExecutionCenter: (businessId: string) =>
    apiRequest<{ success: boolean; businessId: string; data: any }>(
      `/businesses/${businessId}/execution-center`,
      { method: 'GET' }
    ),
  verifyOutcome: (businessId: string, outcomeId: string, payload: { verificationStatus: string; evidenceIds?: string[]; notes?: string }) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/outcomes/${outcomeId}/verify`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
};

export const partnerApi = {
  listPartners: (businessId: string) =>
    apiRequest<{ success: boolean; data: any[] }>(
      `/businesses/${businessId}/partners`,
      { method: 'GET' }
    ),
  assignPartner: (businessId: string, payload: { partnerId: string; partnerName?: string; partnerRole: string; notes?: string }) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/partners`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  updatePartner: (businessId: string, partnerId: string, payload: { status?: string; notes?: string }) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/partners/${partnerId}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    )
};

// ── Business Intelligence Pipeline API ──
export const intelligenceApi = {
  getScenarioAnalysis: (businessId: string, config?: any) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/scenarios`,
      config ? { method: 'POST', body: JSON.stringify({ config }) } : { method: 'GET' }
    ),
  getLoanComparison: (businessId: string, loanOptions?: any[]) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/loan-comparison`,
      loanOptions ? { method: 'POST', body: JSON.stringify({ loanOptions }) } : { method: 'GET' }
    ),
  getStructuredAnalysis: (businessId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/intelligence`,
      { method: 'GET', timeoutMs: 45000 }
    ),
  getCompetitors: (businessId: string) =>
    apiRequest<{ success: boolean; data: any }>(
      `/businesses/${businessId}/competitors`,
      { method: 'GET' }
    )
};


