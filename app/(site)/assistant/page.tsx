import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { PickerForm } from '@/components/PickerForm'
import { StatusButton } from '@/components/StatusButton'
import { headers } from 'next/headers'
import { SendLink } from '@/components/SendLink'
import { SortableQueue } from '@/components/SortableQueue'
import { AddPatientForm, EditToggle, PatientEditor, PatientRow } from '@/components/DeskParts'
import { ClinicSettings } from '@/components/ClinicSettings'
import { getCatalog } from '@/lib/catalog'
import { whatsappNumber } from '@/lib/data'
import { formatDay, todayISO } from '@/lib/format'
import { canManageClinic, requireUser } from '@/lib/auth'
import { getClinicAccent, getDoctorWhatsapps } from '@/lib/settings'
import { getI18n } from '@/lib/locale'
import { listBookings, type Booking } from '@/lib/store'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.assistant.title, robots: { index: false } }
}

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  const { clinics, doctorsAt, getClinic, getDoctor } = await getCatalog()
  const { locale, t } = await getI18n()
  const user = await requireUser(['assistant', 'admin'], '/assistant')
  // Assistants work for one clinic; administrators can look at any.
  const clinic = (user.role === 'assistant' ? getClinic(user.clinicId ?? '') : getClinic((await searchParams).clinic ?? '')) ?? clinics[0]
  const today = todayISO()

  // An assistant tied to one doctor only sees that doctor's patients.
  const doctorId = user.role === 'assistant' ? (user.doctorId ?? undefined) : undefined
  const myDoctors = doctorsAt(clinic.id).filter((d) => !doctorId || d.id === doctorId)
  const [pending, queue, accent, whatsapps] = await Promise.all([
    listBookings({ clinicId: clinic.id, doctorId, status: 'pending', fromDate: today }),
    listBookings({ clinicId: clinic.id, doctorId, date: today, status: ['approved', 'in_progress', 'done', 'cancelled'] }),
    getClinicAccent(clinic.id),
    getDoctorWhatsapps(myDoctors.map((d) => d.id)),
  ])
  const serving = queue.filter((b) => b.status === 'in_progress')
  const waiting = queue.filter((b) => b.status === 'approved')
  const seen = queue.filter((b) => b.status === 'in_progress' || b.status === 'done')
  const removed = queue.filter((b) => b.status === 'cancelled')

  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  const linkButtons = (b: Booking) => {
    const url = `${origin}/q/${b.liveToken}`
    const phone = whatsappNumber(b.phone)
    const message = t.assistant.linkMessage.replace('{name}', b.patientName).replace('{url}', url)
    return (
      <SendLink
        url={url}
        whatsappHref={phone.length >= 8 ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null}
        sendLabel={t.assistant.sendLink}
        copyLabel={t.assistant.copyLink}
        copiedLabel={t.assistant.copied}
      />
    )
  }

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
          <p className="eyebrow">
            {clinic.name[locale]}
            {doctorId && ` · ${getDoctor(doctorId)?.name[locale]}`}
          </p>
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
          <div className="stack" style={{ '--stack': '32px' } as React.CSSProperties}>
            <div>
              <h2 style={{ fontSize: '1.5rem' }}>{t.assistant.today}</h2>
              <AddPatientForm doctors={myDoctors} locale={locale} t={t} />
            </div>

            <div>
              <h3 className="list-title">{t.assistant.waiting}</h3>
              {waiting.length ? (
                <>
                  <p className="caption" style={{ marginTop: 0 }}>
                    {t.assistant.dragHint}
                  </p>
                  <SortableQueue
                    handleLabel={t.assistant.moveHandle}
                    items={waiting.map((b) => ({
                      id: b.id,
                      content: (
                        <PatientRow b={b} doctorName={getDoctor(b.doctorId)?.name[locale]} t={t}>
                          <StatusButton id={b.id} status="in_progress" label={t.assistant.call} primary />
                          {linkButtons(b)}
                          <EditToggle id={b.id} label={t.assistant.edit} />
                          <StatusButton id={b.id} status="cancelled" label={t.assistant.remove} />
                        </PatientRow>
                      ),
                    }))}
                  />
                </>
              ) : (
                <p className="caption">{t.assistant.noToday}</p>
              )}
            </div>

            {seen.length > 0 && (
              <div>
                <h3 className="list-title">{t.assistant.withDoctor}</h3>
                <ul className="list">
                  {seen.map((b) => (
                    <li key={b.id} className="queue-item">
                      <PatientRow b={b} doctorName={getDoctor(b.doctorId)?.name[locale]} t={t}>
                        {b.status === 'in_progress' && <StatusButton id={b.id} status="done" label={t.assistant.done} primary />}
                        {b.status === 'in_progress' && linkButtons(b)}
                      </PatientRow>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {removed.length > 0 && (
              <div>
                <h3 className="list-title">{t.assistant.removed}</h3>
                <ul className="list">
                  {removed.map((b) => (
                    <li key={b.id} className="queue-item is-removed">
                      <PatientRow b={b} doctorName={getDoctor(b.doctorId)?.name[locale]} t={t}>
                        <StatusButton id={b.id} status="approved" label={t.assistant.addBack} />
                      </PatientRow>
                    </li>
                  ))}
                </ul>
              </div>
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
                      {linkButtons(b)}
                      <EditToggle id={b.id} label={t.assistant.edit} />
                    </div>
                    <PatientEditor b={b} t={t} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="caption">{t.assistant.noPending}</p>
            )}
          </div>
        </div>

        <ClinicSettings
          clinic={clinic}
          accent={accent}
          doctors={myDoctors}
          whatsapps={whatsapps}
          canEditAccent={canManageClinic(user, clinic.id)}
          locale={locale}
          t={t}
        />
      </div>
    </section>
  )
}
