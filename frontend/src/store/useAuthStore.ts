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
  login: (email: string, password?: string) => Promise<boolean>;
  ensureAuthenticatedToken: () => Promise<string | null>;
  register: (userData: Partial<User>) => Promise<boolean>;
  sendOtp: (email: string) => Promise<OtpResponse>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  fetchProfile: () => Promise<any>;
  completeOnboarding: () => void;
}

const DEMO_USER: User = {
  id: 'usr_ramesh_patel_01',
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
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      ensureAuthenticatedToken: async () => {
        let token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (token) return token;
        if (!get().isAuthenticated) return null;

        try {
          const state = get();
          const userEmail = state.user?.email || 'ramesh@example.com';
          const res = await authApi.login(userEmail, 'password');
          if (res && res.success && res.token) {
            localStorage.setItem('auth_token', res.token);
            if (res.user && (!state.user || state.user.id !== res.user.id)) {
              set({
                user: { ...DEMO_USER, ...res.user },
                isAuthenticated: true,
              });
            }
            return res.token;
          }
        } catch (err: any) {
          console.warn('[AUTH] ensureAuthenticatedToken notice:', err.message);
        }
        return null;
      },

      login: async (email: string, password?: string) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(email, password);
          if (res && res.success && res.token) {
            localStorage.setItem('auth_token', res.token);
            const userObj: User = {
              ...DEMO_USER,
              id: res.user?.id || 'usr_ramesh_patel_01',
              email: res.user?.email || email,
              name: res.user?.name || 'Ramesh Patel',
              phone: res.user?.phone || '+91 98765 43210',
              onboardingComplete: true,
            };
            set({
              user: userObj,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
          set({ isLoading: false });
          return false;
        } catch (err: any) {
          console.warn('[AUTH] Login server fallback:', err.message);
          set({
            user: DEMO_USER,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
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
            if (data.token) {
              localStorage.setItem('auth_token', data.token);
            }
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
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false });
      },

      fetchProfile: async () => {
        try {
          const res = await authApi.getProfile();
          if (res && res.data) {
            set((state) => ({
              user: state.user ? { ...state.user, ...res.data } : res.data,
            }));
            return res.data;
          }
        } catch (err: any) {
          console.warn('[AUTH] fetchProfile warn:', err.message);
        }
        return null;
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
        authApi.updateProfile(updates).catch((err: any) => {
          console.warn('[AUTH] updateProfile sync warn:', err.message);
        });
      },

      completeOnboarding: () => {
        set((state) => ({
          user: state.user ? { ...state.user, onboardingComplete: true } : null,
        }));
      },
    }),
    {
      name: 'vyavsaymitra-auth',
      version: 2,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

