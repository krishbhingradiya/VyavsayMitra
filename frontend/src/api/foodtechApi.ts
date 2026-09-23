/**
 * VYAVSAYMITRA — Centralized FoodTech API Client (Phase 3 Step 5)
 * 
 * Interacts with backend FoodTech endpoints:
 * - GET  /api/business/foodtech/models
 * - GET  /api/business/foodtech/models/:id
 * - POST /api/business/foodtech/calculate
 * - POST /api/business/foodtech/validate-mass-balance
 * - POST /api/business/foodtech/advisory
 */

import { API_BASE_URL } from './apiClient';
import type {
  FoodTechModelSummary,
  FoodTechModelResponse,
  FoodTechSingleModelResponse,
  FoodTechInputPayload,
  FoodTechCalculationResult,
  FoodTechAdvisoryResult,
} from '../types/foodtech';

export class FoodTechApiError extends Error {
  status?: string;
  missingInputs?: string[];
  data?: any;
  httpStatus?: number;

  constructor(message: string, options?: { status?: string; missingInputs?: string[]; data?: any; httpStatus?: number }) {
    super(message);
    this.name = 'FoodTechApiError';
    this.status = options?.status;
    this.missingInputs = options?.missingInputs;
    this.data = options?.data;
    this.httpStatus = options?.httpStatus;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({
    success: false,
    message: res.statusText,
  }));

  if (!res.ok) {
    throw new FoodTechApiError(json.message || json.error || `HTTP ${res.status}: Request failed`, {
      status: json.status,
      missingInputs: json.missingInputs,
      data: json.data,
      httpStatus: res.status,
    });
  }

  return json;
}

export const foodtechApi = {
  /**
   * Fetches the complete catalog of verified FoodTech institutional models.
   * Route: GET /api/business/foodtech/models
   */
  getModels: async (): Promise<FoodTechModelSummary[]> => {
    const res = await fetch(`${API_BASE_URL}/business/foodtech/models`);
    const json = await handleResponse<FoodTechModelResponse>(res);
    return json.data || [];
  },

  /**
   * Fetches the detailed specification and benchmark defaults for a single model.
   * Route: GET /api/business/foodtech/models/:id
   */
  getModelById: async (businessId: string): Promise<FoodTechModelSummary> => {
    const res = await fetch(`${API_BASE_URL}/business/foodtech/models/${encodeURIComponent(businessId)}`);
    const json = await handleResponse<FoodTechSingleModelResponse>(res);
    return json.data;
  },

  /**
   * Executes calculation for the given model with mass balance validation.
   * Route: POST /api/business/foodtech/calculate
   */
  calculate: async (payload: FoodTechInputPayload): Promise<FoodTechCalculationResult> => {
    const res = await fetch(`${API_BASE_URL}/business/foodtech/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await handleResponse<{ success: boolean; data: FoodTechCalculationResult }>(res);
    return json.data;
  },

  /**
   * Validates physical mass balance conservation prior to calculation.
   * Route: POST /api/business/foodtech/validate-mass-balance
   */
  validateMassBalance: async (payload: Partial<FoodTechInputPayload>): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/business/foodtech/validate-mass-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  /**
   * Generates comprehensive advisory, viability, break-even, sensitivity, and scheme recommendations.
   * Route: POST /api/business/foodtech/advisory
   */
  getAdvisory: async (payload: FoodTechInputPayload): Promise<FoodTechAdvisoryResult> => {
    const res = await fetch(`${API_BASE_URL}/business/foodtech/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await handleResponse<{ success: boolean; data: FoodTechAdvisoryResult }>(res);
    return json.data;
  },
};
