/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'www.mylivelinks.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mylivelinks.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
    ],
    unoptimized: process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true',
  },
  // Configure Next.js to use frontend directory
  distDir: '.next',
  // Ensure we're looking in the right place
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
};

module.exports = nextConfig;

