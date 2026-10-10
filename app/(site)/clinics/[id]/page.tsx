import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Avatar, ClinicPhoto } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { getCatalog } from '@/lib/catalog'
import { cities, specialties } from '@/lib/data'
import { formatNumber } from '@/lib/format'
import { accentStyle } from '@/lib/accents'
import { getI18n } from '@/lib/locale'
import { getClinicAccent } from '@/lib/settings'
import { getCurrentUser } from '@/lib/auth'
import { getFavoriteIds } from '@/lib/favorites'
import { HeartButton } from '@/components/HeartButton'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { getClinic } = await getCatalog()
  const { locale } = await getI18n()
  const clinic = getClinic((await params).id)
  return { title: clinic?.name[locale] }
}

export default async function ClinicPage({ params }: Props) {
  const { doctorsAt, getClinic } = await getCatalog()
  const { locale, t } = await getI18n()
  const clinic = getClinic((await params).id)
  if (!clinic) notFound()
  const team = doctorsAt(clinic.id)
  const accent = await getClinicAccent(clinic.id)
  const [user, favoriteIds] = await Promise.all([getCurrentUser(), getFavoriteIds()])

  return (
    <div style={accentStyle(accent)}>
      <section className="section-tight">
        <div className="container split" style={{ paddingTop: 32 }}>
          <div>
            <p className="eyebrow">{clinic.specialties.map((s) => specialties[s][locale]).join(' · ')}</p>
            <div className="row" style={{ alignItems: 'start', flexWrap: 'nowrap', gap: 8 }}>
              <h1 style={{ flex: 1 }}>{clinic.name[locale]}</h1>
              <HeartButton
                clinicId={clinic.id}
                liked={favoriteIds.includes(clinic.id)}
                signedIn={!!user}
                labels={{ like: t.profile.like, unlike: t.profile.unlike, loginToLike: t.profile.loginToLike }}
              />
            </div>
            {user?.role === 'admin' && (
              <Link href={`/admin/clinics/${clinic.id}`} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
                <Icon name="edit" size={16} />
                {t.edit.editPage}
              </Link>
            )}
            <p className="lead">{clinic.about[locale]}</p>
            <div className="meta" style={{ fontSize: '1rem' }}>
              <span>
                <Icon name="pin" size={16} />
                {cities[clinic.city][locale]}
              </span>
              <span>
                <Icon name="star" size={16} />
                {formatNumber(locale, clinic.rating)} ({t.clinic.reviews(clinic.reviews)})
              </span>
            </div>
          </div>
          <ClinicPhoto imageId={clinic.imageId} style={{ aspectRatio: '4 / 3', margin: 0 }} />
        </div>
      </section>

      <section className="section-tight">
        <div className="container split">
          <div>
            <h2>{t.clinic.doctors}</h2>
            <ul className="list">
              {team.map((d) => (
                <li key={d.id} className="row between">
                  <div className="row" style={{ gap: 16 }}>
                    <Avatar imageId={d.imageId} />
                    <div>
                      <h3 style={{ margin: 0 }}>{d.name[locale]}</h3>
                      <div className="meta">
                        <span>{d.title[locale]}</span>
                        <span>{t.doctorProfile.experience(d.years)}</span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/doctors/${d.id}`} className="btn btn-sm">
                    {t.clinic.book}
                    <Icon name="arrow" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <aside className="card card-paper" style={{ alignSelf: 'start' }}>
            <dl className="details">
              <dt>{t.clinic.address}</dt>
              <dd>{clinic.address[locale]}</dd>
              <dt>{t.clinic.hours}</dt>
              <dd>{t.clinic.hoursValue}</dd>
              <dt>{t.clinic.phone}</dt>
              <dd>
                <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} dir="ltr">
                  {clinic.phone}
                </a>
              </dd>
            </dl>
          </aside>
        </div>
      </section>
      <div style={{ height: 72 }} />
    </div>
  )
}
