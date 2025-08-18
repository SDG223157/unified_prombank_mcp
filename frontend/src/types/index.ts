export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  category?: string;
  version: number;
  parentId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  usageCount?: number;
  lastUsed?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user?: User;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserStats {
  stats: {
    totalPrompts: number;
    publicPrompts: number;
    privatePrompts: number;
    totalViews: number;
  };
  subscription: {
    tier: string;
    limits: {
      maxPrompts: number;
      features: string[];
    };
    usage: {
      prompts: number;
      promptsRemaining: number | string;
    };
  };
}

export interface CreatePromptData {
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  isPublic?: boolean;
  category?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
} 