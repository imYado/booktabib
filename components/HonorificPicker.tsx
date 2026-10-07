'use client'

import { useState } from 'react'
import { honorifics, type HonorificId } from '@/lib/data'
import { locales, type Locale, type Localized } from '@/lib/i18n'

type Labels = { honorific: string; noHonorific: string; otherHonorific: string; honorificOther: string; langs: Localized }

/** Picks the title shown before a doctor's name (Dr., Prof., Consultant…), or lets the admin type their own. */
export function HonorificPicker({
  prefix,
  value,
  other,
  locale,
  t,
  allowOther = true,
}: {
  prefix: string
  value: HonorificId
  other?: Localized
  locale: Locale
  t: Labels
  allowOther?: boolean
}) {
  const [choice, setChoice] = useState<HonorificId>(value)
  const id = `${prefix}-honorific`
  return (
    <div className="stack" style={{ '--stack': '12px' } as React.CSSProperties}>
      <div className="field">
        <label htmlFor={id}>{t.honorific}</label>
        <select id={id} name="honorific" className="select" value={choice} onChange={(e) => setChoice(e.target.value as HonorificId)}>
          {(Object.keys(honorifics) as (keyof typeof honorifics)[]).map((h) => {
            const own = honorifics[h][locale]
            const alt = locale === 'en' ? honorifics[h].ar : honorifics[h].en
            return (
              <option key={h} value={h}>
                {/* Isolate each script so "د." keeps its dot in the right place. */}
                {own === alt ? own : `\u2068${own}\u2069 / \u2068${alt}\u2069`}
              </option>
            )
          })}
          <option value="none">{t.noHonorific}</option>
          {allowOther && <option value="other">{t.otherHonorific}</option>}
        </select>
      </div>
      {choice === 'other' && (
        <div className="lang-fields">
          {locales.map((l) => (
            <div key={l} className="field">
              <label htmlFor={`${prefix}-hon-${l}`} className="caption">
                {t.honorificOther} ({t.langs[l]})
              </label>
              <input
                id={`${prefix}-hon-${l}`}
                name={`honorificOther_${l}`}
                className="input"
                defaultValue={other?.[l] ?? ''}
                maxLength={40}
                lang={l}
                dir={l === 'en' ? 'ltr' : 'rtl'}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
