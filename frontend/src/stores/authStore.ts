import { create } from 'zustand';
import type { User, LoginData, RegisterData } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
  checkAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (data: LoginData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data);
      const { user, token } = response;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      const { user, token } = response;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    const token = localStorage.getItem('auth_token');
    set({ 
      user, 
      isAuthenticated: true,
      token 
    });
  },

  checkAuth: () => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          token,
          isAuthenticated: true,
        });
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
  },
})); 