import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { CLINIC_TIME_ZONE, formatDay, formatTime } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { listNotifications, markAllRead, type Notification } from '@/lib/notifications'
import { prescriptionsById } from '@/lib/prescriptions'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.notifications.title, robots: { index: false } }
}

export default async function NotificationsPage() {
  const { getClinic } = await getCatalog()
  const { locale, t } = await getI18n()
  const user = await requireUser(['patient', 'assistant', 'doctor', 'admin'], '/notifications')
  const items = await listNotifications(user.id)
  const scripts = await prescriptionsById(items.flatMap((i) => (i.prescriptionId ? [i.prescriptionId] : [])))
  // Opening the page reads them; the ones that were new keep their dot for this visit.
  await markAllRead(user.id)
  const n = t.notifications

  const text = (item: Notification) => {
    const clinic = getClinic(item.clinicId)?.name[locale] ?? ''
    const renewOn = item.prescriptionId ? scripts.get(item.prescriptionId)?.renewOn : undefined
    const renewDate = renewOn ? formatDay(locale, renewOn, { weekday: 'long', month: 'long' }) : ''
    if (item.kind === 'renew7') return n.renew7(clinic, renewDate)
    if (item.kind === 'renew3') return n.renew3(clinic, renewDate)
    if (item.kind === 'renewDay') return n.renewDay(clinic)
    if (item.kind === 'arrive') return n.arrive(clinic, item.time ? formatTime(locale, item.time) : '')
    if (item.kind === 'moved') return n.moved(clinic, item.time ? formatTime(locale, item.time) : '')
    if (item.kind === 'approved') return n.approved(clinic, item.ticket)
    if (item.kind === 'turn') return n.turn(clinic)
    if (item.kind === 'cancelled') return n.cancelled(clinic)
    return n.done(clinic)
  }
  // Finished visits lead to the clinic page, where the patient can rate it; the rest to the booking.
  const href = (item: Notification) => {
    if (item.prescriptionId) {
      const doctorId = scripts.get(item.prescriptionId)?.doctorId
      return doctorId ? `/doctors/${doctorId}` : `/clinics/${item.clinicId}`
    }
    return item.kind === 'done' ? `/clinics/${item.clinicId}` : item.bookingId ? `/bookings/${item.bookingId}` : '/account'
  }
  const when = (d: Date) => {
    const iso = new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${formatDay(locale, iso)} · ${formatTime(locale, hhmm)}`
  }

  return (
    <section className="section-tight">
      <div className="container" style={{ maxWidth: 760, paddingTop: 32, paddingBottom: 72 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', margin: 0 }}>{n.title}</h1>
        <p className="lead">{n.lead}</p>
        {items.length ? (
          <ul className="list notification-list">
            {items.map((item) => (
              <li key={item.id} className={item.readAt ? undefined : 'unread'}>
                <Link href={href(item)} className="row between" style={{ textDecoration: 'none', flexWrap: 'nowrap' }}>
                  <div>
                    <div>{text(item)}</div>
                    <div className="caption">{when(item.createdAt)}</div>
                  </div>
                  <Icon name="arrow" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="caption">{n.empty}</p>
        )}
      </div>
    </section>
  )
}
