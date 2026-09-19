import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketAnalysis, Competitor, Opportunity, SWOTAnalysis, Risk, ProductPricing } from '../types/business';
import { getDemoMarketData, getDemoCompetitors, getDemoOpportunities, getDemoSWOT, getDemoRisks, getDemoPricing } from '../data/demoBusinessData';

interface BusinessState {
  marketAnalysis: MarketAnalysis | null;
  competitors: Competitor[];
  opportunities: Opportunity[];
  swot: SWOTAnalysis | null;
  risks: Risk[];
  pricing: ProductPricing[];
  analysisRadius: number;
  isAnalyzing: boolean;

  setAnalysisRadius: (radius: number) => void;
  loadDemoData: (business: string, location: string) => void;
  setMarketAnalysis: (data: MarketAnalysis) => void;
  setCompetitors: (data: Competitor[]) => void;
  setOpportunities: (data: Opportunity[]) => void;
  setSWOT: (data: SWOTAnalysis) => void;
  setRisks: (data: Risk[]) => void;
  setPricing: (data: ProductPricing[]) => void;
  resetAnalysis: () => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      marketAnalysis: null,
      competitors: [],
      opportunities: [],
      swot: null,
      risks: [],
      pricing: [],
      analysisRadius: 5,
      isAnalyzing: false,

      setAnalysisRadius: (radius) => set({ analysisRadius: radius }),

      loadDemoData: (business, location) => {
        set({ isAnalyzing: true });
        // Simulate loading
        setTimeout(() => {
          set({
            marketAnalysis: getDemoMarketData(business, location),
            competitors: getDemoCompetitors(business, location),
            opportunities: getDemoOpportunities(business),
            swot: getDemoSWOT(business, location),
            risks: getDemoRisks(business),
            pricing: getDemoPricing(business),
            isAnalyzing: false,
          });
        }, 500);
      },

      setMarketAnalysis: (data) => set({ marketAnalysis: data }),
      setCompetitors: (data) => set({ competitors: data }),
      setOpportunities: (data) => set({ opportunities: data }),
      setSWOT: (data) => set({ swot: data }),
      setRisks: (data) => set({ risks: data }),
      setPricing: (data) => set({ pricing: data }),

      resetAnalysis: () =>
        set({
          marketAnalysis: null,
          competitors: [],
          opportunities: [],
          swot: null,
          risks: [],
          pricing: [],
        }),
    }),
    {
      name: 'vyavsaymitra-business',
    }
  )
);
