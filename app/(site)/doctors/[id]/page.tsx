import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requestBooking } from '@/app/actions'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { cities, getClinic, getDoctor, isWorkingDay, specialties } from '@/lib/data'
import { addDays, formatDay, formatNumber, todayISO } from '@/lib/format'
import { getI18n } from '@/lib/locale'
import { openSlots } from '@/lib/store'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ day?: string; error?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n()
  return { title: getDoctor((await params).id)?.name[locale] }
}

function upcomingDays(count: number) {
  const days: string[] = []
  for (let i = 0; days.length < count && i < count * 2; i++) {
    const d = addDays(todayISO(), i)
    if (isWorkingDay(d)) days.push(d)
  }
  return days
}

export default async function DoctorPage({ params, searchParams }: Props) {
  const { locale, t } = await getI18n()
  const doctor = getDoctor((await params).id)
  if (!doctor) notFound()
  const clinic = getClinic(doctor.clinicId)!
  const { day, error } = await searchParams

  const days = upcomingDays(7)
  const selected = day && days.includes(day) ? day : (days.find((d) => openSlots(doctor.id, d).length) ?? days[0])
  const slots = openSlots(doctor.id, selected)

  return (
    <section className="section-tight">
      <div className="container split" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <div>
          <div className="row" style={{ gap: 20, marginBottom: 24 }}>
            <Avatar size={72} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {specialties[doctor.specialty][locale]}
              </p>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: 0 }}>{doctor.name[locale]}</h1>
            </div>
          </div>
          <p className="lead">{doctor.title[locale]}</p>
          <hr className="rule" style={{ margin: '32px 0' }} />
          <h2 style={{ fontSize: '1.4rem' }}>{t.doctorProfile.about}</h2>
          <p>{doctor.bio[locale]}</p>
          <dl className="details" style={{ marginTop: 24 }}>
            <dt>{t.booking.clinic}</dt>
            <dd>
              <Link href={`/clinics/${clinic.id}`}>{clinic.name[locale]}</Link>
              <span className="caption"> · {cities[clinic.city][locale]}</span>
            </dd>
            <dt>{t.doctorProfile.fee}</dt>
            <dd>
              {formatNumber(locale, doctor.fee)} {t.common.iqd}
            </dd>
            <dt>{t.common.years}</dt>
            <dd>{t.doctorProfile.experience(doctor.years)}</dd>
          </dl>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.5rem' }}>{t.doctorProfile.bookTitle}</h2>

          <p className="field" style={{ margin: '20px 0 8px', fontWeight: 500 }}>
            {t.doctorProfile.day}
          </p>
          <nav className="choices" aria-label={t.doctorProfile.day}>
            {days.map((d) => (
              <Link key={d} href={`?day=${d}`} scroll={false} className="choice" aria-current={d === selected ? 'true' : undefined}>
                {formatDay(locale, d, { month: 'numeric' })}
              </Link>
            ))}
          </nav>

          <form action={requestBooking} className="stack" style={{ '--stack': '20px', marginTop: 20 } as React.CSSProperties}>
            <input type="hidden" name="doctorId" value={doctor.id} />
            <input type="hidden" name="date" value={selected} />
            <fieldset className="field">
              <legend style={{ marginBottom: 8 }}>{t.doctorProfile.time}</legend>
              {slots.length ? (
                <div className="choices">
                  {slots.map((s, i) => (
                    <label key={s} className="choice" dir="ltr">
                      <input type="radio" name="time" value={s} required defaultChecked={i === 0} />
                      {s}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="caption">{t.doctorProfile.noSlots}</p>
              )}
            </fieldset>
            <div className="field">
              <label htmlFor="patientName">{t.doctorProfile.name}</label>
              <input id="patientName" name="patientName" className="input" required maxLength={80} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="phone">{t.doctorProfile.phone}</label>
              <input
                id="phone"
                name="phone"
                className="input"
                type="tel"
                required
                maxLength={30}
                autoComplete="tel"
                dir="ltr"
                placeholder="+964"
              />
            </div>
            <div className="field">
              <label htmlFor="note">{t.doctorProfile.note}</label>
              <textarea id="note" name="note" className="textarea" maxLength={300} />
            </div>
            {error && (
              <p className="notice" role="alert">
                {t.doctorProfile.taken}
              </p>
            )}
            <button className="btn btn-block" type="submit" disabled={!slots.length}>
              <Icon name="calendar" />
              {t.doctorProfile.submit}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
