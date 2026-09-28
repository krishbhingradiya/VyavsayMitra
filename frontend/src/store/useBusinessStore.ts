/**
 * VYAVSAYMITRA — Multi-Business & Workspace State Store
 * 
 * Manages user businesses, active business workspace, verified calculations,
 * market intelligence, schemes, and AI Mitra sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BusinessEntity,
  MarketObservation,
  SchemeMatchItem,
  DprReport,
} from '../types/business';
import { businessesApi } from '../api/apiClient';
import { useAuthStore } from './useAuthStore';

function deduplicateBusinesses(list: BusinessEntity[]): BusinessEntity[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: BusinessEntity[] = [];
  for (const item of list) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export interface SelectBusinessResult {
  success: boolean;
  data?: BusinessEntity;
  status?: number;
  message?: string;
}

interface BusinessState {
  businesses: BusinessEntity[];
  activeBusiness: BusinessEntity | null;
  activeMarket: MarketObservation | null;
  activeSchemes: SchemeMatchItem[];
  activeReports: DprReport[];
  stats: {
    businessesCount: number;
    completedAnalysesCount: number;
    savedReportsCount: number;
    matchedSchemesCount: number;
  } | null;
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;

  // Actions
  fetchBusinesses: () => Promise<BusinessEntity[]>;
  fetchStats: () => Promise<any>;
  createBusiness: (payload: {
    name: string;
    domain: 'agriculture' | 'foodtech';
    business_type: string;
    location?: any;
    inputs?: any;
  }) => Promise<BusinessEntity>;
  selectBusiness: (id: string) => Promise<SelectBusinessResult>;
  updateBusiness: (id: string, updates: any) => Promise<void>;
  runAnalysis: (id: string, payload?: any) => Promise<any>;
  fetchMarketData: (id: string) => Promise<MarketObservation | null>;
  fetchSchemes: (id: string) => Promise<SchemeMatchItem[]>;
  fetchReports: (id: string) => Promise<DprReport[]>;
  createReport: (id: string, payload: { title?: string; reportType?: string; summary?: string }) => Promise<DprReport>;
  chatAi: (id: string, message: string) => Promise<string>;
  resetActiveBusiness: () => void;

  // Backward compatibility placeholders
  marketAnalysis: any;
  competitors: any[];
  opportunities: any[];
  swot: any;
  risks: any[];
  pricing: any[];
  analysisRadius: number;
  setAnalysisRadius: (radius: number) => void;
  loadDemoData: (business?: string, location?: string) => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      businesses: [],
      activeBusiness: null,
      activeMarket: null,
      activeSchemes: [],
      activeReports: [],
      stats: null,
      isLoading: false,
      isAnalyzing: false,
      error: null,

      // Backward compatibility stubs
      marketAnalysis: null,
      competitors: [],
      opportunities: [],
      swot: null,
      risks: [],
      pricing: [],
      analysisRadius: 5,
      setAnalysisRadius: (radius: number) => set({ analysisRadius: radius }),
      loadDemoData: (_biz?: string, _loc?: string) => {},

      fetchStats: async () => {
        try {
          await useAuthStore.getState().ensureAuthenticatedToken?.();
          const res = await businessesApi.getStats();
          if (res.data) {
            set({ stats: res.data });
            return res.data;
          }
          return null;
        } catch (err: any) {
          console.warn('[STORE] fetchStats warn:', err.message);
          return null;
        }
      },

      fetchBusinesses: async () => {
        set({ isLoading: true, error: null });
        try {
          await useAuthStore.getState().ensureAuthenticatedToken?.();
          const res = await businessesApi.list();
          const list = deduplicateBusinesses(res.data || []);
          set({ businesses: list, isLoading: false });

          // Also trigger real DB stats fetch
          get().fetchStats();

          // If no active business is selected, default to the first one
          if (!get().activeBusiness && list.length > 0) {
            set({ activeBusiness: list[0] });
          }
          return list;
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          return get().businesses;
        }
      },

      createBusiness: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          await useAuthStore.getState().ensureAuthenticatedToken?.();
          const res = await businessesApi.create(payload);
          const newBiz = res.data;
          set((state) => ({
            businesses: deduplicateBusinesses([newBiz, ...state.businesses]),
            activeBusiness: newBiz,
            isLoading: false,
            error: null,
          }));
          return newBiz;
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      selectBusiness: async (id: string): Promise<SelectBusinessResult> => {
        if (!id) {
          return { success: false, status: 400, message: 'Invalid business ID.' };
        }

        set({ isLoading: true, error: null });

        // Optimistically set active business if already in state, otherwise reset to prevent stale data bleed
        const cached = get().businesses.find((b) => b.id === id);
        if (cached) {
          set({ activeBusiness: cached });
        } else if (get().activeBusiness?.id !== id) {
          set({
            activeBusiness: null,
            activeMarket: null,
            activeSchemes: [],
            activeReports: [],
          });
        }

        try {
          await useAuthStore.getState().ensureAuthenticatedToken?.();
          const res = await businessesApi.get(id);
          const biz = res.data;

          set((state) => ({
            activeBusiness: biz,
            businesses: deduplicateBusinesses([biz, ...state.businesses.map((b) => (b.id === id ? biz : b))]),
            isLoading: false,
            error: null,
          }));

          // Automatically fetch linked sub-resources safely
          get().fetchMarketData(id).catch(() => null);
          get().fetchSchemes(id).catch(() => null);
          get().fetchReports(id).catch(() => null);

          return { success: true, data: biz };
        } catch (err: any) {
          const status = err.status || (err.message && err.message.includes('404') ? 404 : 500);
          const message = err.message || 'Failed to retrieve business record.';

          // If session expired (401), attempt quick refresh and retry once
          if (status === 401) {
            try {
              localStorage.removeItem('auth_token');
              const newToken = await useAuthStore.getState().ensureAuthenticatedToken?.();
              if (newToken) {
                const retryRes = await businessesApi.get(id);
                const retryBiz = retryRes.data;
                set((state) => ({
                  activeBusiness: retryBiz,
                  businesses: deduplicateBusinesses([retryBiz, ...state.businesses]),
                  isLoading: false,
                  error: null,
                }));
                get().fetchMarketData(id).catch(() => null);
                get().fetchSchemes(id).catch(() => null);
                get().fetchReports(id).catch(() => null);
                return { success: true, data: retryBiz };
              }
            } catch (_) {}
          }

          set({ isLoading: false, error: message });
          return { success: false, status, message };
        }
      },

      updateBusiness: async (id: string, updates: any) => {
        try {
          await useAuthStore.getState().ensureAuthenticatedToken?.();
          const res = await businessesApi.update(id, updates);
          const updated = res.data;
          set((state) => ({
            businesses: deduplicateBusinesses(state.businesses.map((b) => (b.id === id ? updated : b))),
            activeBusiness: state.activeBusiness?.id === id ? updated : state.activeBusiness,
          }));
        } catch (err: any) {
          set({ error: err.message });
          throw err;
        }
      },

      runAnalysis: async (id: string, payload: any = {}) => {
        set({ isAnalyzing: true, error: null });
        try {
          const res = await businessesApi.analyze(id, payload);
          const analysisData = res.data;

          // Refresh the business record to pick up latest analysis
          await get().selectBusiness(id);

          set({ isAnalyzing: false });
          return analysisData;
        } catch (err: any) {
          set({ isAnalyzing: false, error: err.message });
          throw err;
        }
      },

      fetchMarketData: async (id: string) => {
        try {
          const res = await businessesApi.getMarket(id);
          const market = res.data;
          set({ activeMarket: market });
          return market;
        } catch (err: any) {
          console.warn('[STORE] fetchMarketData warn:', err.message);
          return null;
        }
      },

      fetchSchemes: async (id: string) => {
        try {
          const res = await businessesApi.getSchemes(id);
          const schemes = res.data || [];
          set({ activeSchemes: schemes });
          return schemes;
        } catch (err: any) {
          console.warn('[STORE] fetchSchemes warn:', err.message);
          return [];
        }
      },

      fetchReports: async (id: string) => {
        try {
          const res = await businessesApi.listReports(id);
          const reports = res.data || [];
          set({ activeReports: reports });
          return reports;
        } catch (err: any) {
          console.warn('[STORE] fetchReports warn:', err.message);
          return [];
        }
      },

      createReport: async (id: string, payload) => {
        try {
          const res = await businessesApi.createReport(id, payload);
          const report = res.data;
          set((state) => ({ activeReports: [report, ...state.activeReports] }));
          return report;
        } catch (err: any) {
          throw err;
        }
      },

      chatAi: async (id: string, message: string) => {
        try {
          const res = await businessesApi.chatAi(id, message);
          return res.data?.reply || 'Advisory response received.';
        } catch (err: any) {
          throw err;
        }
      },

      resetActiveBusiness: () => {
        set({
          activeBusiness: null,
          activeMarket: null,
          activeSchemes: [],
          activeReports: [],
        });
      },
    }),
    {
      name: 'vyavsaymitra-business-store',
      partialize: (state) => ({
        businesses: state.businesses,
        activeBusiness: state.activeBusiness,
      }),
      merge: (persistedState: any, currentState: BusinessState) => ({
        ...currentState,
        ...(persistedState || {}),
        businesses: deduplicateBusinesses(persistedState?.businesses || []),
      }),
    }
  )
);
