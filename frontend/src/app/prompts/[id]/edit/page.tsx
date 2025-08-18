'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/authStore';
import AdvancedPromptEditor from '@/components/AdvancedPromptEditor';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, EyeIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Variable {
  name: string;
  value: string;
  description?: string;
}

interface EditPromptForm {
  title: string;
  description: string;
  content: string;
  tags: string;
  category: string;
  isPublic: boolean;
}

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
}

const CATEGORIES = [
  'Writing',
  'Development',
  'Analysis',
  'Marketing',
  'Research',
  'Education',
  'Business',
  'Creative',
  'Technical',
  'Other'
];

export default function EditPromptPage() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, checkAuth, token } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty }
  } = useForm<EditPromptForm>();

  const watchedContent = watch('content', '');

  useEffect(() => {
    checkAuth();
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, checkAuth, router]);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchPrompt();
    }
  }, [isAuthenticated, id]);

  // Extract variables from content
  useEffect(() => {
    const extractVariables = () => {
      const variableMatches = watchedContent.match(/\{\{(\w+)\}\}/g) || [];
      const uniqueVariables = Array.from(new Set(variableMatches.map((match: string) => match.slice(2, -2))));
      const variableObjects = uniqueVariables.map(name => ({
        name,
        value: '',
        description: `Variable: ${name}`
      }));
      setVariables(variableObjects);
    };

    if (watchedContent) {
      extractVariables();
    }
  }, [watchedContent]);

  const fetchPrompt = async () => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prompt');
      }

      const data = await response.json();
      setPrompt(data);
      
      // Populate form
      setValue('title', data.title);
      setValue('description', data.description || '');
      setValue('content', data.content);
      setValue('tags', data.tags.join(', '));
      setValue('category', data.category || '');
      setValue('isPublic', data.isPublic);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      toast.error('Failed to load prompt');
      router.push('/prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EditPromptForm) => {
    setIsSaving(true);
    try {
      const tagsArray = data.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          content: data.content,
          tags: tagsArray,
          category: data.category,
          isPublic: data.isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update prompt');
      }

      toast.success('Prompt updated successfully');
      router.push(`/prompts/${id}`);
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error('Failed to update prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-8">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
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
            <p className="mt-2 text-gray-600">The prompt you're looking for doesn't exist or you don't have access to it.</p>
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
            href={`/prompts/${id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to prompt
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Edit Prompt
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                Make changes to your prompt and save when ready
              </p>
              
              {/* Metadata */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div>Created: {formatDate(prompt.createdAt)}</div>
                <div>Last updated: {formatDate(prompt.updatedAt)}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 ml-6">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving || !isDirty}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', { required: 'Title is required' })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                placeholder="Enter a descriptive title for your prompt"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                placeholder="Brief description of what this prompt does"
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Prompt Content *
              </label>
              {previewMode ? (
                <div className="min-h-64 p-4 border border-gray-300 rounded-md bg-gray-50">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">
                      {watchedContent}
                    </pre>
                  </div>
                </div>
              ) : (
                <AdvancedPromptEditor
                  value={watchedContent}
                  onChange={(value) => setValue('content', value, { shouldDirty: true })}
                  placeholder="Enter your prompt content here..."
                  className="min-h-64"
                  showTemplates={false}
                  showVariables={true}
                  showStats={true}
                  onVariablesChange={setVariables}
                />
              )}
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>

            {/* Variables */}
            {variables.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-3">
                  🔧 Variables Detected ({variables.length} total):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {variables.map((variable, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                        {`{{${variable.name}}}`}
                      </code>
                      <span className="text-sm text-blue-700 flex-1">
                        {variable.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  {...register('category')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category.toLowerCase()}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label htmlFor="isPublic" className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('isPublic')}
                      value="false"
                      className="h-4 w-4 text-brand-600 border-gray-300 focus:ring-brand-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Private</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('isPublic')}
                      value="true"
                      className="h-4 w-4 text-brand-600 border-gray-300 focus:ring-brand-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Public</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                {...register('tags')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                placeholder="writing, creative, business (comma-separated)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate tags with commas to help organize and find your prompts
              </p>
            </div>
          </form>

          {/* Sticky footer with actions */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {isDirty ? 'You have unsaved changes' : 'All changes saved'}
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  href={`/prompts/${id}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSaving || !isDirty}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
