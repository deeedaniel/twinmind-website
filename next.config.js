/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static optimization where possible
  output: "standalone",

  // Image optimization settings
  images: {
    domains: ["lh3.googleusercontent.com"],
    // Enable caching for images
    minimumCacheTTL: 60,
    // Disable image size warnings in development
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Typescript settings
  typescript: {
    // Don't fail build on TS errors during deployment
    ignoreBuildErrors: true,
  },

  // ESLint settings
  eslint: {
    // Don't fail build on ESLint errors during deployment
    ignoreDuringBuilds: true,
  },

  // Enable React strict mode for better development
  reactStrictMode: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable source maps in production for better error tracking
  productionBrowserSourceMaps: true,

  // Transpile modules
  transpilePackages: ["tailwindcss"],
};

module.exports = nextConfig;
