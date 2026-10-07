import type { Metadata } from 'next'
import { asc, ne } from 'drizzle-orm'
import { AccountEditor } from '@/components/AccountEditor'
import { AdminTabs, FormNotice } from '@/components/AdminParts'
import { CreateStaffForm } from '@/components/CreateStaffForm'
import { Icon } from '@/components/Icon'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { getI18n } from '@/lib/locale'
import { staffOptions } from './staff-options'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.admin.title, robots: { index: false } }
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const catalog = await getCatalog()
  const { getClinic, getDoctor } = catalog
  const { locale, t } = await getI18n()
  const me = await requireUser(['admin'], '/admin')
  const db = await getDb()
  const staff = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, clinicId: users.clinicId, doctorId: users.doctorId })
    .from(users)
    .where(ne(users.role, 'patient'))
    .orderBy(asc(users.role), asc(users.name))
  const options = staffOptions(catalog, locale)
  const labels = { name: t.auth.name, email: t.auth.email }

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <AdminTabs active="staff" t={t} />
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t.admin.title}</h1>
        <p className="lead">{t.admin.lead}</p>
        <FormNotice params={await searchParams} t={t} />
        <div className="dash-grid" style={{ marginTop: 40 }}>
          <CreateStaffForm t={t.admin} labels={{ ...labels, missing: t.auth.missing, exists: t.auth.exists }} {...options} />
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{t.admin.accounts}</h2>
            <ul className="list">
              {staff.map((u) => (
                <li key={u.id}>
                  <details className="editor">
                    <summary className="row between">
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {u.name}
                          {u.id === me.id && <span className="caption"> · {t.edit.you}</span>}
                        </div>
                        <div className="meta">
                          <span dir="ltr">{u.email}</span>
                          {u.clinicId && <span>{getClinic(u.clinicId)?.name[locale]}</span>}
                          {u.doctorId && <span>{getDoctor(u.doctorId)?.name[locale]}</span>}
                          {u.role !== 'admin' && !u.clinicId && <span>{t.edit.noClinic}</span>}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="pill">{t.admin.roles[u.role]}</span>
                        <span className="btn btn-secondary btn-sm">
                          <Icon name="edit" size={14} />
                          {t.edit.edit}
                        </span>
                      </div>
                    </summary>
                    <AccountEditor account={u} isSelf={u.id === me.id} back="/admin" t={{ admin: t.admin, edit: t.edit }} labels={labels} {...options} />
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
