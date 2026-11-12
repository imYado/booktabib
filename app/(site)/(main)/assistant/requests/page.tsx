import type { Metadata } from 'next'
import { bookingTime } from '@/lib/booking-time'
import { Icon } from '@/components/Icon'
import { StatusButton } from '@/components/StatusButton'
import { EditToggle, PatientEditor } from '@/components/DeskParts'
import { formatDay, localDigits } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { listBookings } from '@/lib/store'
import { DeskShell, LinkButtons, loadDesk, type DeskQuery } from '../desk'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.assistant.tabRequests} · ${t.assistant.title}`, robots: { index: false } }
}

/** Appointment requests patients sent, waiting for the desk to approve or cancel them. */
export default async function AssistantRequestsPage({ searchParams }: { searchParams: DeskQuery }) {
  const desk = await loadDesk(searchParams, 'requests')
  const { clinic, doctorId, getDoctor, locale, t, today } = desk
  const pending = await listBookings({ clinicId: clinic.id, doctorId, status: 'pending', fromDate: today })

  return (
    <DeskShell desk={desk}>
      <section className="card panel">
        <div className="panel-head">
          <h2>{t.assistant.pending}</h2>
          <span className="switch-count">{localDigits(locale, pending.length)}</span>
        </div>
        {pending.length ? (
          <ul className="list">
            {pending.map((b) => (
              <li key={b.id} className="request-item">
                <div>
                  <div style={{ fontWeight: 500 }}>{b.patientName}</div>
                  <div className="meta">
                    <span>
                      <Icon name="calendar" size={14} />
                      {formatDay(locale, b.date)} · <span>{bookingTime(locale, t, b)}</span>
                    </span>
                    <span>{getDoctor(b.doctorId)?.name[locale]}</span>
                    {b.service && <span>{b.service.name[locale]}</span>}
                    <span dir="ltr">{b.phone}</span>
                  </div>
                  {b.note && <p className="caption" style={{ margin: '6px 0 0' }}>{b.note}</p>}
                </div>
                <div className="actions row">
                  <StatusButton id={b.id} status="approved" label={t.assistant.approve} tone="go" icon="check" />
                  <StatusButton id={b.id} status="cancelled" label={t.assistant.cancel} tone="danger" icon="x" />
                  <LinkButtons desk={desk} b={b} />
                  <EditToggle id={b.id} label={t.assistant.edit} />
                </div>
                <PatientEditor b={b} t={t} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="caption empty">{t.assistant.noPending}</p>
        )}
      </section>
    </DeskShell>
  )
}
