'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import AdvancedPromptEditor from './AdvancedPromptEditor';
import toast from 'react-hot-toast';
import { 
  XMarkIcon, 
  PencilIcon, 
  EyeIcon, 
  CheckIcon, 
  ClipboardIcon,
  ShareIcon 
} from '@heroicons/react/24/outline';

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
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface Variable {
  name: string;
  value: string;
  description?: string;
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId?: string;
  mode?: 'view' | 'edit';
  onSave?: () => void;
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

export default function PromptModal({ 
  isOpen, 
  onClose, 
  promptId, 
  mode = 'view',
  onSave 
}: PromptModalProps) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [variables, setVariables] = useState<Variable[]>([]);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    content: '',
    tags: '',
    category: '',
    isPublic: false
  });

  const { token } = useAuthStore();

  useEffect(() => {
    console.log('🎭 PromptModal useEffect triggered:', { isOpen, promptId });
    if (isOpen && promptId) {
      console.log('🚀 Fetching prompt data for:', promptId);
      fetchPrompt();
    }
  }, [isOpen, promptId]);

  useEffect(() => {
    if (prompt) {
      setEditForm({
        title: prompt.title,
        description: prompt.description || '',
        content: prompt.content,
        tags: prompt.tags.join(', '),
        category: prompt.category || '',
        isPublic: prompt.isPublic
      });
    }
  }, [prompt]);

  const fetchPrompt = async () => {
    if (!promptId) return;
    
    console.log('🔍 fetchPrompt called for:', promptId);
    console.log('🔒 Token available:', token ? 'yes' : 'no');
    
    setIsLoading(true);
    try {
      console.log('📡 Making API request to:', `/api/prompts/${promptId}`);
      const response = await fetch(`/api/prompts/${promptId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('❌ 401 error - session expired');
          toast.error('Session expired. Please log in again.');
          onClose(); // Close the modal
          return;
        }
        throw new Error('Failed to fetch prompt');
      }

      const data = await response.json();
      console.log('✅ Prompt data received:', data);
      setPrompt(data);
      
      // Extract variables from content
      const variableMatches = data.content.match(/\{\{(\w+)\}\}/g) || [];
      const uniqueVariables: string[] = Array.from(new Set(variableMatches.map((match: string) => match.slice(2, -2))));
      setVariables(uniqueVariables.map(name => ({ name, value: '', description: `Variable: ${name}` })));
    } catch (error) {
      console.error('❌ Error fetching prompt:', error);
      toast.error('Failed to load prompt');
      onClose(); // Close the modal on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prompt) return;
    
    setIsSaving(true);
    try {
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
      toast.success('Prompt updated successfully');
      onSave?.();
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error('Failed to update prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyContent = async () => {
    if (!prompt) return;
    
    try {
      await navigator.clipboard.writeText(prompt.content);
      toast.success('Content copied to clipboard');
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error('Failed to copy content');
    }
  };

  const handleShare = async () => {
    if (!prompt) return;
    
    try {
      const shareUrl = `${window.location.origin}/prompts/${prompt.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy share link:', error);
      toast.error('Failed to copy share link');
    }
  };

  if (!isOpen) {
    console.log('🎭 PromptModal: not open, returning null');
    return null;
  }
  
  console.log('🎭 PromptModal: rendering modal', { isOpen, promptId, mode });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Prompt' : 'View Prompt'}
            </h2>
            {prompt?.isPublic && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Public
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <>
                <button
                  onClick={handleCopyContent}
                  className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  title="Copy content"
                >
                  <ClipboardIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  title="Share"
                >
                  <ShareIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  title="Edit"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  title="Cancel edit"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-2 text-green-600 hover:text-green-800 rounded-lg hover:bg-green-100 disabled:opacity-50"
                  title="Save changes"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
              </>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading prompt...</p>
              </div>
            </div>
          ) : prompt ? (
            <div className="p-6">
              {!isEditing ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* Title and Description */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {prompt.title}
                    </h3>
                    {prompt.description && (
                      <p className="text-gray-600 mb-4">
                        {prompt.description}
                      </p>
                    )}
                  </div>

                  {/* Tags and Category */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {prompt.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {prompt.category}
                      </span>
                    )}
                    {prompt.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Variables */}
                  {variables.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-900 mb-3">
                        🔧 Variables Detected ({variables.length} total):
                      </h4>
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

                  {/* Content */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Content</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed font-mono text-sm">
                        {prompt.content}
                      </pre>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-sm text-gray-500 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <strong>Created:</strong> {new Date(prompt.createdAt).toLocaleString()}
                      </div>
                      <div>
                        <strong>Updated:</strong> {new Date(prompt.updatedAt).toLocaleString()}
                      </div>
                      {prompt.user && (
                        <div>
                          <strong>Author:</strong> {prompt.user.firstName || prompt.user.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter a descriptive title for your prompt"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of what this prompt does"
                    />
                  </div>

                  {/* Tags and Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <input
                        type="text"
                        id="tags"
                        value={editForm.tags}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="AI, chatbot, automation (comma-separated)"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        value={editForm.category}
                        onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a category</option>
                        {CATEGORIES.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Public Toggle */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={editForm.isPublic}
                      onChange={(e) => setEditForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                      Make this prompt public
                    </label>
                  </div>

                  {/* Content Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt Content *
                    </label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <AdvancedPromptEditor
                        value={editForm.content}
                        onChange={(value) => setEditForm(prev => ({ ...prev, content: value }))}
                        placeholder="Enter your prompt content here..."
                        className="min-h-64"
                        showTemplates={false}
                        showVariables={true}
                        showStats={true}
                        onVariablesChange={setVariables}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-600">Failed to load prompt</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 