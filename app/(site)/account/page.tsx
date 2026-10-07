import type { Metadata } from 'next'
import Link from 'next/link'
import { StatusPill } from '@/components/StatusPill'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { formatDay, todayISO } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { listBookings, type Booking } from '@/lib/store'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.account.title, robots: { index: false } }
}

export default async function AccountPage() {
  const { getClinic, getDoctor } = await getCatalog()
  const { locale, t } = await getI18n()
  const user = await requireUser(['patient', 'assistant', 'doctor', 'admin'], '/account')
  const today = todayISO()
  const all = await listBookings({ userId: user.id })
  const upcoming = all.filter((b) => b.date >= today && b.status !== 'done')
  const past = all.filter((b) => !upcoming.includes(b)).reverse()

  const list = (items: Booking[]) => (
    <ul className="list">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/bookings/${b.id}`} className="row between" style={{ textDecoration: 'none' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{getDoctor(b.doctorId)?.name[locale]}</div>
              <div className="meta">
                <span>{getClinic(b.clinicId)?.name[locale]}</span>
                <span>
                  {formatDay(locale, b.date)} · <span dir="ltr">{b.time}</span>
                </span>
              </div>
            </div>
            <StatusPill status={b.status} t={t} />
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="section-tight">
      <div className="container" style={{ maxWidth: 820, paddingTop: 32, paddingBottom: 72 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t.account.title}</h1>
        <p className="lead">{t.account.lead}</p>
        {all.length === 0 ? (
          <div className="card card-paper" style={{ marginTop: 32 }}>
            <p>{t.account.empty}</p>
            <Link href="/clinics" className="btn">
              {t.account.find}
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: '1.5rem' }}>{t.account.upcoming}</h2>
                {list(upcoming)}
              </div>
            )}
            {past.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: '1.5rem' }}>{t.account.past}</h2>
                {list(past)}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
