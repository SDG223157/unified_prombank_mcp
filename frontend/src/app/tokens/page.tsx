'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ApiToken {
  id: string;
  name: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  preview: string;
  status: 'active' | 'inactive' | 'expired';
}

interface CreateTokenForm {
  name: string;
  permissions: string[];
  expiresIn?: number;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTokenForm>({
    defaultValues: {
      permissions: ['read'],
    }
  });

  useEffect(() => {
    checkAuth();
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, checkAuth, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTokens();
    }
  }, [isAuthenticated]);

  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/tokens', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }

      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (error: any) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load API tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const createToken = async (data: CreateTokenForm) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create token');
      }

      const result = await response.json();
      setNewToken(result.token.accessLink);
      setShowCreateForm(false);
      reset();
      fetchTokens();
      toast.success('API token created successfully!');
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast.error(error.message || 'Failed to create token');
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke token');
      }

      toast.success('Token revoked successfully');
      fetchTokens();
    } catch (error: any) {
      console.error('Error revoking token:', error);
      toast.error('Failed to revoke token');
    }
  };

  const toggleTokenStatus = async (tokenId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/tokens/${tokenId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update token');
      }

      toast.success(`Token ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchTokens();
    } catch (error: any) {
      console.error('Error updating token:', error);
      toast.error('Failed to update token');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                API Tokens
              </h1>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              + Create Token
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* New Token Display */}
        {newToken && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-green-900">
                🎉 Token Created Successfully!
              </h3>
              <button
                onClick={() => setNewToken(null)}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <p className="text-sm text-gray-600 mb-2">
                Copy this token and save it securely. It won't be shown again!
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-100 p-2 rounded font-mono text-sm">
                  {newToken}
                </code>
                <button
                  onClick={() => copyToClipboard(newToken)}
                  className="btn-secondary text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h4 className="font-medium text-blue-900 mb-2">Cursor Configuration:</h4>
              <pre className="text-sm text-blue-800 overflow-x-auto">
{`{
  "mcpServers": {
    "prompt-bank": {
      "command": "npx",
      "args": ["prombank-mcp"],
      "env": {
        "PROMPTHOUSE_ACCESS_LINK": "${newToken}"
      }
    }
  }
}`}
              </pre>
              <button
                onClick={() => copyToClipboard(`{
  "mcpServers": {
    "prompt-bank": {
      "command": "npx",
      "args": ["prombank-mcp"],
      "env": {
        "PROMPTHOUSE_ACCESS_LINK": "${newToken}"
      }
    }
  }
}`)}
                className="btn-secondary text-sm mt-2"
              >
                Copy Configuration
              </button>
            </div>
          </div>
        )}

        {/* Create Token Form */}
        {showCreateForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Token</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(createToken)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Token Name *
                </label>
                <input
                  {...register('name', { 
                    required: 'Token name is required',
                    maxLength: { value: 100, message: 'Name must be less than 100 characters' }
                  })}
                  type="text"
                  className="input mt-1"
                  placeholder="e.g., Cursor IDE, Development Machine"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      {...register('permissions')}
                      type="checkbox"
                      value="read"
                      className="h-4 w-4 text-brand-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Read - View and search prompts
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      {...register('permissions')}
                      type="checkbox"
                      value="write"
                      className="h-4 w-4 text-brand-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Write - Create and edit prompts
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expires In (days)
                </label>
                <select
                  {...register('expiresIn', { valueAsNumber: true })}
                  className="input mt-1"
                >
                  <option value="">Never expires</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Creating...' : 'Create Token'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            🔌 Connect to Cursor IDE
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            <p>
              Use these API tokens to connect your Premium Prompt House to Cursor IDE via MCP (Model Context Protocol).
            </p>
            <div>
              <p className="font-medium mb-2">Setup Steps:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Create an API token with the permissions you need</li>
                <li>Copy the Cursor configuration and add it to your Cursor MCP settings</li>
                <li>Install the MCP package: <code className="bg-blue-100 px-1 rounded">npm install -g prombank-mcp</code></li>
                <li>Start using your prompts directly in Cursor!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Tokens List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your API Tokens</h3>
          </div>

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tokens...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                🔑
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No API tokens yet</h3>
              <p className="text-gray-500 mb-4">Create your first token to connect Cursor IDE</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                Create First Token
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tokens.map((token) => (
                <div key={token.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">
                          {token.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(token.status)}`}>
                          {token.status}
                        </span>
                        <div className="flex space-x-1">
                          {token.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>Token: {token.preview}</span>
                          <span>Created: {formatDate(token.createdAt)}</span>
                          {token.lastUsedAt && (
                            <span>Last used: {formatDate(token.lastUsedAt)}</span>
                          )}
                          {token.expiresAt && (
                            <span>Expires: {formatDate(token.expiresAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {token.status === 'active' && (
                        <button
                          onClick={() => toggleTokenStatus(token.id, false)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Deactivate
                        </button>
                      )}
                      {token.status === 'inactive' && (
                        <button
                          onClick={() => toggleTokenStatus(token.id, true)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => deleteToken(token.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 