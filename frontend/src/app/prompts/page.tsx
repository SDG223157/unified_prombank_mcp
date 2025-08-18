'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import PromptModal from '@/components/PromptModal';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Prompt {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'public'>('mine');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>();
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const { isAuthenticated, checkAuth, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log('🔍 Auth check useEffect triggered');
    console.log('🔒 isAuthenticated:', isAuthenticated);
    checkAuth();
    if (!isAuthenticated) {
      const currentUrl = window.location.pathname;
      console.log('❌ Not authenticated, redirecting to login from:', currentUrl);
      router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`);
    } else {
      console.log('✅ Authenticated, staying on prompts page');
    }
  }, [isAuthenticated, checkAuth, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrompts();
    }
  }, [isAuthenticated, filter]);

  // Load saved view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('prompts_view_mode');
    if (savedViewMode && ['grid', 'list', 'table'].includes(savedViewMode)) {
      setViewMode(savedViewMode as 'grid' | 'list' | 'table');
    }
  }, []);

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (mode: 'grid' | 'list' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('prompts_view_mode', mode);
  };

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/prompts?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          const currentUrl = window.location.pathname;
          router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`);
          return;
        }
        throw new Error('Failed to fetch prompts');
      }

      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error: any) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }

      toast.success('Prompt deleted successfully');
      fetchPrompts();
    } catch (error: any) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const openViewModal = (promptId: string) => {
    console.log('🔍 Opening view modal for prompt:', promptId);
    console.log('📊 Modal state BEFORE:', { modalOpen, selectedPromptId, modalMode });
    console.log('🔒 Authentication state:', { isAuthenticated, token: token ? 'exists' : 'missing' });
    console.log('🌐 Current URL:', window.location.href);
    
    setSelectedPromptId(promptId);
    setModalMode('view');
    setModalOpen(true);
    console.log('📊 Modal state AFTER setModalOpen(true)');
    
    // Check state after a brief delay
    setTimeout(() => {
      console.log('📊 Modal state DELAYED CHECK:', { modalOpen: true, selectedPromptId: promptId, modalMode: 'view' });
      console.log('🌐 URL after delay:', window.location.href);
    }, 100);
  };

  const openEditModal = (promptId: string) => {
    setSelectedPromptId(promptId);
    setModalMode('edit');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPromptId(undefined);
  };

  const handleModalSave = () => {
    fetchPrompts(); // Refresh the prompts list
    closeModal();
  };

  const filteredPrompts = prompts.filter(prompt => 
    prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                My Prompts
              </h1>
            </div>
            <Link
              href="/prompts/create"
              className="btn-primary"
            >
              + Create Prompt
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters and Search */}
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('mine')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'mine'
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Prompts
              </button>
              <button
                onClick={() => setFilter('public')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'public'
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Public Prompts
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'all'
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Prompts
              </button>
            </div>

            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Grid View"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => handleViewModeChange('table')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Table View"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Loading prompts...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No prompts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first prompt.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/prompts/create"
                  className="btn-primary"
                >
                  Create your first prompt
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Prompts Display */}
        {!isLoading && filteredPrompts.length > 0 && (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {prompt.title}
                          </h3>
                          {prompt.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {prompt.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {prompt.isPublic && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Public
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="mb-4 relative group">
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                          <pre className="whitespace-pre-wrap font-mono text-xs line-clamp-3">
                            {prompt.content}
                          </pre>
                        </div>
                        
                        {/* Quick Actions Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openViewModal(prompt.id);
                              }}
                              className="px-3 py-1 bg-white text-gray-700 rounded-full text-xs font-medium hover:bg-gray-100 transition-colors"
                            >
                              👁️ View Full
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/prompts/view/${prompt.id}?mode=edit`);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {prompt.tags.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {prompt.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {prompt.tags.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                +{prompt.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-xs text-gray-500 mb-4">
                        <div>Created {new Date(prompt.createdAt).toLocaleDateString()}</div>
                        {prompt.category && (
                          <div className="capitalize">Category: {prompt.category}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openViewModal(prompt.id)}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                          >
                            🔍 View
                          </button>
                          <button
                            onClick={() => router.push(`/prompts/view/${prompt.id}?mode=edit`)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => router.push(`/prompts/view/${prompt.id}`)}
                            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                          >
                            🔗 Full Page
                          </button>
                        </div>
                        
                        <button
                          onClick={() => deletePrompt(prompt.id)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {prompt.title}
                          </h3>
                          {prompt.isPublic && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Public
                            </span>
                          )}
                          {prompt.category && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              {prompt.category}
                            </span>
                          )}
                        </div>
                        
                        {prompt.description && (
                          <p className="text-gray-600 mb-4 text-base">
                            {prompt.description}
                          </p>
                        )}

                        {/* Content Preview */}
                        <div className="mb-4">
                          <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded border">
                            <pre className="whitespace-pre-wrap font-mono text-sm line-clamp-2">
                              {prompt.content}
                            </pre>
                          </div>
                        </div>

                        {/* Tags */}
                        {prompt.tags.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                              {prompt.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="text-sm text-gray-500">
                          <span>Created {new Date(prompt.createdAt).toLocaleDateString()}</span>
                          <span className="mx-2">•</span>
                          <span>Updated {new Date(prompt.updatedAt).toLocaleDateString()}</span>
                          {prompt.user && (
                            <>
                              <span className="mx-2">•</span>
                              <span>By {prompt.user.firstName || prompt.user.email}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-6">
                        <button
                          onClick={() => openViewModal(prompt.id)}
                          className="px-3 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-md transition-colors"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => router.push(`/prompts/view/${prompt.id}?mode=edit`)}
                          className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => router.push(`/prompts/view/${prompt.id}`)}
                          className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          🔗 Open
                        </button>
                        <button
                          onClick={() => deletePrompt(prompt.id)}
                          className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tags
                        </th>
                        <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPrompts.map((prompt) => (
                        <tr key={prompt.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {prompt.title}
                              </div>
                              {prompt.description && (
                                <div className="text-sm text-gray-500 truncate">
                                  {prompt.description}
                                </div>
                              )}
                              {/* Mobile-only info */}
                              <div className="sm:hidden mt-2 space-y-1">
                                {prompt.isPublic && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                                    Public
                                  </span>
                                )}
                                {prompt.category && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {prompt.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            {prompt.category ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {prompt.category}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4">
                            <div className="max-w-xs">
                              {prompt.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {prompt.tags.slice(0, 2).map((tag, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {prompt.tags.length > 2 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      +{prompt.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No tags</span>
                              )}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                            {prompt.isPublic ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Public
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Private
                              </span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(prompt.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openViewModal(prompt.id)}
                                className="text-brand-600 hover:text-brand-900"
                                title="View"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => router.push(`/prompts/view/${prompt.id}?mode=edit`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => router.push(`/prompts/view/${prompt.id}`)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Open"
                              >
                                🔗
                              </button>
                              <button
                                onClick={() => deletePrompt(prompt.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <PromptModal
        isOpen={modalOpen}
        onClose={closeModal}
        promptId={selectedPromptId}
        mode={modalMode}
        onSave={handleModalSave}
      />
    </div>
  );
} // Force deployment update - Tue Jul 15 05:07:07 CST 2025
