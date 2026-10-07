import type { Metadata } from 'next'
import { ClinicCard } from '@/components/ClinicCard'
import { Icon } from '@/components/Icon'
import { SearchField } from '@/components/SearchField'
import { cities, clinics, doctorsAt, specialties, type CityId, type SpecialtyId } from '@/lib/data'
import { locales } from '@/lib/i18n'
import { getI18n } from '@/lib/locale'
import { getClinicAccents } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.search.title }
}

type Search = { q?: string; city?: string; specialty?: string }

function matches(haystack: Record<string, string>, needle: string) {
  return locales.some((l) => haystack[l].toLowerCase().includes(needle))
}

export default async function ClinicsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { locale, t } = await getI18n()
  const accentsById = await getClinicAccents()
  const params = await searchParams
  const q = (params.q ?? '').trim().toLowerCase()
  const city = params.city && params.city in cities ? (params.city as CityId) : undefined
  const specialty = params.specialty && params.specialty in specialties ? (params.specialty as SpecialtyId) : undefined

  const results = clinics.filter((c) => {
    if (city && c.city !== city) return false
    if (specialty && !c.specialties.includes(specialty) && !doctorsAt(c.id).some((d) => d.specialty === specialty)) return false
    if (!q) return true
    return (
      matches(c.name, q) ||
      matches(cities[c.city], q) ||
      c.specialties.some((s) => matches(specialties[s], q)) ||
      doctorsAt(c.id).some((d) => matches(d.name, q) || matches(specialties[d.specialty], q))
    )
  })

  return (
    <section className="section-tight">
      <div className="container">
        <h1 style={{ marginTop: 32 }}>{t.search.title}</h1>
        <form className="search-bar" role="search" style={{ margin: '24px 0 16px' }}>
          <SearchField placeholder={t.home.searchPlaceholder} defaultValue={params.q ?? ''} submitLabel={t.home.search} />
          <label htmlFor="city" className="visually-hidden">
            {t.search.allCities}
          </label>
          <select id="city" name="city" defaultValue={city ?? ''} className="select" style={{ flex: '0 1 200px', borderRadius: 999 }}>
            <option value="">{t.search.allCities}</option>
            {(Object.keys(cities) as CityId[]).map((c) => (
              <option key={c} value={c}>
                {cities[c][locale]}
              </option>
            ))}
          </select>
          <label htmlFor="specialty" className="visually-hidden">
            {t.search.allSpecialties}
          </label>
          <select
            id="specialty"
            name="specialty"
            defaultValue={specialty ?? ''}
            className="select"
            style={{ flex: '0 1 220px', borderRadius: 999 }}
          >
            <option value="">{t.search.allSpecialties}</option>
            {(Object.keys(specialties) as SpecialtyId[]).map((s) => (
              <option key={s} value={s}>
                {specialties[s][locale]}
              </option>
            ))}
          </select>
          <button className="btn" type="submit">
            <Icon name="search" />
            {t.search.filter}
          </button>
        </form>
        <p className="caption" aria-live="polite">
          {t.search.results(results.length)}
        </p>
        {results.length ? (
          <div className="grid" style={{ marginTop: 24, marginBottom: 72 }}>
            {results.map((c) => (
              <ClinicCard key={c.id} clinic={c} accent={accentsById[c.id]} locale={locale} t={t} />
            ))}
          </div>
        ) : (
          <p style={{ margin: '48px 0 96px' }}>{t.search.empty}</p>
        )}
      </div>
    </section>
  )
}
