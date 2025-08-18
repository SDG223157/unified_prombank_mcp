'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PencilIcon, TrashIcon, ClipboardIcon, ShareIcon } from '@heroicons/react/24/outline';

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

export default function PromptDetailPage() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [variables, setVariables] = useState<string[]>([]);
  const { id } = useParams();
  const router = useRouter();
  const { isAuthenticated, checkAuth, token } = useAuthStore();

  useEffect(() => {
    checkAuth();
    if (!isAuthenticated) {
      // Redirect to login with the current URL as redirect parameter
      const currentUrl = window.location.pathname;
      console.log('❌ Not authenticated, redirecting to login from:', currentUrl);
      router.push(`/auth/login?redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [isAuthenticated, checkAuth, router]);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetchPrompt();
    }
  }, [isAuthenticated, id]);

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
      
      // Extract variables from content
      const variableMatches = data.content.match(/\{\{(\w+)\}\}/g) || [];
      const uniqueVariables: string[] = Array.from(new Set(variableMatches.map((match: string) => match.slice(2, -2))));
      setVariables(uniqueVariables);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      toast.error('Failed to load prompt');
      router.push('/prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePrompt = async () => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${id}`, {
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
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt?.content || '');
      toast.success('Prompt copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
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

  const parseContent = (content: string) => {
    // Split content into sections based on numbered lists or headings
    const lines = content.split('\n');
    const sections: { type: 'text' | 'list' | 'heading', content: string, number?: number }[] = [];
    
    let currentSection = { type: 'text' as const, content: '' };
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check for numbered list items
      const numberedMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
      if (numberedMatch) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        sections.push({
          type: 'list',
          content: numberedMatch[2],
          number: parseInt(numberedMatch[1])
        });
        currentSection = { type: 'text', content: '' };
      }
      // Check for headings
      else if (trimmed.startsWith('#')) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        sections.push({
          type: 'heading',
          content: trimmed.replace(/^#+\s*/, '')
        });
        currentSection = { type: 'text', content: '' };
      }
      // Regular text
      else {
        currentSection.content += line + '\n';
      }
    });
    
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    
    return sections;
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

  const sections = parseContent(prompt.content);

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {prompt.title}
              </h1>
              {prompt.description && (
                <p className="text-lg text-gray-600 mb-4">
                  {prompt.description}
                </p>
              )}
              
              {/* Status and metadata */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  {prompt.isPublic ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Private
                    </span>
                  )}
                  {prompt.category && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {prompt.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 ml-6">
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                <ClipboardIcon className="w-4 h-4 mr-2" />
                Copy
              </button>
              
              <Link
                href={`/prompts/${prompt.id}/edit`}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </Link>
              
              <button
                onClick={deletePrompt}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
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

            {/* Content sections */}
            <div className="prose prose-lg max-w-none">
              {sections.map((section, index) => {
                if (section.type === 'heading') {
                  return (
                    <h2 key={index} className="text-xl font-semibold text-gray-900 mt-8 mb-4">
                      {section.content}
                    </h2>
                  );
                } else if (section.type === 'list') {
                  return (
                    <div key={index} className="mb-6">
                      <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {section.number}
                        </span>
                        <div className="flex-1">
                          <p className="text-gray-700 leading-relaxed">
                            {section.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={index} className="mb-6">
                      <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">
                        {section.content.trim()}
                      </pre>
                    </div>
                  );
                }
              })}
            </div>

            {/* Tags */}
            {prompt.tags.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
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
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                Created: {formatDate(prompt.createdAt)}
              </div>
              <div>
                Last updated: {formatDate(prompt.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
