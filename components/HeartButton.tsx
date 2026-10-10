'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toggleFavorite } from '@/app/profile-actions'

type Labels = { like: string; unlike: string; loginToLike: string }

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" strokeWidth="1.8" strokeLinejoin="round">
      <path
        d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"
        className={filled ? 'heart-shape is-filled' : 'heart-shape'}
      />
    </svg>
  )
}

/**
 * Hollow heart that fills when a clinic is a favourite. It changes at once and saves in the
 * background. Signed-out visitors are sent to log in. `onPhoto` draws it white, to sit on a picture.
 */
export function HeartButton({
  clinicId,
  liked,
  signedIn,
  labels,
  onPhoto = false,
}: {
  clinicId: string
  liked: boolean
  signedIn: boolean
  labels: Labels
  onPhoto?: boolean
}) {
  const [optimistic, setLiked] = useState(liked)
  const [, startTransition] = useTransition()
  const className = `heart-btn${onPhoto ? ' on-photo' : ''}`

  if (!signedIn) {
    return (
      <Link href={`/login?next=/clinics/${clinicId}`} className={className} aria-label={labels.loginToLike} title={labels.loginToLike}>
        <Heart filled={false} />
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={className}
      aria-pressed={optimistic}
      aria-label={optimistic ? labels.unlike : labels.like}
      title={optimistic ? labels.unlike : labels.like}
      onClick={() => {
        setLiked(!optimistic)
        startTransition(async () => setLiked(await toggleFavorite(clinicId)))
      }}
    >
      <Heart filled={optimistic} />
    </button>
  )
}
