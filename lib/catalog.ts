import 'server-only'
import { asc, avg, count } from 'drizzle-orm'
import { cache } from 'react'
import { getDb } from '@/db'
import { clinicRatings, clinics as clinicsTable, doctors as doctorsTable } from '@/db/schema'
import { fillLocalized, isCity, isHonorific, isSpecialty, localizedOrBlank, titledName, type Clinic, type Doctor } from './data'

export type Catalog = {
  clinics: Clinic[]
  doctors: Doctor[]
  getClinic: (id: string) => Clinic | undefined
  getDoctor: (id: string) => Doctor | undefined
  doctorsAt: (clinicId: string) => Doctor[]
}

/** All clinics and doctors, read once per request. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const db = await getDb()
  const [clinicRows, doctorRows, ratingRows] = await Promise.all([
    db.select().from(clinicsTable).orderBy(asc(clinicsTable.createdAt), asc(clinicsTable.id)),
    db.select().from(doctorsTable).orderBy(asc(doctorsTable.sort), asc(doctorsTable.id)),
    db
      .select({ clinicId: clinicRatings.clinicId, average: avg(clinicRatings.stars), count: count() })
      .from(clinicRatings)
      .groupBy(clinicRatings.clinicId),
  ])
  // Patients' star ratings, averaged to one decimal.
  const ratings = new Map(ratingRows.map((r) => [r.clinicId, { rating: Math.round(Number(r.average) * 10) / 10, reviews: r.count }]))
  const clinics: Clinic[] = clinicRows.map((c) => ({
    id: c.id,
    name: fillLocalized(c.name),
    city: isCity(c.city) ? c.city : 'erbil',
    address: fillLocalized(c.address),
    phone: c.phone,
    location: { lat: c.lat, lng: c.lng },
    rating: ratings.get(c.id)?.rating ?? 0,
    reviews: ratings.get(c.id)?.reviews ?? 0,
    specialties: c.specialties.filter(isSpecialty),
    about: fillLocalized(c.about),
    imageId: c.imageId,
    raw: { name: localizedOrBlank(c.name), address: localizedOrBlank(c.address), about: localizedOrBlank(c.about) },
  }))
  const doctors: Doctor[] = doctorRows.map((d) => {
    const honorific = isHonorific(d.honorific) ? d.honorific : 'none'
    const other = fillLocalized(d.honorificOther)
    return {
      id: d.id,
      clinicId: d.clinicId,
      name: titledName(fillLocalized(d.name), honorific, other),
      honorific,
      specialty: isSpecialty(d.specialty) ? d.specialty : 'general',
      title: fillLocalized(d.title),
      years: d.years,
      fee: d.fee,
      room: d.room,
      bio: fillLocalized(d.bio),
      imageId: d.imageId,
      sort: d.sort,
      raw: {
        name: localizedOrBlank(d.name),
        title: localizedOrBlank(d.title),
        bio: localizedOrBlank(d.bio),
        honorificOther: localizedOrBlank(d.honorificOther),
      },
    }
  })
  return {
    clinics,
    doctors,
    getClinic: (id) => clinics.find((c) => c.id === id),
    getDoctor: (id) => doctors.find((d) => d.id === id),
    doctorsAt: (clinicId) => doctors.filter((d) => d.clinicId === clinicId),
  }
})
