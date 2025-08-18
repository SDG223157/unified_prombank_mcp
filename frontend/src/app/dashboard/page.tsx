'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { userApi, promptsApi } from '@/lib/api';
import type { UserStats, Prompt } from '@/types';


export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentPrompts, setRecentPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, promptsData] = await Promise.all([
          userApi.getStats(),
          promptsApi.getPrompts({ limit: 5 })
        ]);
        setStats(statsData);
        setRecentPrompts(promptsData.prompts);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Prompts',
      value: stats?.stats.totalPrompts || 0,
      icon: '📝',
      color: 'bg-blue-500',
    },
    {
      title: 'Public Prompts',
      value: stats?.stats.publicPrompts || 0,
      icon: '🌐',
      color: 'bg-green-500',
    },
    {
      title: 'Total Views',
      value: stats?.stats.totalViews || 0,
      icon: '👁️',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your prompts today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {card.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription Status */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Subscription Status
            </h3>
            <p className="text-gray-600">
              You're on the <span className="font-medium capitalize">{stats?.subscription.tier}</span> plan
            </p>
            {stats?.subscription.usage && (
              <p className="text-sm text-gray-500 mt-1">
                {stats.subscription.usage.prompts} of {stats.subscription.limits.maxPrompts === -1 ? 'unlimited' : stats.subscription.limits.maxPrompts} prompts used
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            {stats?.subscription.tier === 'free' && (
              <Link href="/pricing" className="btn-primary px-4 py-2">
                Upgrade Plan
              </Link>
            )}
            <Link href="/settings" className="btn-secondary px-4 py-2">
              Manage
            </Link>
          </div>
        </div>
        
        {/* Progress bar for usage */}
        {stats?.subscription.usage && stats.subscription.limits.maxPrompts !== -1 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full"
                style={{
                  width: `${Math.min((stats.subscription.usage.prompts / stats.subscription.limits.maxPrompts) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* API Integration */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-blue-900 mb-2">🔌 Connect to Cursor IDE</h3>
            <p className="text-blue-800 mb-4">
              Access your prompts directly in Cursor IDE with our Model Context Protocol (MCP) integration.
            </p>
            <div className="flex items-center space-x-4">
              <Link
                href="/tokens"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔑 Manage API Tokens
              </Link>
              <span className="text-sm text-blue-700">
                Generate secure tokens for MCP connection
              </span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Prompts */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Prompts</h3>
            <Link href="/prompts" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
              View all
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {recentPrompts.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts yet</h3>
              <p className="text-gray-500 mb-4">Create your first prompt to get started!</p>
              <Link href="/prompts/create" className="btn-primary px-4 py-2">
                Create Prompt
              </Link>
            </div>
          ) : (
            recentPrompts.map((prompt) => (
              <div key={prompt.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        {prompt.title}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        prompt.isPublic 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {prompt.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    {prompt.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {prompt.description}
                      </p>
                    )}
                    <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                      <span>
                        Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                      </span>
                      {prompt.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {prompt.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {prompt.tags.length > 3 && (
                            <span className="text-gray-400">+{prompt.tags.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/prompts/view/${prompt.id}`}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      View
                    </Link>
                    <Link
                      href={`/prompts/view/${prompt.id}`}
                      className="text-gray-600 hover:text-gray-700 text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/prompts/create" className="card p-4 hover:shadow-md transition-shadow text-center">
          <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900">Create Prompt</h3>
          <p className="text-sm text-gray-500 mt-1">Use advanced editor with templates</p>
        </Link>

        <Link href="/prompts/public" className="card p-4 hover:shadow-md transition-shadow text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900">Browse Public</h3>
          <p className="text-sm text-gray-500 mt-1">Explore community prompts</p>
        </Link>

        <Link href="/analytics" className="card p-4 hover:shadow-md transition-shadow text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900">Analytics</h3>
          <p className="text-sm text-gray-500 mt-1">View usage insights</p>
        </Link>

        <Link href="/settings" className="card p-4 hover:shadow-md transition-shadow text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900">Settings</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your account</p>
        </Link>
      </div>
    </div>
  );
} 