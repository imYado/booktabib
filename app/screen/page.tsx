import type { Metadata } from 'next'
import { AutoRefresh } from '@/components/AutoRefresh'
import { getCatalog } from '@/lib/catalog'
import { formatDay, localDigits, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/auth'
import { accentStyle } from '@/lib/accents'
import { getI18n } from '@/lib/locale'
import { dictionaries, dirFor } from '@/lib/i18n'
import { getClinicAccent, getScreenLocale } from '@/lib/settings'
import { listBookings, nowServing } from '@/lib/store'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.nav.screen, robots: { index: false } }
}

export default async function ScreenPage({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  const { clinics, getClinic, getDoctor } = await getCatalog()
  // Patient names are shown, so the screen needs a staff login (the clinic TV stays signed in).
  const user = await requireUser(['assistant', 'admin'], '/screen')
  const clinic = (user.role === 'assistant' ? getClinic(user.clinicId ?? '') : getClinic((await searchParams).clinic ?? '')) ?? clinics[0]
  const today = todayISO()

  const [serving, waiting, accent, locale] = await Promise.all([
    nowServing(clinic.id, today),
    listBookings({ clinicId: clinic.id, date: today, status: 'approved' }),
    getClinicAccent(clinic.id),
    // The screen has its own language, set on the desk, so a TV left in English still shows Arabic.
    getScreenLocale(clinic.id),
  ])
  const t = dictionaries[locale]
  const current = serving[0]
  const others = serving.slice(1)
  const next = waiting.slice(0, 6)
  const doctor = current ? getDoctor(current.doctorId) : undefined

  return (
    // The clinic's colour fills the screen; the default warm paper keeps the plain white background.
    <main className={`screen${accent === 'paper' ? '' : ' screen-tinted'}`} style={accentStyle(accent)} lang={locale} dir={dirFor(locale)}>
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
            <div className="screen-ticket">{localDigits(locale, current.ticket ?? '')}</div>
            <h1 className="screen-name">{current.patientName}</h1>
            {doctor && (
              <p className="screen-room">
                {t.screen.goTo} {t.screen.room} {localDigits(locale, doctor.room)} · {doctor.name[locale]}
              </p>
            )}
            {others.length > 0 && (
              <p className="screen-label" style={{ fontSize: 'clamp(1.25rem, 2.4vw, 3rem)' }}>
                {others.map((b) => `${localDigits(locale, b.ticket ?? '')} · ${b.patientName} · ${t.screen.room} ${localDigits(locale, getDoctor(b.doctorId)?.room ?? '')}`).join('   |   ')}
              </p>
            )}
          </>
        ) : (
          <h1 className="screen-name" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)' }}>
            {t.screen.nobody}
          </h1>
        )}
      </section>

      {next.length > 0 && (
        <section className="screen-next">
          <h2 className="screen-next-title">{t.screen.next}</h2>
          <ol className="screen-next-list">
            {next.map((b, i) => (
              <li key={b.id}>
                <span className="screen-next-pos">{localDigits(locale, i + 1)}</span>
                <span className="screen-next-name">{b.patientName}</span>
                <span className="screen-next-ticket">
                  {t.screen.ticket} {localDigits(locale, b.ticket ?? '')}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  )
}
