/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  eslint: {
    // Don't fail build on ESLint errors during production builds
    // ESLint is still run and warnings are shown
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control',     value: 'on' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // CSP with nonce is set in middleware.ts for dynamic nonce generation
          // This ensures every response gets a unique nonce, preventing inline script/style injection
        ],
      },
    ]
  },
}

module.exports = nextConfig
