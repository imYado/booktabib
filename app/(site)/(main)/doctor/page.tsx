import type { Metadata } from 'next'
import { Avatar } from '@/components/Avatar'
import { VisitMinutesField, WhatsappField } from '@/components/ClinicSettings'
import { PickerForm } from '@/components/PickerForm'
import { StatusButton } from '@/components/StatusButton'
import { StatusPill } from '@/components/StatusPill'
import { BarChart } from '@/components/BarChart'
import { addRenewal } from '@/app/prescription-actions'
import { Icon } from '@/components/Icon'
import { getCatalog } from '@/lib/catalog'
import { addDays, formatDay, formatNumber, formatTime, localDigits, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/auth'
import { getI18n } from '@/lib/locale'
import { getDoctorWhatsapps, getVisitMinutes } from '@/lib/settings'
import { estimateLine, listBookings, nowMinutes } from '@/lib/store'
import { QueueSwitch } from '@/components/QueueSwitch'
import { headers } from 'next/headers'
import { deskSendsRenewals, listRenewals } from '@/lib/prescriptions'
import { returnRates, visitLengths } from '@/lib/analytics'
import { isWorkingDay } from '@/lib/data'
import { RenewalsPanel } from '@/components/RenewalsPanel'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.doctorDash.title, robots: { index: false } }
}

export default async function DoctorDashboard({ searchParams }: { searchParams: Promise<{ doctor?: string; renew?: string }> }) {
  const { doctors, getClinic, getDoctor } = await getCatalog()
  const { locale, t } = await getI18n()
  const user = await requireUser(['doctor', 'admin'], '/doctor')
  // Doctors see their own day; administrators can look at any doctor.
  const query = await searchParams
  const doctor = (user.role === 'doctor' ? getDoctor(user.doctorId ?? '') : getDoctor(query.doctor ?? '')) ?? doctors[0]
  const clinic = getClinic(doctor.clinicId)!
  const today = todayISO()

  // The last 7 working days, up to today, for the visit length chart.
  const pastDays: string[] = []
  for (let i = 0; pastDays.length < 7 && i < 14; i++) if (isWorkingDay(addDays(today, -i))) pastDays.unshift(addDays(today, -i))

  const [mine, whatsapps, visitMinutes, renewals, recent, lengths, returns, deskSends] = await Promise.all([
    listBookings({ doctorId: doctor.id, fromDate: today }),
    getDoctorWhatsapps([doctor.id]),
    getVisitMinutes([doctor.id]),
    listRenewals(clinic.id, doctor.id),
    listBookings({ doctorId: doctor.id, fromDate: addDays(today, -90), status: ['pending', 'approved', 'in_progress', 'done'] }),
    visitLengths(doctor.id, pastDays),
    returnRates(doctor.id, today),
    deskSendsRenewals(clinic.id, doctor.id),
  ])
  const back = user.role === 'admin' ? `/doctor?doctor=${doctor.id}` : '/doctor'
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  const todays = mine.filter((b) => b.date === today && b.status !== 'pending' && b.status !== 'cancelled')
  const waiting = todays.filter((b) => b.status === 'approved')
  const seen = todays.filter((b) => b.status === 'done')
  const current = todays.find((b) => b.status === 'in_progress')
  const pending = mine.filter((b) => b.status === 'pending' && b.date >= today)
  const estimates = estimateLine(todays, visitMinutes[doctor.id], nowMinutes())

  const d = t.doctorDash
  const n = (value: number) => formatNumber(locale, value)
  const weekday = (date: string) => formatDay(locale, date, { day: undefined, month: undefined })
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i)
    const count = mine.filter((b) => b.date === date && b.status !== 'cancelled').length
    return { key: date, label: weekday(date), value: count, text: n(count), highlight: date === today }
  })
  const visitBars = lengths.days.map((day) => ({
    key: day.date,
    label: weekday(day.date),
    value: day.average ?? 0,
    text: day.average === null ? '–' : d.minutes(n(day.average)),
    highlight: day.date === today,
  }))
  // Weeks before the first prescription came due are left off, keeping at least four.
  const firstDue = returns.weeks.findIndex((w) => w.due > 0)
  const returnWeeks = returns.weeks.slice(Math.min(Math.max(firstDue, 0), returns.weeks.length - 4))
  const returnBars = returnWeeks.map((w, i) => ({
    key: w.start,
    label: formatDay(locale, w.start, { weekday: undefined }),
    value: w.rate ?? 0,
    text: w.rate === null ? '–' : d.percent(n(w.rate)),
    highlight: i === returnWeeks.length - 1,
  }))

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
                {clinic.name[locale]} · {t.screen.room} {localDigits(locale, doctor.room)}
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

        <div className="dash-grid" style={{ marginTop: 40 }}>
          <div className="stack" style={{ '--stack': '24px' } as React.CSSProperties}>
            <section className={`card panel${current ? ' card-paper' : ''}`}>
              <div className="panel-head">
                <h2>{t.doctorDash.current}</h2>
              </div>
              {current ? (
                <div className="stack" style={{ '--stack': '16px' } as React.CSSProperties}>
                  <div>
                    <div className="row" style={{ gap: 16 }}>
                      <span className="ticket" style={{ fontSize: '2rem' }}>
                        {localDigits(locale, current.ticket ?? '')}
                      </span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 500 }}>{current.patientName}</span>
                    </div>
                    {current.service && <p style={{ margin: '4px 0 0' }}>{current.service.name[locale]}</p>}
                    {current.note && <p className="caption" style={{ margin: '8px 0 0' }}>{current.note}</p>}
                  </div>
                  <div className="row">
                    <StatusButton id={current.id} status="done" label={t.assistant.done} primary />
                    <StatusButton id={current.id} status="approved" label={t.assistant.backToWaiting} />
                  </div>
                  <form action={addRenewal} className="row quick-renewal">
                    <input type="hidden" name="bookingId" value={current.id} />
                    <input type="hidden" name="back" value={back} />
                    <label htmlFor="quick-renew">{t.renew.quickAdd}</label>
                    <input id="quick-renew" name="renewOn" type="date" className="input" required min={today} max={addDays(today, 366)} defaultValue={addDays(today, 30)} dir="ltr" />
                    <button type="submit" className="btn btn-secondary btn-sm">
                      <Icon name="calendar" size={14} />
                      {t.renew.quickButton}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <p className="caption" style={{ margin: '0 0 16px' }}>
                    {t.doctorDash.none}
                  </p>
                  {waiting[0] && <StatusButton id={waiting[0].id} status="in_progress" label={t.doctorDash.callNext} primary />}
                </>
              )}
            </section>
            <section className="card panel">
              <div className="panel-head">
                <h2>{d.numbers}</h2>
              </div>
              <QueueSwitch
                label={d.numbers}
                tabs={[
                  {
                    key: 'appointments',
                    label: d.viewAppointments,
                    count: '',
                    content: (
                      <>
                        <p className="caption chart-lead">{d.weekLead}</p>
                        <BarChart data={week} locale={locale} label={d.week} />
                      </>
                    ),
                  },
                  {
                    key: 'visits',
                    label: d.viewVisits,
                    count: '',
                    content: (
                      <>
                        <p className="caption chart-lead">
                          {lengths.average === null
                            ? d.visitsNone(n(visitMinutes[doctor.id]))
                            : d.visitsLead(n(lengths.average), n(lengths.visits), n(visitMinutes[doctor.id]))}
                        </p>
                        <BarChart data={visitBars} locale={locale} label={d.viewVisits} />
                      </>
                    ),
                  },
                  {
                    key: 'returns',
                    label: d.viewReturns,
                    count: '',
                    content: (
                      <>
                        <p className="caption chart-lead">{returns.rate === null ? d.returnsNone : d.returnsLead(n(returns.rate), n(returns.returned), n(returns.due))}</p>
                        <BarChart data={returnBars} locale={locale} label={d.viewReturns} />
                        <p className="caption chart-lead">{d.returnsHow}</p>
                      </>
                    ),
                  },
                ]}
              />
            </section>
          </div>

          <section className="card panel">
            <div className="panel-head">
              <h2>{t.doctorDash.schedule}</h2>
            </div>
            <QueueSwitch
              label={t.doctorDash.schedule}
              tabs={[
                {
                  key: 'waiting',
                  label: t.assistant.waitingTab,
                  count: localDigits(locale, waiting.length),
                  content: waiting.length ? (
                    <ul className="list">
                      {waiting.map((b) => (
                        <li key={b.id} className="queue-item">
                          <span className="ticket">{localDigits(locale, b.ticket ?? '')}</span>
                          <div>
                            <div style={{ fontWeight: 500 }}>{b.patientName}</div>
                            <div className="meta">
                              <span>{formatTime(locale, b.time)}</span>
                              {estimates.get(b.id) && (
                                <span className="estimate">
                                  {t.assistant.estimate} {formatTime(locale, estimates.get(b.id)!)}
                                </span>
                              )}
                              {b.service && <span>{b.service.name[locale]}</span>}
                            </div>
                          </div>
                          <div className="actions">
                            <StatusButton id={b.id} status="in_progress" label={t.assistant.call} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="caption empty">{t.doctorDash.noSchedule}</p>
                  ),
                },
                {
                  key: 'finished',
                  label: t.assistant.finishedTab,
                  count: localDigits(locale, seen.length),
                  content: seen.length ? (
                    <ul className="list">
                      {[...seen].reverse().map((b) => (
                        <li key={b.id} className="queue-item">
                          <span className="ticket">{localDigits(locale, b.ticket ?? '')}</span>
                          <div>
                            <div style={{ fontWeight: 500 }}>{b.patientName}</div>
                            <div className="meta">
                              <span>{formatTime(locale, b.time)}</span>
                              {b.service && <span>{b.service.name[locale]}</span>}
                              <StatusPill status={b.status} t={t} />
                            </div>
                          </div>
                          <div className="actions">
                            <StatusButton id={b.id} status="approved" label={t.assistant.addBack} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="caption empty">{t.assistant.noFinished}</p>
                  ),
                },
              ]}
            />
          </section>
        </div>

        <RenewalsPanel
          rows={renewals}
          doctors={[doctor]}
          recent={recent.filter((b) => b.date <= addDays(today, 30))}
          clinicName={clinic.name[locale]}
          origin={origin}
          back={back}
          flag={query.renew}
          sends={!deskSends}
          locale={locale}
          t={t}
        />

        <div className="card stack" style={{ '--stack': '12px', marginTop: 40 } as React.CSSProperties}>
          <p className="caption" style={{ margin: 0 }}>
            {t.settings.whatsappHint.replace('{phone}', clinic.phone)}
          </p>
          <WhatsappField doctor={doctor} value={whatsapps[doctor.id] ?? ''} label={t.settings.myWhatsapp} t={t} />
          <p className="caption" style={{ margin: '12px 0 0' }}>
            {t.settings.visitHint}
          </p>
          <VisitMinutesField doctor={doctor} value={visitMinutes[doctor.id]} label={t.settings.myVisit} t={t} />
        </div>
      </div>
    </section>
  )
}
