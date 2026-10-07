'use client'

import { useActionState, useState } from 'react'
import { createStaff, type CreateStaffState } from '@/app/actions'
import type { Dictionary } from '@/lib/i18n'

export type Option = { value: string; label: string }
export type DoctorOption = Option & { shortLabel: string; clinicId: string }
export type StaffValues = { name: string; email: string; role: string; clinicId: string | null; doctorId: string | null }

export function CreateStaffForm({
  t,
  labels,
  clinics,
  doctors,
}: {
  t: Dictionary['admin']
  labels: { name: string; email: string; missing: string; exists: string }
  clinics: Option[]
  doctors: DoctorOption[]
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

/** Name, email, role and workplace of a staff account. `prefix` keeps field ids unique when several are on a page. */
export function Fields({
  t,
  labels,
  clinics,
  doctors,
  prefix = 'staff',
  initial,
  lockRole = false,
}: {
  t: Dictionary['admin']
  labels: { name: string; email: string }
  clinics: Option[]
  doctors: DoctorOption[]
  prefix?: string
  initial?: StaffValues
  lockRole?: boolean
}) {
  const [role, setRole] = useState(initial?.role ?? 'assistant')
  const [clinicId, setClinicId] = useState(initial?.clinicId ?? clinics[0]?.value ?? '')
  return (
    <>
      <div className="field">
        <label htmlFor={`${prefix}-name`}>{labels.name}</label>
        <input id={`${prefix}-name`} name="name" className="input" required maxLength={80} defaultValue={initial?.name} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-email`}>{labels.email}</label>
        <input id={`${prefix}-email`} name="email" type="email" className="input" required dir="ltr" defaultValue={initial?.email} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-role`}>{t.role}</label>
        <select id={`${prefix}-role`} name="role" className="select" value={role} onChange={(e) => setRole(e.target.value)} disabled={lockRole}>
          <option value="assistant">{t.roles.assistant}</option>
          <option value="doctor">{t.roles.doctor}</option>
          <option value="admin">{t.roles.admin}</option>
        </select>
      </div>
      {role === 'assistant' && (
        <div className="field">
          <label htmlFor={`${prefix}-clinic`}>{t.clinic}</label>
          <select
            id={`${prefix}-clinic`}
            name="clinicId"
            className="select"
            required
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
          >
            {clinics.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {role === 'assistant' && (
        <div className="field">
          <label htmlFor={`${prefix}-for`}>{t.assistantFor}</label>
          <select
            id={`${prefix}-for`}
            name="doctorId"
            className="select"
            defaultValue={initial?.role === 'assistant' && initial.clinicId === clinicId ? (initial.doctorId ?? '') : ''}
            key={clinicId}
          >
            <option value="">{t.wholeClinic}</option>
            {doctors
              .filter((d) => d.clinicId === clinicId)
              .map((d) => (
                <option key={d.value} value={d.value}>
                  {d.shortLabel}
                </option>
              ))}
          </select>
        </div>
      )}
      {role === 'doctor' && (
        <div className="field">
          <label htmlFor={`${prefix}-doctor`}>{t.doctor}</label>
          <select id={`${prefix}-doctor`} name="doctorId" className="select" required defaultValue={initial?.doctorId ?? undefined}>
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
