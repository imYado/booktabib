'use client'

import { useRef, useState } from 'react'
import type { Locale, Localized } from '@/lib/i18n'
import { Icon } from './Icon'

type Row = { key: number; name: Localized; fee: number | '' }

const langs: Locale[] = ['en', 'ar', 'ckb']
const blank = (key: number): Row => ({ key, name: { en: '', ar: '', ckb: '' }, fee: '' })

/**
 * A doctor's services, each with a name in every language and a price. Rows are sent as parallel
 * lists (service_name_en, service_name_ar, service_name_ckb, service_fee) in the order shown.
 */
export function ServicesEditor({
  prefix,
  services,
  labels,
}: {
  prefix: string
  services: { name: Localized; fee: number }[]
  labels: { title: string; hint: string; name: string; fee: string; add: string; remove: string; langs: Localized }
}) {
  const [rows, setRows] = useState<Row[]>(() => (services.length ? services.map((s, i) => ({ key: i, ...s })) : [blank(0)]))
  const counter = useRef(services.length + 1)
  const fresh = () => blank(counter.current++)

  return (
    <fieldset className="field-group services-editor">
      <legend className="field-legend">{labels.title}</legend>
      <p className="caption" style={{ margin: '0 0 8px' }}>
        {labels.hint}
      </p>
      {rows.map((row, i) => (
        <div key={row.key} className="service-row">
          <div className="lang-fields">
            {langs.map((l) => (
              <div key={l} className="field">
                <label htmlFor={`${prefix}-service-${row.key}-${l}`}>
                  {labels.name} · {labels.langs[l]}
                </label>
                <input
                  id={`${prefix}-service-${row.key}-${l}`}
                  name={`service_name_${l}`}
                  className="input"
                  defaultValue={row.name[l]}
                  maxLength={80}
                  lang={l}
                  dir={l === 'en' ? 'ltr' : 'rtl'}
                />
              </div>
            ))}
          </div>
          <div className="row" style={{ alignItems: 'end' }}>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor={`${prefix}-service-${row.key}-fee`}>{labels.fee}</label>
              <input id={`${prefix}-service-${row.key}-fee`} name="service_fee" type="number" min={0} step={1000} className="input" defaultValue={row.fee} dir="ltr" />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label={`${labels.remove} ${i + 1}`}
              onClick={() => setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== row.key) : [fresh()]))}
            >
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
              const row = fresh()
              setRows((r) => [...r, row])
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
