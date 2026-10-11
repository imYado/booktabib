import { addRenewal, closeRenewal, toggleRenewalNotified } from '@/app/prescription-actions'
import type { Booking } from '@/db/schema'
import type { Doctor } from '@/lib/data'
import { whatsappNumber } from '@/lib/data'
import { addDays, formatDay, todayISO } from '@/lib/format'
import type { Dictionary, Locale } from '@/lib/i18n'
import type { RenewalRow } from '@/lib/prescriptions'
import { Icon } from './Icon'
import { RenewalWhatsapp } from './RenewalWhatsapp'

/**
 * Prescription renewals on the desk and the doctor's dashboard: who needs a new prescription in the
 * next 7 days, whether they were told, and a form to add one.
 */
export function RenewalsPanel({
  rows,
  doctors,
  recent,
  clinicName,
  origin,
  back,
  flag,
  locale,
  t,
}: {
  rows: RenewalRow[]
  doctors: Doctor[]
  recent: Booking[]
  clinicName: string
  origin: string
  back: string
  flag?: string
  locale: Locale
  t: Dictionary
}) {
  const r = t.renew
  const today = todayISO()
  const soon = rows.filter((p) => p.daysLeft <= 7)
  const later = rows.filter((p) => p.daysLeft > 7)
  const doctorName = (id: string) => doctors.find((d) => d.id === id)?.name[locale] ?? ''
  const when = (p: RenewalRow) => (p.daysLeft === 0 ? r.today : p.daysLeft < 0 ? r.overdue(-p.daysLeft) : r.inDays(p.daysLeft))

  const row = (p: RenewalRow) => {
    const date = formatDay(locale, p.renewOn, { weekday: 'long', month: 'long' })
    const phone = whatsappNumber(p.phone)
    const message = r.whatsappText(p.patientName, clinicName, date, `${origin}/doctors/${p.doctorId}`)
    return (
      <li key={p.id} className="renewal">
        <div className="renewal-main">
          <div style={{ fontWeight: 500 }}>{p.patientName}</div>
          <div className="meta">
            <span className={p.daysLeft <= 0 ? 'renewal-due' : undefined}>
              <Icon name="calendar" size={14} />
              {formatDay(locale, p.renewOn)} · {when(p)}
            </span>
            {doctors.length > 1 && <span>{doctorName(p.doctorId)}</span>}
            {p.phone && <span dir="ltr">{p.phone}</span>}
          </div>
          <div className="renewal-flags">
            {(!p.userId || p.appSentAt || !p.booked) && (
              <span className={p.appSentAt ? 'flag flag-on' : 'flag'}>{!p.userId ? r.noAccount : p.appSentAt ? r.appSent : r.appLater}</span>
            )}
            {p.booked && <span className="flag flag-on">{r.booked}</span>}
          </div>
        </div>
        <div className="row renewal-actions">
          <form action={toggleRenewalNotified}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className={p.notifiedAt ? 'check is-on' : 'check'} aria-pressed={!!p.notifiedAt}>
              <span className="check-box" aria-hidden="true">
                {p.notifiedAt && <Icon name="check" size={14} />}
              </span>
              {r.notified}
            </button>
          </form>
          {phone.length >= 8 && <RenewalWhatsapp id={p.id} href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} label={r.whatsapp} />}
          <form action={closeRenewal}>
            <input type="hidden" name="id" value={p.id} />
            <button type="submit" className="btn btn-secondary btn-sm">
              {r.renewed}
            </button>
          </form>
        </div>
      </li>
    )
  }

  // Each patient seen in the last 90 days or booked in the next 30, once, latest booking first.
  const seen = new Set<string>()
  const picks = [...recent]
    .reverse()
    .filter((b) => {
      const key = `${b.patientName}|${b.phone.replace(/\D/g, '')}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 60)

  return (
    <section id="renewals" className="renewals">
      <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{r.title}</h2>
      <p className="caption" style={{ margin: '4px 0 16px' }}>
        {r.lead}
      </p>
      {flag === 'added' && (
        <p className="saved-note" role="status">
          <Icon name="check" size={16} />
          {r.added}
        </p>
      )}
      {flag === 'missing' && (
        <p className="notice" role="alert">
          {r.missing}
        </p>
      )}
      {soon.length ? <ul className="list">{soon.map(row)}</ul> : <p className="caption">{r.none}</p>}
      {later.length > 0 && (
        <details className="renewals-later">
          <summary>{r.later(later.length)}</summary>
          <ul className="list">{later.map(row)}</ul>
        </details>
      )}

      <form action={addRenewal} className="add-form" style={{ marginTop: 24 }}>
        <input type="hidden" name="back" value={back} />
        <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{r.add}</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="renew-booking">{r.fromBooking}</label>
            <select id="renew-booking" name="bookingId" className="select" defaultValue="">
              <option value="">{r.someoneElse}</option>
              {picks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.patientName} · {formatDay(locale, b.date)}
                  {doctors.length > 1 ? ` · ${doctorName(b.doctorId)}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="renew-date">{r.date}</label>
            <input id="renew-date" name="renewOn" type="date" className="input" required min={today} max={addDays(today, 366)} defaultValue={addDays(today, 30)} dir="ltr" />
          </div>
        </div>
        <p className="caption" style={{ margin: 0 }}>
          {r.manualHint}
        </p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="renew-name">{r.name}</label>
            <input id="renew-name" name="patientName" className="input" maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="renew-phone">{r.phone}</label>
            <input id="renew-phone" name="phone" type="tel" className="input" maxLength={30} dir="ltr" placeholder="+964" />
          </div>
          {doctors.length > 1 ? (
            <div className="field">
              <label htmlFor="renew-doctor">{r.doctor}</label>
              <select id="renew-doctor" name="doctorId" className="select">
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name[locale]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="doctorId" value={doctors[0]?.id ?? ''} />
          )}
        </div>
        <div>
          <button type="submit" className="btn">
            <Icon name="plus" size={16} />
            {r.addButton}
          </button>
        </div>
      </form>
    </section>
  )
}
