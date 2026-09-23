import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/user';

import { authApi } from '../api/apiClient';

interface OtpResponse {
  success: boolean;
  message: string;
  cooldownRemaining?: number;
  expiresInSeconds?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Partial<User>) => Promise<boolean>;
  sendOtp: (email: string) => Promise<OtpResponse>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
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
      user: DEMO_USER,
      isAuthenticated: true,
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

      sendOtp: async (email: string) => {
        set({ isLoading: true });
        try {
          const data = await authApi.sendOtp(email);
          set({ isLoading: false });
          return {
            success: data.success,
            message: data.message || 'OTP sent successfully',
            cooldownRemaining: data.cooldownRemaining,
            expiresInSeconds: data.expiresInSeconds,
          };
        } catch (err: any) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.message || 'Unable to connect to server. Please check your connection.',
          };
        }
      },

      verifyOtp: async (email: string, otp: string) => {
        set({ isLoading: true });
        try {
          const data = await authApi.verifyOtp(email, otp);

          if (data.success && data.user) {
            const otpUser: User = {
              ...DEMO_USER,
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || data.user.email.split('@')[0],
              phone: data.user.phone || '',
              onboardingComplete: false,
            };
            set({
              user: otpUser,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }

          set({ isLoading: false });
          throw new Error(data.message || 'OTP verification failed.');
        } catch (err) {
          set({ isLoading: false });
          if (err instanceof Error) {
            throw err;
          }
          throw new Error('Unable to connect to server. Please check your connection.');
        }
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
