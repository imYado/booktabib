import type { Metadata } from 'next'
import Link from 'next/link'
import { createClinic } from '@/app/admin-actions'
import { AdminTabs, FormNotice } from '@/components/AdminParts'
import { ClinicPhoto } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { cities, type CityId } from '@/lib/data'
import { formatNumber } from '@/lib/format'
import { getI18n } from '@/lib/locale'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t.edit.clinicsTitle, robots: { index: false } }
}

export default async function AdminClinicsPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const { clinics, doctorsAt } = await getCatalog()
  const { locale, t } = await getI18n()
  await requireUser(['admin'], '/admin/clinics')

  return (
    <section className="section-tight">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <AdminTabs active="clinics" t={t} />
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}>{t.edit.clinicsTitle}</h1>
        <p className="lead">{t.edit.clinicsLead}</p>
        <FormNotice params={await searchParams} t={t} />
        <div className="dash-grid" style={{ marginTop: 40 }}>
          <form action={createClinic} className="card stack" style={{ '--stack': '20px', alignSelf: 'start' } as React.CSSProperties}>
            <h2 style={{ fontSize: '1.5rem' }}>{t.edit.addClinic}</h2>
            <div className="field">
              <label htmlFor="new-name">
                {t.edit.name} ({t.edit.langs.en})
              </label>
              <input id="new-name" name="name_en" className="input" required maxLength={120} dir="ltr" />
            </div>
            <div className="field">
              <label htmlFor="new-name-ar">
                {t.edit.name} ({t.edit.langs.ar})
              </label>
              <input id="new-name-ar" name="name_ar" className="input" maxLength={120} dir="rtl" lang="ar" />
            </div>
            <div className="field">
              <label htmlFor="new-name-ckb">
                {t.edit.name} ({t.edit.langs.ckb})
              </label>
              <input id="new-name-ckb" name="name_ckb" className="input" maxLength={120} dir="rtl" lang="ckb" />
            </div>
            <div className="field">
              <label htmlFor="new-city">{t.edit.city}</label>
              <select id="new-city" name="city" className="select" required>
                {(Object.keys(cities) as CityId[]).map((c) => (
                  <option key={c} value={c}>
                    {cities[c][locale]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-phone">{t.edit.phone}</label>
              <input id="new-phone" name="phone" type="tel" className="input" maxLength={30} dir="ltr" placeholder="07…" />
            </div>
            <button type="submit" className="btn btn-block">
              <Icon name="plus" size={16} />
              {t.edit.create}
            </button>
          </form>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{t.edit.clinicsTitle}</h2>
            <ul className="list">
              {clinics.map((c) => (
                <li key={c.id} className="row between">
                  <div className="row" style={{ gap: 16 }}>
                    <ClinicPhoto imageId={c.imageId} style={{ width: 72, aspectRatio: '4 / 3', margin: 0 }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{c.name[locale]}</div>
                      <div className="meta">
                        <span>{cities[c.city][locale]}</span>
                        <span>
                          {t.clinic.doctors}: {formatNumber(locale, doctorsAt(c.id).length)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/admin/clinics/${c.id}`} className="btn btn-secondary btn-sm">
                    <Icon name="edit" size={14} />
                    {t.edit.edit}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
