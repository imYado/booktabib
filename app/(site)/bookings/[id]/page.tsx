import type { Metadata } from 'next'
import Link from 'next/link'
import { StatusPill } from '@/components/StatusPill'
import { getClinic, getDoctor } from '@/lib/data'
import { formatDay } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { getBooking } from '@/lib/store'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.booking.title, robots: { index: false } }
}

export default async function BookingPage({ params }: Props) {
  const { locale, t } = await getI18n()
  const booking = getBooking((await params).id)

  if (!booking) {
    return (
      <section className="section">
        <div className="container">
          <h1>{t.booking.notFound}</h1>
          <Link href="/" className="btn">
            {t.booking.backHome}
          </Link>
        </div>
      </section>
    )
  }

  const doctor = getDoctor(booking.doctorId)!
  const clinic = getClinic(booking.clinicId)!

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <h1>{t.booking.title}</h1>
        <p className="lead">{t.booking.lead}</p>
        <div className="card card-paper" style={{ marginTop: 40 }}>
          <dl className="details">
            <dt>{t.booking.status}</dt>
            <dd>
              <StatusPill status={booking.status} t={t} />
            </dd>
            <dt>{t.booking.reference}</dt>
            <dd dir="ltr" style={{ textAlign: 'start' }}>
              {booking.id}
            </dd>
            {booking.ticket !== null && (
              <>
                <dt>{t.booking.ticket}</dt>
                <dd>{booking.ticket}</dd>
              </>
            )}
            <dt>{t.booking.patient}</dt>
            <dd>{booking.patientName}</dd>
            <dt>{t.booking.doctor}</dt>
            <dd>
              <Link href={`/doctors/${doctor.id}`}>{doctor.name[locale]}</Link>
            </dd>
            <dt>{t.booking.clinic}</dt>
            <dd>{clinic.name[locale]}</dd>
            <dt>{t.booking.when}</dt>
            <dd>
              {formatDay(locale, booking.date, { weekday: 'long', month: 'long' })} · <span dir="ltr">{booking.time}</span>
            </dd>
          </dl>
        </div>
        <Link href="/" className="btn btn-secondary" style={{ marginTop: 32 }}>
          {t.booking.backHome}
        </Link>
      </div>
    </section>
  )
}
