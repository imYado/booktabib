import type { NextConfig } from 'next'

// Sent with every response. The Content Security Policy is added per request in proxy.ts.
const securityHeaders = [
  // Browsers only ever talk to the site over HTTPS, for two years.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // No other site can show booktabib inside a frame (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Other sites see only "booktabib.com", never the full address of a page.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite'],
  poweredByHeader: false,
  experimental: {
    // Clinic and doctor photos are uploaded through server actions (up to 2 MB each).
    serverActions: { bodySizeLimit: '3mb' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Live queue links are secret: keep them out of search engines and never pass them on.
      {
        source: '/q/:token*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
