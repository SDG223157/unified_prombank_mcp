'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PencilIcon, TrashIcon, ClipboardIcon } from '@heroicons/react/24/outline';

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

export default function PromptViewPage() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [variables, setVariables] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    content: '',
    tags: '',
    category: '',
    isPublic: false
  });
  
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, checkAuth, token } = useAuthStore();
  
  // Check for edit mode in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'edit') {
      setIsEditing(true);
    }
  }, []);

  useEffect(() => {
    console.log('🔍 PromptViewPage mounted, checking auth...');
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (id) {
      console.log('🚀 Loading prompt:', id);
      fetchPrompt();
    }
  }, [id, token]);

  const fetchPrompt = async () => {
    try {
      setIsLoading(true);
      console.log('📡 Fetching prompt:', id);
      
      const response = await fetch(`/api/prompts/${id}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please log in to view this prompt');
          router.push('/auth/login');
          return;
        }
        if (response.status === 404) {
          toast.error('Prompt not found');
          router.push('/prompts');
          return;
        }
        throw new Error('Failed to fetch prompt');
      }

      const data = await response.json();
      console.log('✅ Prompt loaded successfully');
      setPrompt(data);
      
      // Set edit form
      setEditForm({
        title: data.title,
        description: data.description || '',
        content: data.content,
        tags: data.tags.join(', '),
        category: data.category || '',
        isPublic: data.isPublic
      });
      
      // Extract variables from content
      const variableMatches = data.content.match(/\{\{(\w+)\}\}/g) || [];
      const uniqueVariables: string[] = Array.from(new Set(variableMatches.map((match: string) => match.slice(2, -2))));
      setVariables(uniqueVariables);
      
    } catch (error) {
      console.error('❌ Error fetching prompt:', error);
      toast.error('Failed to load prompt');
      router.push('/prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prompt || !isAuthenticated) {
      toast.error('Please log in to edit prompts');
      return;
    }

    try {
      console.log('💾 Saving prompt changes...');
      
      const tagsArray = editForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          content: editForm.content,
          tags: tagsArray,
          category: editForm.category,
          isPublic: editForm.isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update prompt');
      }

      const updatedPrompt = await response.json();
      setPrompt(updatedPrompt);
      setIsEditing(false);
      toast.success('Prompt updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating prompt:', error);
      toast.error('Failed to update prompt');
    }
  };

  const handleDelete = async () => {
    if (!prompt || !isAuthenticated) {
      toast.error('Please log in to delete prompts');
      return;
    }

    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }

      toast.success('Prompt deleted successfully');
      router.push('/prompts');
    } catch (error) {
      console.error('❌ Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const copyToClipboard = async () => {
    if (!prompt) return;
    
    try {
      await navigator.clipboard.writeText(prompt.content);
      toast.success('Content copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-8">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Prompt not found</h2>
            <p className="mt-2 text-gray-600">The prompt you're looking for doesn't exist.</p>
            <Link href="/prompts" className="mt-4 inline-flex items-center text-brand-600 hover:text-brand-700">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to prompts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/prompts" 
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to prompts
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-300 focus:border-brand-500 focus:outline-none w-full"
                  placeholder="Prompt title"
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {prompt.title}
                </h1>
              )}
              
              {isEditing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-2 text-lg text-gray-600 bg-transparent border border-gray-300 rounded-md p-2 w-full focus:border-brand-500 focus:outline-none"
                  placeholder="Description (optional)"
                  rows={2}
                />
              ) : (
                prompt.description && (
                  <p className="text-lg text-gray-600 mb-4">
                    {prompt.description}
                  </p>
                )
              )}
              
              {/* Status and metadata */}
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-4">
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.isPublic}
                        onChange={(e) => setEditForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="mr-2"
                      />
                      Public
                    </label>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      prompt.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {prompt.isPublic ? 'Public' : 'Private'}
                    </span>
                  )}
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Category"
                    />
                  ) : (
                    prompt.category && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {prompt.category}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 ml-6">
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ClipboardIcon className="w-4 h-4 mr-2" />
                Copy
              </button>
              
              {isAuthenticated && (
                <>
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                    >
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  )}
                  
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-8">
            {/* Variables section */}
            {variables.length > 0 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  🔧 Variables Detected ({variables.length} total):
                </h3>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable, index) => (
                    <code
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-blue-100 text-blue-800"
                    >
                      {`{{${variable}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {isEditing ? (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            ) : (
              prompt.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Content */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Content</h3>
              {isEditing ? (
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                  placeholder="Enter your prompt content here..."
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed font-mono text-sm">
                    {prompt.content}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                Created: {new Date(prompt.createdAt).toLocaleDateString()}
              </div>
              <div>
                Last updated: {new Date(prompt.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 