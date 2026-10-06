import { setLocale } from '@/app/actions'
import { localeNames, locales, type Dictionary, type Locale } from '@/lib/i18n'

export function LanguageSwitcher({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <form action={setLocale} className="lang-switch" aria-label={t.common.switchTo}>
      {locales.map((l) => (
        <button key={l} type="submit" name="locale" value={l} lang={l} aria-pressed={l === locale}>
          {localeNames[l]}
        </button>
      ))}
    </form>
  )
}
