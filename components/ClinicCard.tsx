import Link from 'next/link'
import { accentStyle, type AccentId } from '@/lib/accents'
import { cities, specialties, type Clinic } from '@/lib/data'
import { formatNumber } from '@/lib/format'
import type { Dictionary, Locale } from '@/lib/i18n'
import { ClinicPhoto } from './Avatar'
import { HeartButton } from './HeartButton'
import { Icon } from './Icon'

export function ClinicCard({
  clinic,
  doctorCount,
  accent,
  favorite,
  locale,
  t,
}: {
  clinic: Clinic
  doctorCount: number
  accent?: AccentId
  /** Whether the visitor has hearted this clinic, and whether they are signed in at all. */
  favorite: { liked: boolean; signedIn: boolean }
  locale: Locale
  t: Dictionary
}) {
  return (
    <div className="card-wrap">
      <Link href={`/clinics/${clinic.id}`} className="card" style={accentStyle(accent)}>
        <ClinicPhoto imageId={clinic.imageId} />
        <h3>{clinic.name[locale]}</h3>
        <p className="caption" style={{ marginBottom: 12 }}>
          {clinic.specialties.map((s) => specialties[s][locale]).join(' · ')}
        </p>
        <div className="meta">
          <span>
            <Icon name="pin" size={14} />
            {cities[clinic.city][locale]}
          </span>
          <span>
            <Icon name="star" size={14} />
            {formatNumber(locale, clinic.rating)} ({t.clinic.reviews(clinic.reviews)})
          </span>
          <span>
            {t.clinic.doctors}: {formatNumber(locale, doctorCount)}
          </span>
        </div>
      </Link>
      <HeartButton clinicId={clinic.id} {...favorite} labels={{ like: t.profile.like, unlike: t.profile.unlike, loginToLike: t.profile.loginToLike }} onPhoto />
    </div>
  )
}
