import Link from 'next/link'
import type { Dictionary, Locale, Localized } from '@/lib/i18n'
import { locales } from '@/lib/i18n'
import { Icon } from './Icon'

/* eslint-disable @next/next/no-img-element -- uploaded photos are served from /img */

/** Staff | Clinics tabs at the top of the admin pages. */
export function AdminTabs({ active, t }: { active: 'staff' | 'clinics'; t: Dictionary }) {
  return (
    <nav className="admin-tabs" aria-label={t.admin.title}>
      <Link href="/admin" aria-current={active === 'staff' ? 'page' : undefined}>
        {t.edit.staffTab}
      </Link>
      <Link href="/admin/clinics" aria-current={active === 'clinics' ? 'page' : undefined}>
        {t.edit.clinicsTab}
      </Link>
    </nav>
  )
}

/** One field written in each language, side by side. */
export function LocalizedField({
  name,
  label,
  value,
  t,
  required = false,
  multiline = false,
  max = 200,
  prefix,
}: {
  name: string
  label: string
  value?: Localized
  t: Dictionary
  required?: boolean
  multiline?: boolean
  max?: number
  prefix: string
}) {
  return (
    <fieldset className="field-group">
      <legend className="field-legend">{label}</legend>
      {required && (
        <p className="caption" style={{ margin: '0 0 8px' }}>
          {t.edit.oneLanguage}
        </p>
      )}
      <div className="lang-fields">
        {locales.map((l: Locale) => {
          const id = `${prefix}-${name}-${l}`
          const props = {
            id,
            name: `${name}_${l}`,
            className: multiline ? 'textarea' : 'input',
            defaultValue: value?.[l] ?? '',
            maxLength: max,
            lang: l,
            dir: l === 'en' ? 'ltr' : 'rtl',
          }
          return (
            <div key={l} className="field">
              <label htmlFor={id} className="caption">
                {t.edit.langs[l]}
              </label>
              {multiline ? <textarea rows={3} {...props} /> : <input {...props} />}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Photo upload with a preview of the current photo and a way to remove it. */
export function PhotoField({ imageId, prefix, round = false, t }: { imageId: string | null; prefix: string; round?: boolean; t: Dictionary }) {
  return (
    <fieldset className="field-group">
      <legend className="field-legend">{t.edit.photo}</legend>
      <div className="photo-field">
        <span className={round ? 'photo-preview is-round' : 'photo-preview'}>
          {imageId ? <img src={`/img/${imageId}`} alt="" /> : <Icon name="image" size={22} />}
        </span>
        <div className="stack" style={{ '--stack': '8px' } as React.CSSProperties}>
          <input id={`${prefix}-photo`} name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="file-input" />
          <p className="caption" style={{ margin: 0 }}>
            {t.edit.photoHint}
          </p>
          {imageId && (
            <label className="check">
              <input type="checkbox" name="removePhoto" />
              {t.edit.removePhoto}
            </label>
          )}
        </div>
      </div>
    </fieldset>
  )
}

/** Feedback after an admin form comes back: saved, or what went wrong. */
export function FormNotice({ params, t }: { params: { saved?: string; error?: string; deleted?: string }; t: Dictionary }) {
  const error =
    params.error === 'photo'
      ? t.edit.photoError
      : params.error === 'confirm'
        ? t.edit.confirmError
        : params.error === 'exists'
          ? t.auth.exists
          : params.error === 'clinic'
            ? t.admin.needClinic
            : params.error
              ? t.auth.missing
              : null
  if (error)
    return (
      <p className="notice" role="alert">
        {error}
      </p>
    )
  if (params.saved || params.deleted)
    return (
      <p className="saved-note" role="status">
        <Icon name="check" size={16} />
        {t.edit.saved}
      </p>
    )
  return null
}
