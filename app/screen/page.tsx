import type { Metadata } from 'next'
import { AutoRefresh } from '@/components/AutoRefresh'
import { clinics, getClinic, getDoctor } from '@/lib/data'
import { formatDay, todayISO } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { listBookings } from '@/lib/store'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.nav.screen, robots: { index: false } }
}

export default async function ScreenPage({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  const { locale, t } = await getI18n()
  const clinic = getClinic((await searchParams).clinic ?? '') ?? clinics[0]
  const today = todayISO()

  const queue = listBookings({ clinicId: clinic.id, date: today })
  const serving = queue
    .filter((b) => b.status === 'in_progress')
    .sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0))
  const current = serving[0]
  const others = serving.slice(1)
  const next = queue.filter((b) => b.status === 'approved').slice(0, 4)
  const doctor = current ? getDoctor(current.doctorId) : undefined

  return (
    <main className="screen">
      <AutoRefresh seconds={5} />
      <header className="screen-top">
        <strong>{clinic.name[locale]}</strong>
        <span className="caption" style={{ fontSize: 'inherit' }}>
          {formatDay(locale, today, { weekday: 'long', month: 'long' })}
        </span>
      </header>

      <section className="screen-main" aria-live="polite">
        {current ? (
          <>
            <p className="screen-label">{t.screen.nowServing}</p>
            <div className="screen-ticket">{current.ticket}</div>
            <h1 className="screen-name">{current.patientName}</h1>
            {doctor && (
              <p className="screen-room">
                {t.screen.goTo} {t.screen.room} {doctor.room} · {doctor.name[locale]}
              </p>
            )}
            {others.length > 0 && (
              <p className="screen-label" style={{ fontSize: 'clamp(1.25rem, 2.4vw, 3rem)' }}>
                {others.map((b) => `${b.ticket} · ${b.patientName} · ${t.screen.room} ${getDoctor(b.doctorId)?.room}`).join('   |   ')}
              </p>
            )}
          </>
        ) : (
          <h1 className="screen-name" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)' }}>
            {t.screen.nobody}
          </h1>
        )}
      </section>

      <footer className="screen-next">
        <span className="caption" style={{ fontSize: 'inherit' }}>
          {t.screen.next}
        </span>
        {next.map((b) => (
          <span key={b.id}>
            <strong>{b.ticket}</strong> {b.patientName}
          </span>
        ))}
      </footer>
    </main>
  )
}
