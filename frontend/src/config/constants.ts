import { INDIAN_STATES } from '../types/user';
export { INDIAN_STATES };
/** App-wide constants */

export const APP_NAME = 'VYAVSAYMITRA';
export const APP_TAGLINE_HERO = 'Sapne Se Safal Vyavsay Tak';
export const APP_TAGLINE_SECONDARY = 'Vyavsay Ka Sahi Saathi';
export const APP_BRAND_LINE = 'Market. Money. Mitra.';
export const APP_DESCRIPTION = 'AI-Powered Hyper-Local Business Advisory & Financial Planning Platform for Rural Entrepreneurs';

export const LANGUAGES = [
  { code: 'en' as const, label: 'English', nativeLabel: 'English' },
  { code: 'hi' as const, label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'gu' as const, label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
];

export const ANALYSIS_RADIUS_OPTIONS = [
  { value: 5, label: '5 KM' },
  { value: 10, label: '10 KM' },
];

/** Placeholder statistics for the landing page (to be replaced with verified live values) */
export const LANDING_STATS = [
  { value: 500, suffix: '+', labelKey: 'stats.businessIdeas' },
  { value: 100, suffix: '+', labelKey: 'stats.schemes' },
  { value: 1000000, suffix: '+', labelKey: 'stats.entrepreneurs', displayValue: '1M' },
  { value: 28, suffix: '+', labelKey: 'stats.states' },
];

export const ONBOARDING_STEPS = [
  { step: 1, titleKey: 'onboarding.step1Title' },
  { step: 2, titleKey: 'onboarding.step2Title' },
  { step: 3, titleKey: 'onboarding.step3Title' },
  { step: 4, titleKey: 'onboarding.step4Title' },
  { step: 5, titleKey: 'onboarding.step5Title' },
  { step: 6, titleKey: 'onboarding.step6Title' },
];

export const OPERATING_COST_CATEGORIES = [
  { id: 'raw-materials', labelKey: 'finance.rawMaterials' },
  { id: 'labour', labelKey: 'finance.labour' },
  { id: 'rent', labelKey: 'finance.rent' },
  { id: 'electricity', labelKey: 'finance.electricity' },
  { id: 'transport', labelKey: 'finance.transport' },
  { id: 'maintenance', labelKey: 'finance.maintenance' },
  { id: 'marketing', labelKey: 'finance.marketing' },
  { id: 'other', labelKey: 'finance.other' },
];

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
