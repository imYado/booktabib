import Link from 'next/link'
import { ClinicCard } from '@/components/ClinicCard'
import { Icon } from '@/components/Icon'
import { SearchField } from '@/components/SearchField'
import { getCatalog } from '@/lib/catalog'
import { specialties, type SpecialtyId } from '@/lib/data'
import { getI18n } from '@/lib/locale'
import { getClinicAccents } from '@/lib/settings'

export default async function HomePage() {
  const { clinics, doctors } = await getCatalog()
  const { locale, t } = await getI18n()
  const accentsById = await getClinicAccents()
  return (
    <>
      <section className="section">
        <div className="container">
          <p className="eyebrow">{t.tagline}</p>
          <h1 style={{ maxWidth: '16ch' }}>{t.home.title}</h1>
          <form action="/clinics" role="search" style={{ marginTop: 40, maxWidth: 720 }}>
            <SearchField placeholder={t.home.searchPlaceholder} submitLabel={t.home.search} />
          </form>
        </div>
      </section>

      <section className="section section-paper">
        <div className="container">
          <div className="row between" style={{ marginBottom: 32 }}>
            <h2 style={{ margin: 0 }}>{t.home.featured}</h2>
            <Link href="/clinics" className="btn btn-secondary btn-sm">
              {t.home.seeAll}
              <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="grid">
            {clinics.slice(0, 3).map((c) => (
              <ClinicCard key={c.id} clinic={c} doctorCount={doctors.filter((d) => d.clinicId === c.id).length} accent={accentsById[c.id]} locale={locale} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>{t.home.bySpecialty}</h2>
          <div className="choices" style={{ marginTop: 24 }}>
            {(Object.keys(specialties) as SpecialtyId[]).map((s) => (
              <Link key={s} href={`/clinics?specialty=${s}`} className="choice">
                {specialties[s][locale]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <hr className="rule" />
      </div>

      <section className="section">
        <div className="container">
          <h2 style={{ marginBottom: 40 }}>{t.home.howTitle}</h2>
          <ol className="steps">
            {t.home.steps.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p className="caption" style={{ fontSize: '1rem' }}>
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-paper">
        <div className="container split split-even" style={{ alignItems: 'center' }}>
          <div>
            <h2>{t.home.clinicsTitle}</h2>
            <p className="lead">{t.home.clinicsBody}</p>
          </div>
          <div>
            <Link href="/assistant" className="btn">
              {t.home.clinicsCta}
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
