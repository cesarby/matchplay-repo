import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { HeroDeco } from './HeroDeco'
import { HeroSessionPreview } from './HeroSessionPreview'
import { QuickSearch } from './QuickSearch'

/**
 * Hero de la landing: eyebrow + H1 (con resaltado via <Trans>) + subtitle
 * + 2 CTAs + QuickSearch + SessionPreview visual.
 *
 * Layout:
 * - Desktop (≥lg): 2 columnas [1.05fr / 0.95fr]
 * - Mobile (<lg): stack vertical
 */
export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden bg-background-alt py-16 lg:py-24">
      <HeroDeco />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Columna izquierda */}
          <div className="space-y-6">
            {/* Eyebrow */}
            <p className="text-sm font-semibold uppercase tracking-widest text-red">
              {t('landing.hero.eyebrow')}
            </p>

            {/* H1 con resaltado — el traductor decide dónde cae <1> */}
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground lg:text-5xl xl:text-6xl">
              <Trans
                i18nKey="landing.hero.title"
                components={{ 1: <span className="text-red" /> }}
              />
            </h1>

            {/* Subtítulo */}
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              {t('landing.hero.subtitle')}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              {/* Primario: explorar (rojo) */}
              <Link
                to="/sessions"
                className="inline-flex items-center rounded-sm bg-red px-6 py-3 font-semibold text-white transition hover:opacity-90"
              >
                {t('landing.cta.explore')}
              </Link>

              {/* Secundario: crear cuenta (verde outlined) */}
              <Link
                to="/register"
                className="inline-flex items-center rounded-sm border border-green bg-green-soft px-6 py-3 font-semibold text-foreground transition hover:opacity-90"
              >
                {t('landing.cta.register')}
              </Link>
            </div>

            {/* Quick search */}
            <QuickSearch />
          </div>

          {/* Columna derecha — SessionPreview (oculto en mobile) */}
          <div className="hidden lg:block">
            <HeroSessionPreview />
          </div>
        </div>
      </div>
    </section>
  )
}
