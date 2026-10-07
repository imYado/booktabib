import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite'],
  experimental: {
    // Clinic and doctor photos are uploaded through server actions (up to 2 MB each).
    serverActions: { bodySizeLimit: '3mb' },
  },
}

export default nextConfig
