'use client'

import { useActionState, useState } from 'react'
import { createStaff, type CreateStaffState } from '@/app/actions'
import type { Dictionary } from '@/lib/i18n'

type Option = { value: string; label: string }

export function CreateStaffForm({
  t,
  labels,
  clinics,
  doctors,
}: {
  t: Dictionary['admin']
  labels: { name: string; email: string; missing: string; exists: string }
  clinics: Option[]
  doctors: Option[]
}) {
  const [state, action, pending] = useActionState<CreateStaffState, FormData>(createStaff, null)

  return (
    <form action={action} className="card stack" style={{ '--stack': '20px', alignSelf: 'start' } as React.CSSProperties}>
      <h2 style={{ fontSize: '1.5rem' }}>{t.create}</h2>
      {/* React clears the form after a successful submit, so remount the fields to match. */}
      <Fields key={state?.ok ? state.email : 'fields'} t={t} labels={labels} clinics={clinics} doctors={doctors} />
      {state && !state.ok && (
        <p className="notice" role="alert">
          {state.error === 'exists' ? labels.exists : state.error === 'clinic' ? t.needClinic : labels.missing}
        </p>
      )}
      {state?.ok && (
        <div className="card card-paper" role="status">
          <p style={{ margin: 0 }}>{t.created.replace('{email}', state.email)}</p>
          <p dir="ltr" style={{ margin: '8px 0 0', fontFamily: 'monospace', fontSize: '1.25rem' }}>
            {state.password}
          </p>
        </div>
      )}
      <button type="submit" className="btn btn-block" disabled={pending}>
        {t.create}
      </button>
    </form>
  )
}

function Fields({
  t,
  labels,
  clinics,
  doctors,
}: {
  t: Dictionary['admin']
  labels: { name: string; email: string }
  clinics: Option[]
  doctors: Option[]
}) {
  const [role, setRole] = useState('assistant')
  return (
    <>
      <div className="field">
        <label htmlFor="staff-name">{labels.name}</label>
        <input id="staff-name" name="name" className="input" required maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="staff-email">{labels.email}</label>
        <input id="staff-email" name="email" type="email" className="input" required dir="ltr" />
      </div>
      <div className="field">
        <label htmlFor="staff-role">{t.role}</label>
        <select id="staff-role" name="role" className="select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="assistant">{t.roles.assistant}</option>
          <option value="doctor">{t.roles.doctor}</option>
          <option value="admin">{t.roles.admin}</option>
        </select>
      </div>
      {role === 'assistant' && (
        <div className="field">
          <label htmlFor="staff-clinic">{t.clinic}</label>
          <select id="staff-clinic" name="clinicId" className="select" required>
            {clinics.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {role === 'doctor' && (
        <div className="field">
          <label htmlFor="staff-doctor">{t.doctor}</label>
          <select id="staff-doctor" name="doctorId" className="select" required>
            {doctors.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
