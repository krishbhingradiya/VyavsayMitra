/**
 * Demo business data generators.
 * All data is synthetic and labeled as demo/prototype information.
 */

import type { MarketAnalysis, Competitor, Opportunity, SWOTAnalysis, Risk, ProductPricing } from '../types/business';

export function getDemoMarketData(_business: string, _location: string): MarketAnalysis {
  return {
    estimatedConsumerBase: 12500,
    potentialCustomerSegments: [
      { name: 'Households', percentage: 45, description: 'Local village and nearby households' },
      { name: 'Tea Shops & Restaurants', percentage: 20, description: 'Local eateries and chai vendors' },
      { name: 'Sweet Shops', percentage: 15, description: 'Mithai and bakery shops' },
      { name: 'Retail Stores', percentage: 12, description: 'Grocery and general stores' },
      { name: 'Institutional', percentage: 8, description: 'Schools, hostels, hospitals' },
    ],
    demandIndicators: [
      { label: 'Daily Milk Demand', value: 2500, maxValue: 5000, unit: 'Litres' },
      { label: 'Supply Gap', value: 800, maxValue: 2500, unit: 'Litres' },
      { label: 'Price Willingness', value: 65, maxValue: 100, unit: '₹/Litre' },
      { label: 'Growth Potential', value: 72, maxValue: 100, unit: '%' },
    ],
    distributionChannels: ['Direct Delivery', 'Local Retail', 'Collection Center', 'Cooperative'],
    localMarketReach: 10,
    nearbyVillages: [
      { name: 'Mogri', distance: 3.2, population: 3200, coordinates: { lat: 22.5850, lng: 72.8200 } },
      { name: 'Bakrol', distance: 4.5, population: 5600, coordinates: { lat: 22.6050, lng: 72.8350 } },
      { name: 'Lambhvel', distance: 6.1, population: 4100, coordinates: { lat: 22.5700, lng: 72.7900 } },
      { name: 'Navli', distance: 7.8, population: 2800, coordinates: { lat: 22.6150, lng: 72.8500 } },
      { name: 'Adas', distance: 8.5, population: 3500, coordinates: { lat: 22.5600, lng: 72.8400 } },
    ],
  };
}

export function getDemoCompetitors(_business: string, _location: string): Competitor[] {
  return [
    { id: 'c1', name: 'Shree Dairy', category: 'Dairy', distance: 2.3, coordinates: { lat: 22.5920, lng: 72.8180 }, estimatedRevenue: '₹2-4 Lakh/month' },
    { id: 'c2', name: 'Patel Milk Center', category: 'Dairy', distance: 3.8, coordinates: { lat: 22.6010, lng: 72.8250 }, estimatedRevenue: '₹1-2 Lakh/month' },
    { id: 'c3', name: 'Village Cooperative', category: 'Dairy Cooperative', distance: 4.2, coordinates: { lat: 22.5850, lng: 72.8050 }, estimatedRevenue: '₹5-8 Lakh/month' },
    { id: 'c4', name: 'Fresh Farm Dairy', category: 'Dairy', distance: 6.5, coordinates: { lat: 22.6100, lng: 72.8400 }, estimatedRevenue: '₹1-3 Lakh/month' },
    { id: 'c5', name: 'Amul Collection', category: 'Dairy Collection', distance: 5.1, coordinates: { lat: 22.5780, lng: 72.7950 }, estimatedRevenue: '₹10+ Lakh/month' },
  ];
}

export function getDemoOpportunities(_business: string): Opportunity[] {
  return [
    {
      id: 'o1',
      title: 'Home Delivery Service',
      reason: 'Growing demand for doorstep milk delivery in nearby villages',
      potentialCustomer: 'Households within 5 KM',
      estimatedInvestment: '₹15,000 - ₹25,000',
      risk: 'low',
      suggestedAction: 'Start with 50-100 households, expand gradually',
    },
    {
      id: 'o2',
      title: 'Value Added Products',
      reason: 'Paneer, curd, and buttermilk have higher margins than raw milk',
      potentialCustomer: 'Restaurants, Sweet Shops, Retail',
      estimatedInvestment: '₹50,000 - ₹1,00,000',
      risk: 'medium',
      suggestedAction: 'Begin with curd and buttermilk, add paneer later',
    },
    {
      id: 'o3',
      title: 'B2B Supply to Restaurants',
      reason: 'Local restaurants need reliable daily milk supply',
      potentialCustomer: 'Tea shops, restaurants, canteens',
      estimatedInvestment: '₹10,000 - ₹20,000',
      risk: 'low',
      suggestedAction: 'Build relationships with 10-15 local eateries',
    },
    {
      id: 'o4',
      title: 'Organic / A2 Milk Premium',
      reason: 'Rising health awareness creates demand for premium milk',
      potentialCustomer: 'Urban households, health-conscious buyers',
      estimatedInvestment: '₹30,000 - ₹60,000',
      risk: 'medium',
      suggestedAction: 'Certify and brand A2 milk for premium pricing',
    },
  ];
}

export function getDemoSWOT(_business: string, _location: string): SWOTAnalysis {
  return {
    strengths: [
      'Low initial capital requirement',
      'Daily cash flow from milk sales',
      'Growing local demand',
      'Availability of cattle in the region',
      'Support from dairy cooperatives',
    ],
    weaknesses: [
      'Perishable product requires cold chain',
      'Seasonal variations in milk production',
      'Limited processing capability initially',
      'Dependence on cattle health',
      'Initial lack of brand recognition',
    ],
    opportunities: [
      'Increasing demand for dairy products',
      'Value addition (paneer, curd, ghee)',
      'Government subsidies and schemes',
      'Growing home delivery market',
      'B2B supply to institutions',
    ],
    threats: [
      'Competition from established cooperatives',
      'Price fluctuations in feed costs',
      'Monsoon and disease outbreaks',
      'Regulatory compliance requirements',
      'Market price volatility',
    ],
  };
}

export function getDemoRisks(_business: string): Risk[] {
  return [
    {
      id: 'r1',
      title: 'Supply Chain Risk',
      reason: 'Dependence on limited local feed and cattle suppliers',
      impact: 'medium',
      mitigation: 'Maintain relationships with multiple suppliers and keep 15-day buffer stock of feed',
    },
    {
      id: 'r2',
      title: 'Market Price Risk',
      reason: 'Milk prices can fluctuate based on season and demand',
      impact: 'medium',
      mitigation: 'Diversify into value-added products with higher and more stable margins',
    },
    {
      id: 'r3',
      title: 'Cattle Health Risk',
      reason: 'Disease outbreaks can severely impact milk production',
      impact: 'high',
      mitigation: 'Regular veterinary check-ups, vaccination schedule, and insurance coverage',
    },
    {
      id: 'r4',
      title: 'Seasonal Demand Risk',
      reason: 'Milk demand may vary seasonally',
      impact: 'low',
      mitigation: 'Focus on products with stable year-round demand (curd, paneer)',
    },
    {
      id: 'r5',
      title: 'Regulatory Risk',
      reason: 'Food safety regulations may require compliance investments',
      impact: 'low',
      mitigation: 'Stay updated on FSSAI requirements and budget for compliance',
    },
  ];
}

export function getDemoPricing(_business: string): ProductPricing[] {
  return [
    {
      product: 'Full Cream Milk',
      referenceMin: 52,
      referenceMax: 65,
      suggestedRetail: 60,
      suggestedBulk: 52,
      suggestedDirectDelivery: 58,
      localFactors: ['Feed cost', 'Fat content', 'Season', 'Distance'],
      competitorReference: '₹55-62/litre in nearby area',
      customerSegments: ['Households', 'Retail Stores'],
    },
    {
      product: 'Toned Milk',
      referenceMin: 42,
      referenceMax: 52,
      suggestedRetail: 48,
      suggestedBulk: 42,
      suggestedDirectDelivery: 46,
      localFactors: ['Processing cost', 'Demand', 'Competition'],
      competitorReference: '₹44-50/litre in nearby area',
      customerSegments: ['Tea Shops', 'Restaurants', 'Institutions'],
    },
    {
      product: 'Curd (Dahi)',
      referenceMin: 60,
      referenceMax: 80,
      suggestedRetail: 70,
      suggestedBulk: 60,
      suggestedDirectDelivery: 68,
      localFactors: ['Quality', 'Packaging', 'Shelf life'],
      competitorReference: '₹65-75/kg in nearby area',
      customerSegments: ['Households', 'Restaurants', 'Retail'],
    },
    {
      product: 'Paneer',
      referenceMin: 280,
      referenceMax: 360,
      suggestedRetail: 320,
      suggestedBulk: 280,
      suggestedDirectDelivery: 310,
      localFactors: ['Milk quality', 'Yield rate', 'Freshness'],
      competitorReference: '₹300-350/kg in nearby area',
      customerSegments: ['Restaurants', 'Sweet Shops', 'Retail'],
    },
  ];
}

/** Demo schemes for the scheme advisor */
export const DEMO_SCHEMES = [
  {
    id: 'pm-mudra',
    name: 'PM MUDRA Yojana',
    purpose: 'Micro-enterprise loans for non-corporate, non-farm small/micro enterprises',
    loanRange: 'Up to ₹10 Lakh',
    interest: '7-12% (varies by lender)',
    tenure: '3-5 years',
    eligibility: ['Any Indian citizen', 'Non-farm enterprise', 'Business plan required'],
    documents: ['Identity Proof', 'Address Proof', 'Business Plan', 'Bank Statements'],
    source: 'Demo Information',
  },
  {
    id: 'pmegp',
    name: 'PMEGP',
    purpose: 'Setting up new micro enterprises in rural and urban areas',
    loanRange: '₹25 Lakh (Manufacturing) / ₹10 Lakh (Service)',
    interest: '11-12%',
    tenure: '3-7 years',
    eligibility: ['Age: 18+ years', '8th pass for projects above ₹10 Lakh', 'Rural area preference'],
    documents: ['Identity Proof', 'Address Proof', 'Project Report', 'Caste Certificate (if applicable)'],
    source: 'Demo Information',
  },
  {
    id: 'nabard-dairy',
    name: 'Dairy Entrepreneurship Development Scheme',
    purpose: 'Promote modern dairy farms and infrastructure',
    loanRange: 'Up to ₹20 Lakh (with subsidy)',
    interest: '10-12%',
    tenure: '5-7 years',
    eligibility: ['Farmer/Entrepreneur', 'Dairy project proposal', 'Land availability'],
    documents: ['Identity Proof', 'Land Documents', 'Project Report', 'Quotations for equipment'],
    source: 'Demo Information',
  },
  {
    id: 'stand-up',
    name: 'Stand-Up India',
    purpose: 'Loans for SC/ST and women entrepreneurs for greenfield enterprises',
    loanRange: '₹10 Lakh to ₹1 Crore',
    interest: 'Base Rate + 3%',
    tenure: '7 years',
    eligibility: ['SC/ST or Women', 'Greenfield enterprise', 'Age: 18+ years'],
    documents: ['Identity Proof', 'Caste Certificate', 'Project Report', 'Business Plan'],
    source: 'Demo Information',
  },
];

/** Demo funding sources */
export const DEMO_FUNDING_SOURCES = [
  {
    id: 'f1', name: 'District Industries Centre (DIC)', type: 'government' as const,
    purpose: 'Registration, guidance, and subsidy facilitation for MSMEs',
    potentialSupport: 'Varies by state scheme', eligibility: ['MSME registration', 'Valid project proposal'],
    documents: ['Business Registration', 'Project Report', 'Identity Proof'], website: '#',
  },
  {
    id: 'f2', name: 'State Bank of India', type: 'financial-institution' as const,
    purpose: 'MSME loans, Mudra loans, term loans for rural enterprises',
    potentialSupport: 'Up to ₹50 Lakh', eligibility: ['Business plan', 'Creditworthiness', 'Collateral for higher amounts'],
    documents: ['KYC', 'Project Report', 'Financial Statements'], website: '#',
  },
  {
    id: 'f3', name: 'KVIC (Khadi & Village Industries Commission)', type: 'channelizing-agency' as const,
    purpose: 'PMEGP scheme implementation and village industry promotion',
    potentialSupport: 'Up to ₹25 Lakh with 25-35% subsidy', eligibility: ['Age: 18+', 'Rural area', 'New enterprise'],
    documents: ['Project Report', 'Identity Proof', 'Address Proof', 'Education Certificate'], website: '#',
  },
];

/** Demo document checklist */
export const DEMO_DOCUMENTS = [
  { id: 'd1', label: 'Identity Proof (Aadhaar Card)', description: 'Valid Aadhaar card with clear photograph', category: 'Identity', isReady: true },
  { id: 'd2', label: 'Address Proof', description: 'Utility bill, ration card, or voter ID', category: 'Identity', isReady: true },
  { id: 'd3', label: 'PAN Card', description: 'Valid PAN card', category: 'Identity', isReady: false },
  { id: 'd4', label: 'Bank Account Details', description: 'Savings account passbook or statement', category: 'Financial', isReady: true },
  { id: 'd5', label: 'Business Proposal', description: 'Detailed project report with cost estimates', category: 'Business', isReady: false },
  { id: 'd6', label: 'Cost Estimates / Quotations', description: 'Quotations from equipment suppliers', category: 'Business', isReady: false },
  { id: 'd7', label: 'Margin Contribution Proof', description: 'Proof of own contribution amount', category: 'Financial', isReady: true },
  { id: 'd8', label: 'Passport-size Photographs', description: 'Recent photographs (4 copies)', category: 'Identity', isReady: true },
];
