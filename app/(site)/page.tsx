import Link from 'next/link'
import { ClinicCard } from '@/components/ClinicCard'
import { Icon } from '@/components/Icon'
import { clinics, specialties, type SpecialtyId } from '@/lib/data'
import { getI18n } from '@/lib/locale'

export default async function HomePage() {
  const { locale, t } = await getI18n()
  return (
    <>
      <section className="section">
        <div className="container">
          <p className="eyebrow">{t.tagline}</p>
          <h1 style={{ maxWidth: '16ch' }}>{t.home.title}</h1>
          <p className="lead">{t.home.lead}</p>
          <form action="/clinics" className="search-bar" role="search" style={{ marginTop: 40, maxWidth: 720 }}>
            <label htmlFor="q" className="visually-hidden">
              {t.home.searchPlaceholder}
            </label>
            <input id="q" name="q" className="input" placeholder={t.home.searchPlaceholder} />
            <button className="btn" type="submit">
              <Icon name="search" />
              {t.home.search}
            </button>
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
              <ClinicCard key={c.id} clinic={c} locale={locale} t={t} />
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
