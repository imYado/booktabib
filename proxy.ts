import { NextResponse, type NextRequest } from 'next/server'

/**
 * Adds a Content Security Policy to every page. Only scripts carrying this request's random nonce
 * run, so a script slipped into a page (for example through a patient's name) can't execute.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const dev = process.env.NODE_ENV === 'development'
  // Vercel preview deployments add a feedback toolbar from vercel.live.
  const preview = process.env.VERCEL_ENV === 'preview' ? ' https://vercel.live' : ''
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}${preview}`,
    // Inline style attributes are used for clinic colours and layout.
    `style-src 'self' 'unsafe-inline'${preview}`,
    `img-src 'self' blob: data:${preview}${preview ? ' https://vercel.com' : ''}`,
    `font-src 'self'${preview}${preview ? ' https://assets.vercel.com' : ''}`,
    `connect-src 'self'${preview}${preview ? ' wss://ws-us3.pusher.com' : ''}`,
    `frame-src${preview || " 'none'"}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|img/|icon.png|apple-icon.png|opengraph-image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
