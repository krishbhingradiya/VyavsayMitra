/** Common UI types */

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface NavigationItem {
  label: string;
  labelKey: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

export interface Report {
  id: string;
  type: 'feasibility' | 'financial' | 'business-plan';
  title: string;
  business: string;
  location: string;
  createdAt: string;
  status: 'ready' | 'generating' | 'draft';
}

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'hi' | 'gu';
