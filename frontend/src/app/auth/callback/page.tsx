'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');
        const error = searchParams.get('error');

        if (error) {
          let errorMessage = 'Authentication failed';
          switch (error) {
            case 'oauth_failed':
              errorMessage = 'Google authentication failed. Please try again.';
              break;
            case 'oauth_callback_failed':
              errorMessage = 'Authentication process failed. Please try again.';
              break;
            default:
              errorMessage = 'An error occurred during authentication.';
          }
          setError(errorMessage);
          toast.error(errorMessage);
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        if (!token || !userStr) {
          setError('Invalid authentication response');
          toast.error('Invalid authentication response');
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        try {
          const user = JSON.parse(decodeURIComponent(userStr));
          
          // Store auth data
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          // Update auth store
          setUser(user);
          
          toast.success('Successfully signed in with Google!');
          router.push('/dashboard');
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          setError('Failed to process authentication data');
          toast.error('Failed to process authentication data');
          setTimeout(() => router.push('/auth/login'), 3000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setError('Authentication failed');
        toast.error('Authentication failed');
        setTimeout(() => router.push('/auth/login'), 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    processOAuthCallback();
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          {isProcessing ? (
            <>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-brand-100 mb-4">
                <div className="loading-spinner text-brand-600"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Completing sign in...
              </h2>
              <p className="text-gray-600">
                Please wait while we finish setting up your account.
              </p>
            </>
          ) : error ? (
            <>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                Redirecting to login page...
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Success!
              </h2>
              <p className="text-gray-600">
                Redirecting to your dashboard...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 