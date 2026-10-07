'use client'

import { useOptimistic, type CSSProperties } from 'react'
import { setLocale } from '@/app/actions'
import { isLocale, localeNames, locales, type Locale } from '@/lib/i18n'

/**
 * A segmented control whose highlight slides to the chosen language right away,
 * before the page comes back in that language. It always reads left to right so
 * it never moves or reorders when the page flips direction.
 */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const [active, setActive] = useOptimistic(locale)

  async function choose(formData: FormData) {
    const next = formData.get('locale')
    if (isLocale(next)) setActive(next)
    await setLocale(formData)
  }

  const index = locales.indexOf(active)
  return (
    <form
      action={choose}
      className="lang-switch"
      dir="ltr"
      aria-label={label}
      style={{ '--count': locales.length, '--index': index } as CSSProperties}
    >
      <span className="lang-thumb" aria-hidden="true" />
      {locales.map((l) => (
        <button key={l} type="submit" name="locale" value={l} lang={l} aria-pressed={l === active}>
          {localeNames[l]}
        </button>
      ))}
    </form>
  )
}
