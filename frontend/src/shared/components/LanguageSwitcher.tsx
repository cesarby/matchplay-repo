import { useTranslation } from 'react-i18next'

import { type Locale, useLocaleStore } from '@/shared/store/localeStore'

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
]

/**
 * Toggle minimalista de idioma. Bota entre los locales soportados,
 * persistido en localStorage vía {@code localeStore}, y sincroniza con
 * react-i18next para que el cambio se vea en pantalla al instante.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { locale, setLocale } = useLocaleStore()

  function handleChange(next: Locale) {
    setLocale(next)
    void i18n.changeLanguage(next)
  }

  return (
    <div
      role="group"
      aria-label="Cambiar idioma"
      className="inline-flex overflow-hidden rounded-full border border-border bg-card"
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => handleChange(code)}
          className={
            locale === code
              ? 'bg-foreground px-2.5 py-1 text-xs font-semibold text-card'
              : 'px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted'
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
