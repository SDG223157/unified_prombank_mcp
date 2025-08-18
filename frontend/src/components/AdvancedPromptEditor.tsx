'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

interface Variable {
  name: string;
  value: string;
  description?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  variables: Variable[];
  category: string;
}

interface AdvancedPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showTemplates?: boolean;
  showVariables?: boolean;
  showStats?: boolean;
  onVariablesChange?: (variables: Variable[]) => void;
}



export default function AdvancedPromptEditor({
  value,
  onChange,
  placeholder = "Enter your prompt here...",
  className = "",
  showTemplates = true,
  showVariables = true,
  showStats = true,
  onVariablesChange
}: AdvancedPromptEditorProps) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showVariablePanel, setShowVariablePanel] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract variables from content
  const extractVariables = useCallback((content: string): Variable[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: RegExpMatchArray[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match);
    }
    const uniqueVars = Array.from(new Set(matches.map(match => match[1].trim())));
    
    return uniqueVars.map(varName => {
      const existingVar = variables.find(v => v.name === varName);
      return existingVar || { name: varName, value: '', description: '' };
    });
  }, [variables]);

  // Debounced variable extraction
  const debouncedExtractVariables = useCallback(
    debounce((content: string) => {
      const newVariables = extractVariables(content);
      setVariables(newVariables);
      onVariablesChange?.(newVariables);
    }, 300),
    [extractVariables, onVariablesChange]
  );

  useEffect(() => {
    debouncedExtractVariables(value);
  }, [value, debouncedExtractVariables]);

  // Fetch templates when template modal is opened
  const fetchTemplates = async () => {
    if (templates.length > 0) return; // Already loaded
    
    setIsLoadingTemplates(true);
    try {
      const response = await fetch('/api/prompts/templates');
      if (response.ok) {
        const data = await response.json();
        // Convert backend template format to frontend format
        const formattedTemplates = data.templates.map((template: any) => ({
          ...template,
          category: template.category.charAt(0).toUpperCase() + template.category.slice(1),
          variables: template.variables.map((v: any) => ({
            name: v.name,
            value: '',
            description: v.description
          }))
        }));
        setTemplates(formattedTemplates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Calculate stats
  const stats = {
    characters: value.length,
    words: value.trim() ? value.trim().split(/\s+/).length : 0,
    lines: value.split('\n').length,
    variables: variables.length,
    // Rough token estimation (1 token ≈ 4 characters for English)
    estimatedTokens: Math.ceil(value.length / 4)
  };

  // Apply template
  const applyTemplate = (template: Template) => {
    onChange(template.content);
    setVariables(template.variables);
    onVariablesChange?.(template.variables);
    setSelectedTemplate(template.id);
    setShowTemplateModal(false);
  };

  // Update variable value
  const updateVariable = (varName: string, value: string) => {
    const updatedVariables = variables.map(v => 
      v.name === varName ? { ...v, value } : v
    );
    setVariables(updatedVariables);
    onVariablesChange?.(updatedVariables);
  };

  // Preview with variables replaced
  const getPreviewContent = () => {
    let preview = value;
    variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');
      preview = preview.replace(regex, variable.value || `{{${variable.name}}}`);
    });
    return preview;
  };

  // Insert variable at cursor
  const insertVariable = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = before + `{{${varName}}}` + after;
    
    onChange(newValue);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
    }, 0);
  };

  // Copy to clipboard
  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className={`advanced-prompt-editor ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          {showTemplates && (
            <button
              onClick={() => {
                setShowTemplateModal(true);
                fetchTemplates();
              }}
              className="btn-secondary text-sm px-3 py-1"
            >
              📋 Templates
            </button>
          )}
          
          {showVariables && variables.length > 0 && (
            <button
              onClick={() => setShowVariablePanel(!showVariablePanel)}
              className="btn-secondary text-sm px-3 py-1"
            >
              🔧 Variables ({variables.length})
            </button>
          )}
          
          <button
            onClick={() => copyToClipboard(value)}
            className="btn-secondary text-sm px-3 py-1"
          >
            📋 Copy
          </button>
          
          <button
            onClick={() => copyToClipboard(getPreviewContent())}
            className="btn-secondary text-sm px-3 py-1"
          >
            👁️ Copy Preview
          </button>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{stats.characters} chars</span>
            <span>{stats.words} words</span>
            <span>{stats.lines} lines</span>
            <span>~{stats.estimatedTokens} tokens</span>
          </div>
        )}
      </div>

      <div className="flex">
        {/* Main Editor */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-80 p-4 border-0 resize-none focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed"
            style={{
              background: `linear-gradient(90deg, 
                rgba(59, 130, 246, 0.1) 0%, 
                transparent 2px
              ) repeat-x`,
              backgroundSize: '100% 1.5rem'
            }}
          />
          
          {/* Variable highlighting overlay could go here */}
        </div>

        {/* Variable Panel */}
        {showVariables && showVariablePanel && variables.length > 0 && (
          <div className="w-80 border-l border-gray-200 bg-gray-50">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Variables</h3>
              <div className="space-y-3">
                {variables.map((variable) => (
                  <div key={variable.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {variable.name}
                      </label>
                      <button
                        onClick={() => insertVariable(variable.name)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Insert
                      </button>
                    </div>
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => updateVariable(variable.name, e.target.value)}
                      placeholder={`Enter ${variable.name}...`}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                    />
                    {variable.description && (
                      <p className="text-xs text-gray-500">{variable.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Choose a Template</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-h-80 overflow-y-auto">
              {isLoadingTemplates ? (
                <div className="col-span-full text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500">No templates available</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                      {template.content.substring(0, 100)}...
                    </p>
                    <div className="text-xs text-gray-500">
                      {template.variables.length} variables
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {variables.length > 0 && variables.some(v => v.value) && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h4 className="font-medium text-gray-900 mb-2">Preview with Variables</h4>
          <div className="text-sm text-gray-700 bg-white p-3 rounded border max-h-32 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {getPreviewContent()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 