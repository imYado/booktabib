import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { PickerForm } from '@/components/PickerForm'
import { StatusButton } from '@/components/StatusButton'
import { StatusPill } from '@/components/StatusPill'
import { clinics, getClinic, getDoctor } from '@/lib/data'
import { formatDay, todayISO } from '@/lib/format'
import { requireUser } from '@/lib/auth'
import { getI18n } from '@/lib/locale'
import { listBookings } from '@/lib/store'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.assistant.title, robots: { index: false } }
}

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  const { locale, t } = await getI18n()
  const user = await requireUser(['assistant', 'admin'], '/assistant')
  // Assistants work for one clinic; administrators can look at any.
  const clinic = (user.role === 'assistant' ? getClinic(user.clinicId ?? '') : getClinic((await searchParams).clinic ?? '')) ?? clinics[0]
  const today = todayISO()

  const [pending, queue] = await Promise.all([
    listBookings({ clinicId: clinic.id, status: 'pending', fromDate: today }),
    listBookings({ clinicId: clinic.id, date: today, status: ['approved', 'in_progress', 'done'] }),
  ])
  const serving = queue.filter((b) => b.status === 'in_progress')

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <div className="row between" style={{ alignItems: 'end', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t.assistant.title}</h1>
            <p className="lead" style={{ margin: 0 }}>
              {t.assistant.lead}
            </p>
          </div>
          <Link href={`/screen?clinic=${clinic.id}`} className="btn btn-secondary" target="_blank">
            {t.assistant.openScreen}
            <Icon name="arrow" size={16} />
          </Link>
        </div>

        {user.role === 'admin' ? (
          <PickerForm
            name="clinic"
            label={t.assistant.clinic}
            value={clinic.id}
            options={clinics.map((c) => ({ value: c.id, label: c.name[locale] }))}
            submit={t.common.show}
          />
        ) : (
          <p className="eyebrow">{clinic.name[locale]}</p>
        )}

        {serving.length > 0 && (
          <div className="card card-paper" style={{ marginTop: 32 }}>
            <p className="eyebrow">{t.assistant.nowServing}</p>
            <div className="row" style={{ gap: '8px 32px' }}>
              {serving.map((b) => (
                <span key={b.id} style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  <strong className="ticket">{b.ticket}</strong> {b.patientName}
                  <span className="caption"> · {getDoctor(b.doctorId)?.name[locale]}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="dash-grid" style={{ marginTop: 56 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{t.assistant.today}</h2>
            {queue.length ? (
              <ul className="list">
                {queue.map((b) => (
                  <li key={b.id} className="queue-item">
                    <span className="ticket">{b.ticket}</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{b.patientName}</div>
                      <div className="meta">
                        <span dir="ltr">{b.time}</span>
                        <span>{getDoctor(b.doctorId)?.name[locale]}</span>
                        <StatusPill status={b.status} t={t} />
                      </div>
                    </div>
                    <div className="actions row">
                      {b.status === 'approved' && <StatusButton id={b.id} status="in_progress" label={t.assistant.call} primary />}
                      {b.status === 'in_progress' && <StatusButton id={b.id} status="done" label={t.assistant.done} primary />}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="caption">{t.assistant.noToday}</p>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{t.assistant.pending}</h2>
            {pending.length ? (
              <ul className="list">
                {pending.map((b) => (
                  <li key={b.id} className="stack" style={{ '--stack': '12px' } as React.CSSProperties}>
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
                      {b.note && <p className="caption" style={{ margin: '6px 0 0' }}>{b.note}</p>}
                    </div>
                    <div className="row">
                      <StatusButton id={b.id} status="approved" label={t.assistant.approve} primary />
                      <StatusButton id={b.id} status="cancelled" label={t.assistant.cancel} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="caption">{t.assistant.noPending}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
