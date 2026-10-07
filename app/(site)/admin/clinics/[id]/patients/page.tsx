import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { deleteBooking } from '@/app/admin-actions'
import { editPatient, updateBooking } from '@/app/actions'
import { AdminTabs, FormNotice } from '@/components/AdminParts'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Icon } from '@/components/Icon'
import { StatusPill } from '@/components/StatusPill'
import { getDb } from '@/db'
import { bookings } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { formatDay } from '@/lib/format'
import { getI18n } from '@/lib/locale'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.edit.patientsTitle, robots: { index: false } }
}

const statuses = ['approved', 'in_progress', 'done', 'cancelled'] as const

export default async function ClinicPatientsPage({ params, searchParams }: Props) {
  const { getClinic, getDoctor } = await getCatalog()
  const { locale, t } = await getI18n()
  const { id } = await params
  await requireUser(['admin'], `/admin/clinics/${id}/patients`)
  const clinic = getClinic(id)
  if (!clinic) notFound()
  const db = await getDb()
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.clinicId, clinic.id))
    .orderBy(desc(bookings.date), desc(bookings.time))
    .limit(500)

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <AdminTabs active="clinics" t={t} />
        <p style={{ margin: '0 0 8px' }}>
          <Link href={`/admin/clinics/${clinic.id}`} className="caption">
            {clinic.name[locale]}
          </Link>
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t.edit.patientsTitle}</h1>
        <p className="lead">{t.edit.patientsLead}</p>
        <FormNotice params={await searchParams} t={t} />
        {rows.length ? (
          <ul className="list" style={{ marginTop: 32 }}>
            {rows.map((b) => (
              <li key={b.id}>
                <details className="editor">
                  <summary className="row between">
                    <div className="row" style={{ gap: 16 }}>
                      <strong className="ticket">{b.ticket ?? '–'}</strong>
                      <div>
                        <div style={{ fontWeight: 500 }}>{b.patientName}</div>
                        <div className="meta">
                          <span>
                            <Icon name="calendar" size={14} />
                            {formatDay(locale, b.date)} · <span dir="ltr">{b.time}</span>
                          </span>
                          <span>{getDoctor(b.doctorId)?.name[locale]}</span>
                          <span dir="ltr">{b.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <StatusPill status={b.status} t={t} />
                      <span className="btn btn-secondary btn-sm">
                        <Icon name="edit" size={14} />
                        {t.edit.edit}
                      </span>
                    </div>
                  </summary>
                  <div className="stack edit-panel" style={{ '--stack': '20px' } as React.CSSProperties}>
                    <form action={editPatient} className="form-grid" style={{ alignItems: 'end' }}>
                      <input type="hidden" name="id" value={b.id} />
                      <div className="field">
                        <label htmlFor={`name-${b.id}`}>{t.assistant.name}</label>
                        <input id={`name-${b.id}`} name="patientName" className="input" defaultValue={b.patientName} required maxLength={80} />
                      </div>
                      <div className="field">
                        <label htmlFor={`phone-${b.id}`}>{t.assistant.phone}</label>
                        <input id={`phone-${b.id}`} name="phone" type="tel" className="input" defaultValue={b.phone} maxLength={30} dir="ltr" />
                      </div>
                      <div>
                        <button type="submit" className="btn btn-sm">
                          {t.edit.save}
                        </button>
                      </div>
                    </form>
                    <form action={updateBooking} className="form-grid" style={{ alignItems: 'end' }}>
                      <input type="hidden" name="id" value={b.id} />
                      <div className="field">
                        <label htmlFor={`status-${b.id}`}>{t.edit.status}</label>
                        <select id={`status-${b.id}`} name="status" className="select" defaultValue={b.status === 'pending' ? 'approved' : b.status}>
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {t.status[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <button type="submit" className="btn btn-secondary btn-sm">
                          {t.edit.save}
                        </button>
                      </div>
                    </form>
                    {b.note && (
                      <p className="caption" style={{ margin: 0 }}>
                        {t.edit.note}: {b.note}
                      </p>
                    )}
                    <form action={deleteBooking}>
                      <input type="hidden" name="id" value={b.id} />
                      <ConfirmButton label={t.edit.deleteBooking} question={t.edit.sure} className="btn btn-danger btn-sm" />
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="caption">{t.edit.noPatients}</p>
        )}
      </div>
    </section>
  )
}
