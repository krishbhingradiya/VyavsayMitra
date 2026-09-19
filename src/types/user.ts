/** User profile and authentication types */

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  preferredLanguage: 'en' | 'hi' | 'gu';
  location: UserLocation;
  businessInterest: BusinessCategory;
  capital: number;
  experience: ExperienceLevel;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface UserLocation {
  state: string;
  district: string;
  block: string;
  village: string;
  coordinates?: { lat: number; lng: number };
}

export type ExperienceLevel = 'beginner' | 'some' | 'experienced';

export type BusinessCategory =
  | 'dairy'
  | 'retail'
  | 'textile'
  | 'food-processing'
  | 'agriculture'
  | 'poultry'
  | 'manufacturing'
  | 'services'
  | 'other';

export const BUSINESS_CATEGORIES: { value: BusinessCategory; labelKey: string; icon: string }[] = [
  { value: 'dairy', labelKey: 'business.dairy', icon: '🥛' },
  { value: 'retail', labelKey: 'business.retail', icon: '🏪' },
  { value: 'textile', labelKey: 'business.textile', icon: '🧵' },
  { value: 'food-processing', labelKey: 'business.foodProcessing', icon: '🍲' },
  { value: 'agriculture', labelKey: 'business.agriculture', icon: '🌾' },
  { value: 'poultry', labelKey: 'business.poultry', icon: '🐔' },
  { value: 'manufacturing', labelKey: 'business.manufacturing', icon: '🏭' },
  { value: 'services', labelKey: 'business.services', icon: '🛠️' },
  { value: 'other', labelKey: 'business.other', icon: '📋' },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; labelKey: string }[] = [
  { value: 'beginner', labelKey: 'experience.beginner' },
  { value: 'some', labelKey: 'experience.some' },
  { value: 'experienced', labelKey: 'experience.experienced' },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
