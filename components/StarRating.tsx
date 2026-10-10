'use client'

import { useState, useTransition } from 'react'
import { rateClinic } from '@/app/profile-actions'

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" strokeWidth="1.6" strokeLinejoin="round">
      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z" className={filled ? 'star-shape is-filled' : 'star-shape'} />
    </svg>
  )
}

/** Five stars a patient taps to rate a clinic. Tapping saves at once; tapping another star changes it. */
export function StarRating({
  clinicId,
  initial,
  labels,
}: {
  clinicId: string
  initial: number
  labels: { title: string; yours: string; saved: string; stars: string[] }
}) {
  const [stars, setStars] = useState(initial)
  const [hover, setHover] = useState(0)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const shown = hover || stars

  return (
    <div className="star-rating">
      <p className="star-rating-title">{stars ? labels.yours : labels.title}</p>
      <div role="radiogroup" aria-label={labels.title} className="star-row" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={labels.stars[n - 1]}
            title={labels.stars[n - 1]}
            className="star-btn"
            disabled={pending}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => {
              const previous = stars
              setStars(n)
              setSaved(false)
              startTransition(async () => {
                const result = await rateClinic(clinicId, n)
                setStars(result || previous)
                setSaved(result > 0)
              })
            }}
          >
            <Star filled={n <= shown} />
          </button>
        ))}
      </div>
      {saved && (
        <p className="caption star-saved" role="status">
          {labels.saved}
        </p>
      )}
    </div>
  )
}
