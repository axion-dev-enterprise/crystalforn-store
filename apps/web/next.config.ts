import type { NextConfig } from 'next';

const apiOrigin = process.env.INTERNAL_API_ORIGIN ?? 'http://127.0.0.1:4000';

const config: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.rbxcdn.com', pathname: '/**' }],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default config;
