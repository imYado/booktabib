'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Re-fetches the page's server data on an interval (for the clinic TV screen). */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
