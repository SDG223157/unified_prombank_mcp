'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/authStore';
import AdvancedPromptEditor from '@/components/AdvancedPromptEditor';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Variable {
  name: string;
  value: string;
  description?: string;
}

interface CreatePromptForm {
  title: string;
  description: string;
  content: string;
  tags: string;
  category: string;
  isPublic: boolean;
}

const CATEGORIES = [
  'Writing',
  'Development',
  'Analysis',
  'Marketing',
  'Education',
  'Business',
  'Creative',
  'Research',
  'Support',
  'Other'
];

export default function CreatePromptPage() {
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePromptForm>({
    defaultValues: {
      isPublic: false,
      category: '',
    }
  });

  useEffect(() => {
    checkAuth();
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, checkAuth, router]);

  const onSubmit = async (data: CreatePromptForm) => {
    if (!content.trim()) {
      toast.error('Please enter prompt content');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          content,
          tags: data.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          variables: variables.map(v => ({
            name: v.name,
            description: v.description || '',
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create prompt');
      }

      const result = await response.json();
      toast.success('Prompt created successfully!');
      router.push('/prompts');
    } catch (error: any) {
      console.error('Error creating prompt:', error);
      toast.error(error.message || 'Failed to create prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariablesChange = (newVariables: Variable[]) => {
    setVariables(newVariables);
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
                Create New Prompt
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => router.push('/prompts')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-prompt-form"
                disabled={isLoading}
                className="btn-primary"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Prompt'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form id="create-prompt-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Basic Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title *
                    </label>
                    <input
                      {...register('title', { 
                        required: 'Title is required',
                        maxLength: { value: 200, message: 'Title must be less than 200 characters' }
                      })}
                      type="text"
                      className="input mt-1"
                      placeholder="Enter a descriptive title for your prompt..."
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      {...register('description', {
                        maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                      })}
                      rows={3}
                      className="input mt-1"
                      placeholder="Brief description of what this prompt does..."
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        {...register('category')}
                        className="input mt-1"
                      >
                        <option value="">Select a category...</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat.toLowerCase()}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                        Tags
                      </label>
                      <input
                        {...register('tags')}
                        type="text"
                        className="input mt-1"
                        placeholder="AI, chatbot, automation (comma-separated)"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Separate tags with commas
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Prompt Editor */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    Prompt Content
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Use the advanced editor to create your prompt with variables and templates.
                  </p>
                </div>
                
                <AdvancedPromptEditor
                  value={content}
                  onChange={setContent}
                  onVariablesChange={handleVariablesChange}
                  placeholder="Enter your prompt here... Use {{variable_name}} for dynamic content."
                  className="border-0"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Settings */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('isPublic')}
                        type="checkbox"
                        className="focus:ring-brand-500 h-4 w-4 text-brand-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">
                        Make Public
                      </label>
                      <p className="text-gray-500">
                        Allow other users to discover and use this prompt
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variables Summary */}
              {variables.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Variables ({variables.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {variables.map((variable) => (
                      <div key={variable.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {variable.name}
                          </span>
                          {variable.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {variable.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Variable
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-blue-900 mb-3">
                  💡 Quick Tips
                </h3>
                
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Use <code className="bg-blue-100 px-1 rounded">{'{{variable}}'}</code> for dynamic content</li>
                  <li>• Try built-in templates to get started quickly</li>
                  <li>• Add tags to make your prompt discoverable</li>
                  <li>• Use the preview to test with variables</li>
                  <li>• Character count helps optimize for AI models</li>
                </ul>
              </div>

              {/* Content Stats */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Content Statistics
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {content.length}
                    </div>
                    <div className="text-gray-500">Characters</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {content.trim() ? content.trim().split(/\s+/).length : 0}
                    </div>
                    <div className="text-gray-500">Words</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {variables.length}
                    </div>
                    <div className="text-gray-500">Variables</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      ~{Math.ceil(content.length / 4)}
                    </div>
                    <div className="text-gray-500">Tokens</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 