/** Business analysis types */

export interface MarketAnalysis {
  estimatedConsumerBase: number;
  potentialCustomerSegments: CustomerSegment[];
  demandIndicators: DemandIndicator[];
  distributionChannels: string[];
  localMarketReach: number; // in KM
  nearbyVillages: NearbyVillage[];
}

export interface CustomerSegment {
  name: string;
  percentage: number;
  description: string;
}

export interface DemandIndicator {
  label: string;
  value: number;
  maxValue: number;
  unit: string;
}

export interface NearbyVillage {
  name: string;
  distance: number;
  population: number;
  coordinates: { lat: number; lng: number };
}

export interface Competitor {
  id: string;
  name: string;
  category: string;
  distance: number;
  coordinates: { lat: number; lng: number };
  estimatedRevenue?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  reason: string;
  potentialCustomer: string;
  estimatedInvestment: string;
  risk: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface Risk {
  id: string;
  title: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ProductPricing {
  product: string;
  referenceMin: number;
  referenceMax: number;
  suggestedRetail: number;
  suggestedBulk: number;
  suggestedDirectDelivery: number;
  localFactors: string[];
  competitorReference: string;
  customerSegments: string[];
}
