'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

/* eslint-disable @next/next/no-img-element -- uploaded photos are served from /img */

/** The clinic's photos as a grid; a photo opens full size, with arrows, swipe and keyboard to move between them. */
export function ClinicGallery({
  images,
  name,
  labels,
}: {
  images: string[]
  name: string
  /** One label per photo ("Photo 2 of 5"), in order. */
  labels: { photos: string[]; close: string; prev: string; next: string }
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)
  const n = images.length

  const show = (i: number) => {
    setOpen(i)
    if (!dialog.current?.open) dialog.current?.showModal()
  }
  const step = (by: number) => setOpen((i) => (i === null ? i : (i + by + n) % n))

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      // "Next" is to the left in Arabic and Kurdish.
      const rtl = document.documentElement.dir === 'rtl'
      step((e.key === 'ArrowRight') !== rtl ? 1 : -1)
    }
    d.addEventListener('keydown', onKey)
    return () => d.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <ul className={`gallery-grid${n >= 3 ? ' has-feature' : ''}${n % 2 ? ' is-odd' : ''}`} data-count={Math.min(n, 5)}>
        {images.map((id, i) => (
          <li key={id}>
            <button type="button" className="gallery-thumb" onClick={() => show(i)} aria-label={labels.photos[i]}>
              <img src={`/img/${id}`} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={name}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          // A click on the dark backdrop closes it.
          if (e.target === e.currentTarget) dialog.current?.close()
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) < 50) return
          const rtl = document.documentElement.dir === 'rtl'
          step((dx < 0) !== rtl ? 1 : -1)
        }}
      >
        {open !== null && (
          <figure className="lightbox-figure">
            <img src={`/img/${images[open]}`} alt={labels.photos[open]} />
            <figcaption className="lightbox-count">{labels.photos[open]}</figcaption>
          </figure>
        )}
        <button type="button" className="lightbox-btn lightbox-close" onClick={() => dialog.current?.close()} aria-label={labels.close} autoFocus>
          <Icon name="x" size={20} />
        </button>
        {n > 1 && (
          <>
            <button type="button" className="lightbox-btn lightbox-prev" onClick={() => step(-1)} aria-label={labels.prev}>
              <span className="flip-x">
                <Icon name="arrow" size={20} />
              </span>
            </button>
            <button type="button" className="lightbox-btn lightbox-next" onClick={() => step(1)} aria-label={labels.next}>
              <Icon name="arrow" size={20} />
            </button>
          </>
        )}
      </dialog>
    </>
  )
}
