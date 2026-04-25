import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@lumina/ui', '@lumina/shared', '@lumina/db'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        '@opentelemetry/sdk-node',
        '@opentelemetry/exporter-trace-otlp-grpc',
        '@opentelemetry/auto-instrumentations-node',
        '@opentelemetry/resources',
        '@opentelemetry/semantic-conventions',
        '@grpc/grpc-js',
        '@grpc/proto-loader',
      );
    }
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@lumina/ui', 'lucide-react'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://cdn.jsdelivr.net",
            "img-src 'self' data: blob: https://*.unsplash.com https://api.mapbox.com https://lh3.googleusercontent.com",
            "font-src 'self' data: https://cdn.jsdelivr.net",
            "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.meilisearch.com",
            "worker-src 'self' blob:",
            "frame-ancestors 'none'",
          ].join('; '),
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
        },
      ],
    },
  ],
};

export default nextConfig;
