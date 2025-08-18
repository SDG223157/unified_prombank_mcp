'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, checkAuth, router]);

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
    <div className="h-screen flex bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Prompt House</h1>
          <div></div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 