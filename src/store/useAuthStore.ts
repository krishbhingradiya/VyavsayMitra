import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Partial<User>) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  completeOnboarding: () => void;
}

const DEMO_USER: User = {
  id: 'demo-001',
  name: 'Ramesh Patel',
  phone: '+91 98765 43210',
  email: 'ramesh@example.com',
  preferredLanguage: 'gu',
  location: {
    state: 'Gujarat',
    district: 'Anand',
    block: 'Anand',
    village: 'Changa',
    coordinates: { lat: 22.5977, lng: 72.8126 },
  },
  businessInterest: 'dairy',
  capital: 100000,
  experience: 'beginner',
  onboardingComplete: true,
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (_email: string, _password: string) => {
        set({ isLoading: true });
        // Mock auth: simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        set({
          user: DEMO_USER,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      },

      register: async (userData: Partial<User>) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 800));
        const newUser: User = {
          ...DEMO_USER,
          ...userData,
          id: `user-${Date.now()}`,
          onboardingComplete: false,
          createdAt: new Date().toISOString(),
        };
        set({
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      completeOnboarding: () => {
        set((state) => ({
          user: state.user ? { ...state.user, onboardingComplete: true } : null,
        }));
      },
    }),
    {
      name: 'vyavsaymitra-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
