'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addClinicPhoto } from '@/app/admin-actions'
import type { Locale, Localized } from '@/lib/i18n'
import { Icon } from './Icon'

const langs: Locale[] = ['en', 'ar', 'ckb']
const blankText = (): Localized => ({ en: '', ar: '', ckb: '' })

type InfoRow = { key: number; title: Localized; body: Localized }

/**
 * The clinic's "More information" rows, each a title and a text in every language. Rows are sent
 * as parallel lists (info_title_en, …, info_body_ckb) in the order shown; empty rows are dropped.
 */
export function ClinicInfoEditor({
  info,
  labels,
}: {
  info: { title: Localized; body: Localized }[]
  labels: { title: string; hint: string; rowTitle: string; rowBody: string; add: string; remove: string; langs: Localized }
}) {
  const [rows, setRows] = useState<InfoRow[]>(() => info.map((r, i) => ({ key: i, ...r })))
  const counter = useRef(info.length + 1)

  return (
    <fieldset className="field-group">
      <legend className="field-legend">{labels.title}</legend>
      <p className="caption" style={{ margin: '0 0 8px' }}>
        {labels.hint}
      </p>
      {rows.map((row, i) => (
        <div key={row.key} className="service-row">
          <div className="lang-fields">
            {langs.map((l) => (
              <div key={l} className="stack" style={{ '--stack': '8px' } as React.CSSProperties}>
                <div className="field">
                  <label htmlFor={`info-${row.key}-title-${l}`}>
                    {labels.rowTitle} · {labels.langs[l]}
                  </label>
                  <input
                    id={`info-${row.key}-title-${l}`}
                    name={`info_title_${l}`}
                    className="input"
                    defaultValue={row.title[l]}
                    maxLength={80}
                    lang={l}
                    dir={l === 'en' ? 'ltr' : 'rtl'}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`info-${row.key}-body-${l}`}>
                    {labels.rowBody} · {labels.langs[l]}
                  </label>
                  <textarea
                    id={`info-${row.key}-body-${l}`}
                    name={`info_body_${l}`}
                    className="textarea"
                    rows={2}
                    defaultValue={row.body[l]}
                    maxLength={600}
                    lang={l}
                    dir={l === 'en' ? 'ltr' : 'rtl'}
                  />
                </div>
              </div>
            ))}
          </div>
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label={`${labels.remove} ${i + 1}`}
              onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
            >
              <Icon name="trash" size={14} />
              {labels.remove}
            </button>
          </div>
        </div>
      ))}
      {rows.length < 12 && (
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const key = counter.current++
              setRows((r) => [...r, { key, title: blankText(), body: blankText() }])
            }}
          >
            <Icon name="plus" size={14} />
            {labels.add}
          </button>
        </div>
      )}
    </fieldset>
  )
}

const MAX_SIDE = 1800
const MAX_BYTES = 2 * 1024 * 1024

/** Shrinks a large photo to at most 1800px on its longest side, as JPEG. Keeps the original when that is smaller or the browser can't read it. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= 600 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

/** Picks several photos and uploads them one at a time, so each request stays small. */
export function GalleryUploader({
  clinicId,
  room,
  labels,
  localDigits = false,
}: {
  clinicId: string
  /** How many more photos fit. */
  room: number
  labels: { add: string; uploading: string; full: string; error: string }
  /** Arabic-Indic digits in the progress text, for Arabic and Kurdish. */
  localDigits?: boolean
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const num = (n: number) => (localDigits ? String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]) : String(n))

  async function upload(files: File[]) {
    setMessage(null)
    const batch = files.slice(0, room)
    let failed = files.length > room ? 'full' : ''
    for (let i = 0; i < batch.length; i++) {
      setProgress({ i: i + 1, n: batch.length })
      const blob = await shrink(batch[i])
      if (blob.size > MAX_BYTES) {
        failed ||= 'photo'
        continue
      }
      const data = new FormData()
      data.set('clinicId', clinicId)
      data.set('photo', blob, batch[i].name)
      try {
        const result = await addClinicPhoto(data)
        if (!result.ok) failed ||= result.error
        if (!result.ok && result.error !== 'photo') break
      } catch {
        failed ||= 'photo'
      }
    }
    setProgress(null)
    if (input.current) input.current.value = ''
    if (failed) setMessage(failed === 'full' ? labels.full : labels.error)
    router.refresh()
  }

  return (
    <div className="stack" style={{ '--stack': '8px' } as React.CSSProperties}>
      <div>
        <label className={`btn btn-secondary btn-sm${room <= 0 || progress ? ' is-disabled' : ''}`}>
          <Icon name="plus" size={14} />
          {progress ? labels.uploading.replace('{i}', num(progress.i)).replace('{n}', num(progress.n)) : labels.add}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="visually-hidden"
            disabled={room <= 0 || !!progress}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length) void upload(files)
            }}
          />
        </label>
      </div>
      {room <= 0 && !message && <p className="caption" style={{ margin: 0 }}>{labels.full}</p>}
      {message && (
        <p className="notice" role="alert" style={{ margin: 0 }}>
          {message}
        </p>
      )}
    </div>
  )
}
