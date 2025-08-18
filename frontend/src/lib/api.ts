import axios from 'axios';
import type { 
  AuthResponse, 
  User, 
  Prompt, 
  UserStats, 
  CreatePromptData, 
  LoginData, 
  RegisterData,
  ApiResponse 
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Only redirect to login if we're not already on an auth page
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.startsWith('/auth/');
        const isPublicPage = currentPath === '/' || currentPath.startsWith('/prompts/') && !currentPath.includes('/create');
        
        if (!isAuthPage && !isPublicPage) {
          const redirectUrl = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
          console.log('🔄 401 error, redirecting to:', redirectUrl);
          window.location.href = redirectUrl;
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },
};

// User API
export const userApi = {
  async getProfile(): Promise<User> {
    const response = await api.get('/user/profile');
    return response.data;
  },

  async getStats(): Promise<UserStats> {
    const response = await api.get('/user/stats');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put('/user/profile', data);
    return response.data;
  },
};

// Prompts API
export const promptsApi = {
  async getPrompts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tags?: string[];
  }): Promise<{ prompts: Prompt[]; pagination: any }> {
    const response = await api.get('/prompts', { params });
    return response.data;
  },

  async getPublicPrompts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tags?: string[];
  }): Promise<{ prompts: Prompt[]; pagination: any }> {
    const response = await api.get('/prompts/public', { params });
    return response.data;
  },

  async getPrompt(id: string): Promise<Prompt> {
    const response = await api.get(`/prompts/${id}`);
    return response.data;
  },

  async createPrompt(data: CreatePromptData): Promise<Prompt> {
    const response = await api.post('/prompts', data);
    return response.data;
  },

  async updatePrompt(id: string, data: Partial<CreatePromptData>): Promise<Prompt> {
    const response = await api.put(`/prompts/${id}`, data);
    return response.data;
  },

  async deletePrompt(id: string): Promise<void> {
    await api.delete(`/prompts/${id}`);
  },

  async duplicatePrompt(id: string): Promise<Prompt> {
    const response = await api.post(`/prompts/${id}/duplicate`);
    return response.data;
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{ status: string; timestamp: string; version: string }> {
    const response = await axios.get('/health');
    return response.data;
  },
};

export default api; 