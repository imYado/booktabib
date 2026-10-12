import { updateClinicAccent, updateDoctorWhatsapp, updateVisitMinutes } from '@/app/actions'
import { accentIds, accents, type AccentId } from '@/lib/accents'
import type { Clinic, Doctor } from '@/lib/data'
import type { Dictionary, Locale } from '@/lib/i18n'

/** Accent colour picker for a clinic. */
export function AccentPicker({ clinic, accent, t }: { clinic: Clinic; accent: AccentId; t: Dictionary }) {
  return (
    <form action={updateClinicAccent} className="stack" style={{ '--stack': '16px' } as React.CSSProperties}>
      <input type="hidden" name="clinicId" value={clinic.id} />
      <fieldset>
        <legend className="field-legend">{t.settings.accent}</legend>
        <div className="choices" style={{ marginTop: 12 }}>
          {accentIds.map((id) => (
            <label key={id} className="choice swatch-choice">
              <input type="radio" name="accent" value={id} defaultChecked={id === accent} />
              <span className="swatch" style={{ background: accents[id].paper }} aria-hidden="true" />
              {t.settings.accents[id]}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <button type="submit" className="btn btn-sm">
          {t.settings.save}
        </button>
      </div>
    </form>
  )
}

/** One doctor's WhatsApp number, where their patients' live links send messages. */
export function WhatsappField({
  doctor,
  value,
  label,
  t,
}: {
  doctor: Doctor
  value: string
  label: string
  t: Dictionary
}) {
  const id = `wa-${doctor.id}`
  return (
    <form action={updateDoctorWhatsapp} className="wa-row">
      <input type="hidden" name="doctorId" value={doctor.id} />
      <label htmlFor={id}>{label}</label>
      <input id={id} name="whatsapp" type="tel" className="input" defaultValue={value} placeholder="07…" dir="ltr" maxLength={30} />
      <button type="submit" className="btn btn-secondary btn-sm">
        {t.settings.save}
      </button>
    </form>
  )
}

/** How long one doctor's visits usually take, which sets the estimated times patients see. */
export function VisitMinutesField({ doctor, value, label, t }: { doctor: Doctor; value: number; label: string; t: Dictionary }) {
  const id = `visit-${doctor.id}`
  return (
    <form action={updateVisitMinutes} className="wa-row">
      <input type="hidden" name="doctorId" value={doctor.id} />
      <label htmlFor={id}>{label}</label>
      <span className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}>
        <input id={id} name="visitMinutes" type="number" min={3} max={180} step={1} className="input" defaultValue={value} dir="ltr" style={{ maxWidth: 96 }} />
        <span className="caption">{t.settings.minutes}</span>
      </span>
      <button type="submit" className="btn btn-secondary btn-sm">
        {t.settings.save}
      </button>
    </form>
  )
}

export function ClinicSettings({
  clinic,
  accent,
  doctors,
  whatsapps,
  visitMinutes,
  canEditAccent,
  locale,
  t,
}: {
  clinic: Clinic
  accent: AccentId
  doctors: Doctor[]
  whatsapps: Record<string, string>
  visitMinutes: Record<string, number>
  canEditAccent: boolean
  locale: Locale
  t: Dictionary
}) {
  return (
    <section className="card stack" style={{ '--stack': '32px', marginTop: 32 } as React.CSSProperties}>
      <div>
        <h2 style={{ fontSize: '1.5rem' }}>{t.settings.title}</h2>
        <p className="caption" style={{ margin: 0 }}>
          {t.settings.lead}
        </p>
      </div>
      {canEditAccent && <AccentPicker clinic={clinic} accent={accent} t={t} />}
      <div className="stack" style={{ '--stack': '12px' } as React.CSSProperties}>
        <p className="field-legend" style={{ margin: 0 }}>
          {t.settings.whatsapp}
        </p>
        <p className="caption" style={{ margin: 0 }}>
          {t.settings.whatsappHint.replace('{phone}', clinic.phone)}
        </p>
        {doctors.map((d) => (
          <WhatsappField key={d.id} doctor={d} value={whatsapps[d.id] ?? ''} label={d.name[locale]} t={t} />
        ))}
      </div>
      <div className="stack" style={{ '--stack': '12px' } as React.CSSProperties}>
        <p className="field-legend" style={{ margin: 0 }}>
          {t.settings.visit}
        </p>
        <p className="caption" style={{ margin: 0 }}>
          {t.settings.visitHint}
        </p>
        {doctors.map((d) => (
          <VisitMinutesField key={d.id} doctor={d} value={visitMinutes[d.id]} label={d.name[locale]} t={t} />
        ))}
      </div>
    </section>
  )
}
