import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Avatar, ClinicPhoto } from '@/components/Avatar'
import { ClinicGallery } from '@/components/ClinicGallery'
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
import { StarRating } from '@/components/StarRating'
import { canRateClinic, getMyRating } from '@/lib/ratings'

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
  // A clinic with one doctor shows that doctor up front instead of a list.
  const solo = team.length === 1 ? team[0] : null
  const { lat, lng } = clinic.location
  // New clinics start at 0, 0 until a map pin is entered.
  const hasMap = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
  const accent = await getClinicAccent(clinic.id)
  const [user, favoriteIds] = await Promise.all([getCurrentUser(), getFavoriteIds()])
  // Only signed-in users who have booked here may rate the clinic.
  const [canRate, myRating] = user ? await Promise.all([canRateClinic(user.id, clinic.id), getMyRating(user.id, clinic.id)]) : [false, 0]

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
                {clinic.reviews ? `${formatNumber(locale, clinic.rating)} (${t.clinic.reviews(clinic.reviews)})` : t.clinic.noRatings}
              </span>
            </div>
            {canRate ? (
              <StarRating
                clinicId={clinic.id}
                initial={myRating}
                labels={{ title: t.clinic.rate, yours: t.clinic.yourRating, saved: t.clinic.rated, stars: [1, 2, 3, 4, 5].map(t.clinic.stars) }}
              />
            ) : (
              user && (
                <p className="caption" style={{ marginTop: 20 }}>
                  {t.clinic.rateHint}
                </p>
              )
            )}
          </div>
          <ClinicPhoto imageId={clinic.imageId} style={{ aspectRatio: '4 / 3', margin: 0 }} />
        </div>
      </section>

      <section className="section-tight">
        <div className="container split">
          <div className="stack" style={{ '--stack': '56px' } as React.CSSProperties}>
            {solo ? (
              <article className="solo-doctor">
                <Link href={`/doctors/${solo.id}`} className="solo-doctor-photo" tabIndex={-1} aria-hidden="true">
                  <Avatar size={152} imageId={solo.imageId} />
                </Link>
                <div className="solo-doctor-body">
                  <p className="eyebrow" style={{ margin: 0 }}>
                    {specialties[solo.specialty][locale]}
                  </p>
                  <h2 className="solo-doctor-name">
                    <Link href={`/doctors/${solo.id}`}>{solo.name[locale]}</Link>
                  </h2>
                  <div className="meta">
                    {solo.title[locale] && <span>{solo.title[locale]}</span>}
                    {solo.years > 0 && <span>{t.doctorProfile.experience(solo.years)}</span>}
                  </div>
                  {solo.bio[locale] && <p className="solo-doctor-bio">{solo.bio[locale]}</p>}
                  <div className="row" style={{ gap: 16, marginTop: 20 }}>
                    <Link href={`/doctors/${solo.id}`} className="btn">
                      {t.clinic.book}
                      <Icon name="arrow" size={16} />
                    </Link>
                    {solo.fee > 0 && <span className="caption">{t.clinic.feeFrom(`${formatNumber(locale, solo.fee)} ${t.common.iqd}`)}</span>}
                  </div>
                </div>
              </article>
            ) : (
              team.length > 0 && (
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
              )
            )}
            {clinic.info.length > 0 && (
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>{t.clinic.moreInfo}</h2>
                <dl className="info-list">
                  {clinic.info.map((item, i) => (
                    <div key={i}>
                      <dt dir="auto">{item.title[locale]}</dt>
                      <dd dir="auto">{item.body[locale]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
          <aside className="card card-paper" style={{ alignSelf: 'start' }}>
            <dl className="details">
              <dt>{t.clinic.address}</dt>
              <dd>
                {clinic.address[locale] || cities[clinic.city][locale]}
                {hasMap && (
                  <>
                    <br />
                    <a href="#location" className="caption">
                      {t.clinic.location}
                    </a>
                  </>
                )}
              </dd>
              <dt>{t.clinic.hours}</dt>
              <dd style={{ whiteSpace: 'pre-line' }} dir={clinic.hours ? 'auto' : undefined}>
                {clinic.hours?.[locale] ?? t.clinic.hoursValue}
              </dd>
              {clinic.phone && (
                <>
                  <dt>{t.clinic.phone}</dt>
                  <dd>
                    <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} dir="ltr">
                      {clinic.phone}
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </aside>
        </div>
      </section>

      {clinic.gallery.length > 0 && (
        <section className="section-tight">
          <div className="container">
            <h2>{t.clinic.gallery}</h2>
            <ClinicGallery
              images={clinic.gallery}
              name={clinic.name[locale]}
              labels={{ photos: clinic.gallery.map((_, i) => t.clinic.photoOf(i + 1, clinic.gallery.length)), close: t.clinic.close, prev: t.clinic.prev, next: t.clinic.next }}
            />
          </div>
        </section>
      )}

      {hasMap && (
        <section className="section-tight" id="location">
          <div className="container location">
            <div className="location-text">
              <h2>{t.clinic.location}</h2>
              <p className="lead" style={{ marginBottom: 8 }}>
                {clinic.address[locale] || cities[clinic.city][locale]}
              </p>
              <p className="caption" style={{ marginTop: 0 }}>
                {cities[clinic.city][locale]}
              </p>
              <div className="row" style={{ gap: 8, marginTop: 24 }}>
                <a className="btn" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
                  <Icon name="pin" size={16} />
                  {t.clinic.directions}
                </a>
                <a className="btn btn-secondary" href={`https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(clinic.name[locale])}`} target="_blank" rel="noopener noreferrer">
                  {t.clinic.appleMaps}
                </a>
              </div>
            </div>
            <div className="map-frame">
              <iframe
                title={t.clinic.mapTitle(clinic.name[locale])}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.006},${lat - 0.004},${lng + 0.006},${lat + 0.004}&layer=mapnik&marker=${lat},${lng}`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <a className="map-frame-label" href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
                {t.clinic.openMap}
                <Icon name="arrow" size={14} />
              </a>
            </div>
          </div>
        </section>
      )}
      <div style={{ height: 72 }} />
    </div>
  )
}
