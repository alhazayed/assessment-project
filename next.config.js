/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  eslint: {
    // Don't fail build on ESLint errors during production builds
    // ESLint is still run and warnings are shown
    ignoreDuringBuilds: false,
  },
  // ── Next.js image-optimizer CVE mitigation (14.2.35, pending React 19 upgrade) ──
  // The app renders exactly one image — the local /logo.png. No remote images
  // are used anywhere. Denying remote optimization entirely neutralizes the
  // self-hostable HIGH advisories that all require an attacker-supplied remote URL:
  //   GHSA-9g9p-9gw9-jx7f  DoS via Image Optimizer remotePatterns
  //   GHSA-h64f-5h5j-jqjh  DoS in the Image Optimization API
  //   GHSA-3x4c-7xq6-9pq8  Unbounded next/image disk cache growth
  // With an empty remotePatterns list the optimizer will refuse any non-local
  // source, so none of these vectors are reachable. See NEXTJS_CVE_REMEDIATION.md.
  images: {
    remotePatterns: [],          // no remote image optimization permitted
    dangerouslyAllowSVG: false,  // explicit: never optimize/serve remote SVG
    contentDispositionType: 'attachment',
    minimumCacheTTL: 60,
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
