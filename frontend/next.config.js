/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://prombank.app/api',
  },
  images: {
    domains: ['prombank.app'],
    unoptimized: true
  },
  output: 'standalone',
  trailingSlash: true,
}

module.exports = nextConfig 