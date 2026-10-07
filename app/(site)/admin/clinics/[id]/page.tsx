import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { createDoctor, deleteClinic, deleteDoctor, updateClinic, updateDoctor } from '@/app/admin-actions'
import { AccountEditor } from '@/components/AccountEditor'
import { AdminTabs, FormNotice, LocalizedField, PhotoField } from '@/components/AdminParts'
import { Avatar } from '@/components/Avatar'
import { AccentPicker, WhatsappField } from '@/components/ClinicSettings'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Icon } from '@/components/Icon'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { accentStyle } from '@/lib/accents'
import { requireUser } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog'
import { cities, specialties, type CityId, type SpecialtyId } from '@/lib/data'
import { getI18n } from '@/lib/locale'
import { getClinicAccent, getDoctorWhatsapps } from '@/lib/settings'
import { staffOptions } from '../../staff-options'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; added?: string; error?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { getClinic } = await getCatalog()
  const { locale, t } = await getI18n()
  return { title: `${t.edit.edit} · ${getClinic((await params).id)?.name[locale] ?? ''}`, robots: { index: false } }
}

const specialtyIds = Object.keys(specialties) as SpecialtyId[]

export default async function EditClinicPage({ params, searchParams }: Props) {
  const catalog = await getCatalog()
  const { getClinic, doctorsAt } = catalog
  const { locale, t } = await getI18n()
  const { id } = await params
  const me = await requireUser(['admin'], `/admin/clinics/${id}`)
  const clinic = getClinic(id)
  if (!clinic) notFound()
  const query = await searchParams
  const team = doctorsAt(clinic.id)
  const db = await getDb()
  const [accent, whatsapps, staff] = await Promise.all([
    getClinicAccent(clinic.id),
    getDoctorWhatsapps(team.map((d) => d.id)),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, clinicId: users.clinicId, doctorId: users.doctorId })
      .from(users)
      .where(eq(users.clinicId, clinic.id))
      .orderBy(asc(users.role), asc(users.name)),
  ])
  const options = staffOptions(catalog, locale)
  const labels = { name: t.auth.name, email: t.auth.email }
  const openDoctor = query.added ?? query.saved
  const stack = (gap: number) => ({ '--stack': `${gap}px` }) as React.CSSProperties

  return (
    <section className="section-tight" style={accentStyle(accent)}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 72 }}>
        <AdminTabs active="clinics" t={t} />
        <p style={{ margin: '0 0 8px' }}>
          <Link href="/admin/clinics" className="caption">
            {t.edit.back}
          </Link>
        </p>
        <div className="row between" style={{ alignItems: 'end', marginBottom: 24 }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', margin: 0 }}>{clinic.name[locale]}</h1>
          <div className="row" style={{ gap: 8 }}>
            <Link href={`/admin/clinics/${clinic.id}/patients`} className="btn btn-secondary btn-sm">
              {t.edit.allPatients}
            </Link>
            <Link href={`/clinics/${clinic.id}`} className="btn btn-secondary btn-sm">
              {t.edit.viewPage}
              <Icon name="arrow" size={14} />
            </Link>
          </div>
        </div>
        <FormNotice params={query} t={t} />

        <div className="stack" style={{ ...stack(56), marginTop: 32 }}>
          <form action={updateClinic} className="card stack" style={stack(24)}>
            <input type="hidden" name="id" value={clinic.id} />
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{t.edit.details}</h2>
            <LocalizedField name="name" label={t.edit.name} value={clinic.name} t={t} required max={120} prefix="clinic" />
            <LocalizedField name="address" label={t.edit.address} value={clinic.address} t={t} max={300} prefix="clinic" />
            <LocalizedField name="about" label={t.edit.about} value={clinic.about} t={t} multiline max={1500} prefix="clinic" />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="clinic-city">{t.edit.city}</label>
                <select id="clinic-city" name="city" className="select" defaultValue={clinic.city}>
                  {(Object.keys(cities) as CityId[]).map((c) => (
                    <option key={c} value={c}>
                      {cities[c][locale]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="clinic-phone">{t.edit.phone}</label>
                <input id="clinic-phone" name="phone" type="tel" className="input" defaultValue={clinic.phone} maxLength={30} dir="ltr" />
              </div>
              <div className="field">
                <label htmlFor="clinic-lat">{t.edit.lat}</label>
                <input id="clinic-lat" name="lat" type="number" step="any" min={-90} max={90} className="input" defaultValue={clinic.location.lat} dir="ltr" />
              </div>
              <div className="field">
                <label htmlFor="clinic-lng">{t.edit.lng}</label>
                <input id="clinic-lng" name="lng" type="number" step="any" min={-180} max={180} className="input" defaultValue={clinic.location.lng} dir="ltr" />
              </div>
              <div className="field">
                <label htmlFor="clinic-rating">{t.edit.rating}</label>
                <input id="clinic-rating" name="rating" type="number" step="0.1" min={0} max={5} className="input" defaultValue={clinic.rating} dir="ltr" />
              </div>
              <div className="field">
                <label htmlFor="clinic-reviews">{t.edit.reviews}</label>
                <input id="clinic-reviews" name="reviews" type="number" min={0} className="input" defaultValue={clinic.reviews} dir="ltr" />
              </div>
            </div>
            <p className="caption" style={{ margin: 0 }}>
              {t.edit.mapHint}
            </p>
            <fieldset className="field-group">
              <legend className="field-legend">{t.edit.specialties}</legend>
              <div className="choices">
                {specialtyIds.map((s) => (
                  <label key={s} className="choice">
                    <input type="checkbox" name="specialties" value={s} defaultChecked={clinic.specialties.includes(s)} />
                    {specialties[s][locale]}
                  </label>
                ))}
              </div>
            </fieldset>
            <PhotoField imageId={clinic.imageId} prefix="clinic" t={t} />
            <div>
              <button type="submit" className="btn">
                {t.edit.save}
              </button>
            </div>
          </form>

          <div className="card">
            <AccentPicker clinic={clinic} accent={accent} t={t} />
          </div>

          <div id="doctors">
            <h2 style={{ fontSize: '1.5rem' }}>{t.edit.doctorsTitle}</h2>
            <ul className="list">
              {team.map((d) => (
                <li key={d.id} id={`doctor-${d.id}`}>
                  <details className="editor" open={openDoctor === d.id}>
                    <summary className="row between">
                      <div className="row" style={{ gap: 16 }}>
                        <Avatar imageId={d.imageId} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{d.name[locale]}</div>
                          <div className="meta">
                            <span>{specialties[d.specialty][locale]}</span>
                            {d.room && (
                              <span>
                                {t.screen.room} {d.room}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="btn btn-secondary btn-sm">
                        <Icon name="edit" size={14} />
                        {t.edit.edit}
                      </span>
                    </summary>
                    <div className="stack edit-panel" style={stack(24)}>
                      <form action={updateDoctor} className="stack" style={stack(24)}>
                        <input type="hidden" name="id" value={d.id} />
                        <LocalizedField name="name" label={t.edit.name} value={d.name} t={t} required max={120} prefix={d.id} />
                        <LocalizedField name="title" label={t.edit.title} value={d.title} t={t} prefix={d.id} />
                        <LocalizedField name="bio" label={t.edit.bio} value={d.bio} t={t} multiline max={1500} prefix={d.id} />
                        <div className="form-grid">
                          <div className="field">
                            <label htmlFor={`${d.id}-specialty`}>{t.edit.specialty}</label>
                            <select id={`${d.id}-specialty`} name="specialty" className="select" defaultValue={d.specialty}>
                              {specialtyIds.map((s) => (
                                <option key={s} value={s}>
                                  {specialties[s][locale]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`${d.id}-years`}>{t.edit.years}</label>
                            <input id={`${d.id}-years`} name="years" type="number" min={0} max={80} className="input" defaultValue={d.years} dir="ltr" />
                          </div>
                          <div className="field">
                            <label htmlFor={`${d.id}-fee`}>{t.edit.fee}</label>
                            <input id={`${d.id}-fee`} name="fee" type="number" min={0} step={1000} className="input" defaultValue={d.fee} dir="ltr" />
                          </div>
                          <div className="field">
                            <label htmlFor={`${d.id}-room`}>{t.edit.room}</label>
                            <input id={`${d.id}-room`} name="room" className="input" defaultValue={d.room} maxLength={20} dir="ltr" />
                          </div>
                        </div>
                        <PhotoField imageId={d.imageId} prefix={d.id} round t={t} />
                        <div>
                          <button type="submit" className="btn btn-sm">
                            {t.edit.save}
                          </button>
                        </div>
                      </form>
                      <WhatsappField doctor={d} value={whatsapps[d.id] ?? ''} label={t.settings.whatsapp} t={t} />
                      <form action={deleteDoctor}>
                        <input type="hidden" name="id" value={d.id} />
                        <ConfirmButton label={t.edit.removeDoctor} question={t.edit.sure} className="btn btn-danger btn-sm" />
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
            <form action={createDoctor} className="add-form" style={{ marginTop: 16 }}>
              <input type="hidden" name="clinicId" value={clinic.id} />
              <div className="form-grid" style={{ alignItems: 'end' }}>
                <div className="field">
                  <label htmlFor="new-doctor-name">
                    {t.edit.name} ({t.edit.langs.en})
                  </label>
                  <input id="new-doctor-name" name="name_en" className="input" required maxLength={120} dir="ltr" placeholder="Dr. …" />
                </div>
                <div className="field">
                  <label htmlFor="new-doctor-specialty">{t.edit.specialty}</label>
                  <select id="new-doctor-specialty" name="specialty" className="select" defaultValue={clinic.specialties[0] ?? 'general'}>
                    {specialtyIds.map((s) => (
                      <option key={s} value={s}>
                        {specialties[s][locale]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <button type="submit" className="btn">
                    <Icon name="plus" size={16} />
                    {t.edit.addDoctor}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem' }}>{t.edit.staffTitle}</h2>
            {staff.length ? (
              <ul className="list">
                {staff.map((u) => (
                  <li key={u.id}>
                    <details className="editor">
                      <summary className="row between">
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                          <div className="meta">
                            <span dir="ltr">{u.email}</span>
                            <span>{t.admin.roles[u.role]}</span>
                          </div>
                        </div>
                        <span className="btn btn-secondary btn-sm">
                          <Icon name="edit" size={14} />
                          {t.edit.edit}
                        </span>
                      </summary>
                      <AccountEditor account={u} isSelf={u.id === me.id} back={`/admin/clinics/${clinic.id}`} t={{ admin: t.admin, edit: t.edit }} labels={labels} {...options} />
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="caption">
                {t.edit.noStaff} <Link href="/admin">{t.edit.staffTab}</Link>
              </p>
            )}
          </div>

          <form action={deleteClinic} id="danger" className="card danger-zone stack" style={stack(16)}>
            <input type="hidden" name="id" value={clinic.id} />
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{t.edit.dangerTitle}</h2>
            <p className="caption" style={{ margin: 0 }}>
              {t.edit.dangerLead}
            </p>
            <label className="check">
              <input type="checkbox" name="confirm" required />
              {t.edit.confirm}
            </label>
            <div>
              <button type="submit" className="btn btn-danger">
                {t.edit.deleteClinic}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
