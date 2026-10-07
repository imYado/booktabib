import type { Metadata } from 'next'
import { Avatar } from '@/components/Avatar'
import { WhatsappField } from '@/components/ClinicSettings'
import { PickerForm } from '@/components/PickerForm'
import { StatusButton } from '@/components/StatusButton'
import { StatusPill } from '@/components/StatusPill'
import { WeekChart } from '@/components/WeekChart'
import { getCatalog } from '@/lib/catalog'
import { addDays, formatDay, formatNumber, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/auth'
import { getI18n } from '@/lib/locale'
import { getDoctorWhatsapps } from '@/lib/settings'
import { listBookings } from '@/lib/store'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.doctorDash.title, robots: { index: false } }
}

export default async function DoctorDashboard({ searchParams }: { searchParams: Promise<{ doctor?: string }> }) {
  const { doctors, getClinic, getDoctor } = await getCatalog()
  const { locale, t } = await getI18n()
  const user = await requireUser(['doctor', 'admin'], '/doctor')
  // Doctors see their own day; administrators can look at any doctor.
  const doctor = (user.role === 'doctor' ? getDoctor(user.doctorId ?? '') : getDoctor((await searchParams).doctor ?? '')) ?? doctors[0]
  const clinic = getClinic(doctor.clinicId)!
  const today = todayISO()

  const [mine, whatsapps] = await Promise.all([listBookings({ doctorId: doctor.id, fromDate: today }), getDoctorWhatsapps([doctor.id])])
  const todays = mine.filter((b) => b.date === today && b.status !== 'pending' && b.status !== 'cancelled')
  const waiting = todays.filter((b) => b.status === 'approved')
  const seen = todays.filter((b) => b.status === 'done')
  const current = todays.find((b) => b.status === 'in_progress')
  const pending = mine.filter((b) => b.status === 'pending' && b.date >= today)

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i)
    return { date, count: mine.filter((b) => b.date === date && b.status !== 'cancelled').length }
  })

  const stats = [
    { label: t.doctorDash.patientsToday, value: todays.length },
    { label: t.doctorDash.waiting, value: waiting.length },
    { label: t.doctorDash.seen, value: seen.length },
    { label: t.doctorDash.pendingRequests, value: pending.length },
  ]

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <div className="row between" style={{ alignItems: 'end', marginBottom: 32 }}>
          <div className="row" style={{ gap: 20 }}>
            <Avatar size={64} imageId={doctor.imageId} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {t.doctorDash.title} · {formatDay(locale, today, { weekday: 'long', month: 'long' })}
              </p>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: 0 }}>{doctor.name[locale]}</h1>
              <p className="caption" style={{ margin: 0 }}>
                {clinic.name[locale]} · {t.screen.room} {doctor.room}
              </p>
            </div>
          </div>
          {user.role === 'admin' && (
            <PickerForm
              name="doctor"
              label={t.doctorDash.doctor}
              value={doctor.id}
              options={doctors.map((d) => ({ value: d.id, label: d.name[locale] }))}
              submit={t.common.show}
            />
          )}
        </div>

        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="stat-value">{formatNumber(locale, s.value)}</div>
              <div className="caption">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="dash-grid" style={{ marginTop: 56 }}>
          <div className="stack" style={{ '--stack': '56px' } as React.CSSProperties}>
            <div>
              <h2 style={{ fontSize: '1.5rem' }}>{t.doctorDash.current}</h2>
              {current ? (
                <div className="card card-paper">
                  <div className="row between">
                    <div>
                      <div className="row" style={{ gap: 16 }}>
                        <span className="ticket" style={{ fontSize: '2rem' }}>
                          {current.ticket}
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 500 }}>{current.patientName}</span>
                      </div>
                      {current.note && <p className="caption" style={{ margin: '8px 0 0' }}>{current.note}</p>}
                    </div>
                    <StatusButton id={current.id} status="done" label={t.assistant.done} primary />
                  </div>
                </div>
              ) : (
                <div className="card">
                  <p className="caption" style={{ margin: '0 0 16px' }}>
                    {t.doctorDash.none}
                  </p>
                  {waiting[0] && <StatusButton id={waiting[0].id} status="in_progress" label={t.doctorDash.callNext} primary />}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem' }}>{t.doctorDash.week}</h2>
              <WeekChart data={week} today={today} locale={locale} label={t.doctorDash.week} />
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{t.doctorDash.schedule}</h2>
            {todays.length ? (
              <ul className="list">
                {todays.map((b) => (
                  <li key={b.id} className="queue-item">
                    <span className="ticket">{b.ticket}</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{b.patientName}</div>
                      <div className="meta">
                        <span dir="ltr">{b.time}</span>
                      </div>
                    </div>
                    <div className="actions">
                      <StatusPill status={b.status} t={t} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="caption">{t.doctorDash.noSchedule}</p>
            )}
          </div>
        </div>

        <div className="card stack" style={{ '--stack': '12px', marginTop: 56 } as React.CSSProperties}>
          <p className="caption" style={{ margin: 0 }}>
            {t.settings.whatsappHint.replace('{phone}', clinic.phone)}
          </p>
          <WhatsappField doctor={doctor} value={whatsapps[doctor.id] ?? ''} label={t.settings.myWhatsapp} t={t} />
        </div>
      </div>
    </section>
  )
}
