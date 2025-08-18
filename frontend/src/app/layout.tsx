import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Prompt House Premium',
  description: 'Professional prompt management and collaboration platform',
  keywords: ['prompts', 'AI', 'productivity', 'collaboration', 'templates'],
  authors: [{ name: 'Prompt House Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Prompt House Premium',
    description: 'Professional prompt management and collaboration platform',
    type: 'website',
    url: 'https://prombank.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt House Premium',
    description: 'Professional prompt management and collaboration platform',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <div id="root" className="h-full">
          {children}
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
} 