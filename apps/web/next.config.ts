import type { NextConfig } from 'next';

const apiOrigin = process.env.INTERNAL_API_ORIGIN ?? 'http://127.0.0.1:4000';
const storefrontCatalogMode = process.env.STOREFRONT_CATALOG_MODE ?? 'demo';

if (storefrontCatalogMode !== 'demo' && storefrontCatalogMode !== 'live_read_only') {
  throw new Error('STOREFRONT_CATALOG_MODE deve ser demo ou live_read_only.');
}

const config: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_STORE_CATALOG_MODE: storefrontCatalogMode },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.rbxcdn.com', pathname: '/**' }],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default config;
