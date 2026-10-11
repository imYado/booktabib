'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toggleFavorite } from '@/app/profile-actions'

type Labels = { like: string; unlike: string; loginToLike: string }

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20.6c-.35 0-.7-.12-.98-.35C7.9 17.7 3 13.9 3 9.2 3 6.3 5.2 4 8 4c1.6 0 3 .8 4 2.1C13 4.8 14.4 4 16 4c2.8 0 5 2.3 5 5.2 0 4.7-4.9 8.5-8.02 11.05-.28.23-.63.35-.98.35Z" className={filled ? 'heart-shape is-filled' : 'heart-shape'} />
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
