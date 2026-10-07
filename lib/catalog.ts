import 'server-only'
import { asc } from 'drizzle-orm'
import { cache } from 'react'
import { getDb } from '@/db'
import { clinics as clinicsTable, doctors as doctorsTable } from '@/db/schema'
import { isCity, isSpecialty, type Clinic, type Doctor } from './data'

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
  const [clinicRows, doctorRows] = await Promise.all([
    db.select().from(clinicsTable).orderBy(asc(clinicsTable.createdAt), asc(clinicsTable.id)),
    db.select().from(doctorsTable).orderBy(asc(doctorsTable.sort), asc(doctorsTable.id)),
  ])
  const clinics: Clinic[] = clinicRows.map((c) => ({
    id: c.id,
    name: c.name,
    city: isCity(c.city) ? c.city : 'erbil',
    address: c.address,
    phone: c.phone,
    location: { lat: c.lat, lng: c.lng },
    rating: c.rating,
    reviews: c.reviews,
    specialties: c.specialties.filter(isSpecialty),
    about: c.about,
    imageId: c.imageId,
  }))
  const doctors: Doctor[] = doctorRows.map((d) => ({
    ...d,
    specialty: isSpecialty(d.specialty) ? d.specialty : 'general',
  }))
  return {
    clinics,
    doctors,
    getClinic: (id) => clinics.find((c) => c.id === id),
    getDoctor: (id) => doctors.find((d) => d.id === id),
    doctorsAt: (clinicId) => doctors.filter((d) => d.clinicId === clinicId),
  }
})
