import type { ReactNode } from 'react'
import { addPatient, editPatient } from '@/app/actions'
import type { Doctor } from '@/lib/data'
import type { Dictionary, Locale } from '@/lib/i18n'
import type { Booking } from '@/lib/store'
import { Icon } from './Icon'
import { StatusPill } from './StatusPill'

/** One patient in the desk's lists: number, name, details, then actions and the hidden edit form. */
export function PatientRow({
  b,
  doctorName,
  t,
  children,
}: {
  b: Booking
  doctorName?: string
  t: Dictionary
  children?: ReactNode
}) {
  return (
    <>
      <span className="ticket">{b.ticket}</span>
      <div>
        <div style={{ fontWeight: 500 }}>{b.patientName}</div>
        <div className="meta">
          <span dir="ltr">{b.time}</span>
          {b.walkIn && <span>{t.assistant.walkIn}</span>}
          {doctorName && <span>{doctorName}</span>}
          {b.phone && <span dir="ltr">{b.phone}</span>}
          <StatusPill status={b.status} t={t} />
        </div>
      </div>
      <div className="actions row">{children}</div>
      <PatientEditor b={b} t={t} />
    </>
  )
}

/** Opens the edit form below a patient. Works without JavaScript: it ticks a hidden checkbox. */
export function EditToggle({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={`edit-${id}`} className="btn btn-secondary btn-sm">
      <Icon name="edit" size={14} />
      {label}
    </label>
  )
}

export function PatientEditor({ b, t }: { b: Booking; t: Dictionary }) {
  return (
    <>
      <input type="checkbox" id={`edit-${b.id}`} className="edit-toggle visually-hidden" tabIndex={-1} />
      <form action={editPatient} className="edit-form">
        <input type="hidden" name="id" value={b.id} />
        <div className="field">
          <label htmlFor={`name-${b.id}`}>{t.assistant.name}</label>
          <input id={`name-${b.id}`} name="patientName" className="input" defaultValue={b.patientName} required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor={`phone-${b.id}`}>{t.assistant.phone}</label>
          <input id={`phone-${b.id}`} name="phone" type="tel" className="input" defaultValue={b.phone} maxLength={30} dir="ltr" />
        </div>
        <button type="submit" className="btn btn-sm">
          {t.assistant.save}
        </button>
      </form>
    </>
  )
}

/** Adds a walk-in or phoned-in patient straight to the end of today's line. */
export function AddPatientForm({ doctors, locale, t }: { doctors: Doctor[]; locale: Locale; t: Dictionary }) {
  return (
    <details className="add-patient">
      <summary className="btn btn-secondary btn-sm">
        <Icon name="plus" size={14} />
        {t.assistant.addPatient}
      </summary>
      <form action={addPatient} className="add-form">
        <div className="field">
          <label htmlFor="add-name">{t.assistant.name}</label>
          <input id="add-name" name="patientName" className="input" required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="add-phone">{t.assistant.phone}</label>
          <input id="add-phone" name="phone" type="tel" className="input" maxLength={30} dir="ltr" placeholder="07…" />
        </div>
        <div className="field">
          <label htmlFor="add-doctor">{t.assistant.doctor}</label>
          <select id="add-doctor" name="doctorId" className="select">
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name[locale]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">
          {t.assistant.add}
        </button>
      </form>
    </details>
  )
}
