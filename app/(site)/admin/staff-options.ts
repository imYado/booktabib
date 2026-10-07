import type { Catalog } from '@/lib/catalog'
import type { Locale } from '@/lib/i18n'

/** Clinic and doctor choices for the staff account forms. */
export function staffOptions({ clinics, doctors, getClinic }: Catalog, locale: Locale) {
  return {
    clinics: clinics.map((c) => ({ value: c.id, label: c.name[locale] })),
    doctors: doctors.map((d) => ({
      value: d.id,
      label: `${d.name[locale]} · ${getClinic(d.clinicId)?.name[locale]}`,
      shortLabel: d.name[locale],
      clinicId: d.clinicId,
    })),
  }
}
