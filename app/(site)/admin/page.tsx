import type { Metadata } from 'next'
import { asc } from 'drizzle-orm'
import { CreateStaffForm } from '@/components/CreateStaffForm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { clinics, doctors, getClinic, getDoctor } from '@/lib/data'
import { getI18n } from '@/lib/locale'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.admin.title, robots: { index: false } }
}

export default async function AdminPage() {
  const { locale, t } = await getI18n()
  await requireUser(['admin'], '/admin')
  const db = await getDb()
  const staff = (
    await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, clinicId: users.clinicId, doctorId: users.doctorId })
      .from(users)
      .orderBy(asc(users.role), asc(users.name))
  ).filter((u) => u.role !== 'patient')

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t.admin.title}</h1>
        <p className="lead">{t.admin.lead}</p>
        <div className="dash-grid" style={{ marginTop: 40 }}>
          <CreateStaffForm
            t={t.admin}
            labels={{ name: t.auth.name, email: t.auth.email, missing: t.auth.missing, exists: t.auth.exists }}
            clinics={clinics.map((c) => ({ value: c.id, label: c.name[locale] }))}
            doctors={doctors.map((d) => ({ value: d.id, label: `${d.name[locale]} · ${getClinic(d.clinicId)?.name[locale]}` }))}
          />
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{t.admin.accounts}</h2>
            <ul className="list">
              {staff.map((u) => (
                <li key={u.id} className="row between">
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.name}</div>
                    <div className="meta">
                      <span dir="ltr">{u.email}</span>
                      {u.doctorId && <span>{getDoctor(u.doctorId)?.name[locale]}</span>}
                      {!u.doctorId && u.clinicId && <span>{getClinic(u.clinicId)?.name[locale]}</span>}
                    </div>
                  </div>
                  <span className="pill">{t.admin.roles[u.role]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
