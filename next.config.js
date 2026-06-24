/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control',     value: 'on' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          // Capacitor apps require camera/microphone — relax Permissions-Policy for mobile builds.
          // Web deployments enforce these via the native app permissions model instead.
          { key: 'Permissions-Policy',         value: 'camera=(self), microphone=(self), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' capacitor://localhost",
              "script-src 'self' capacitor://localhost",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com capacitor://localhost",
              "font-src 'self' https://fonts.gstatic.com capacitor://localhost data:",
              "img-src 'self' data: blob: https: capacitor://localhost",
              // capacitor://localhost is the scheme used by the Capacitor WebView on iOS/Android
              "connect-src 'self' capacitor://localhost https://*.supabase.co wss://*.supabase.co https://open.bigmodel.cn https://api.openai.com https://api.deepseek.com https://api.x.ai https://api.anthropic.com https://vwelfare.vercel.app",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
