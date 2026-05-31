import { ArrowRight } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { HeroSessionPreview } from './HeroSessionPreview'
import { QuickSearch } from './QuickSearch'

/**
 * Hero brutalismo lúdico.
 *
 * Estructura:
 *   - Sticker flotante "Sin registro pa' mirar 👀" (solo desktop)
 *   - Eyebrow chip con punto verde animado
 *   - H1 a 3 líneas: "Tira el dado. / Mueve <stamp>ficha</stamp>. / Juega 🎲 ya."
 *   - Subtítulo con span amarillo destacando "cerca de ti"
 *   - 2 CTAs (rojo / crema)
 *   - QuickSearch (form brutal)
 *   - HeroSessionPreview (card sticker — al lado en desktop, debajo en mobile)
 *
 * Layout: desktop grid 7/5; mobile stack vertical (preview en sección separada
 * para mejor flujo en pantalla pequeña — ver LandingContent).
 */
export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-6 md:px-6 md:pb-12 md:pt-16">
      <div className="relative mx-auto grid max-w-7xl grid-cols-12 items-center gap-8">
        {/* Sticker flotante — solo desktop. Posición: por encima del card
            preview, sobresaliendo del flujo. -top-8 lo saca del top del grid
            hacia el padding del section (md:pt-16), de forma que se ve flotando
            por encima del card sin tocarlo. */}
        <span
          aria-hidden="true"
          className="brutal absolute -top-8 right-[6%] z-20 hidden rotate-[8deg] animate-pop-in rounded-full bg-yellow px-4 py-2 font-display text-sm font-black text-foreground lg:inline-flex"
        >
          {t('landing.hero.sticker')}
        </span>

        {/* Columna izquierda */}
        <div className="relative z-10 col-span-12 lg:col-span-7">
          {/* Eyebrow */}
          <div className="reveal brutal-sm mb-5 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 font-brutal text-[10px] font-bold uppercase tracking-wider md:mb-6 md:gap-2 md:px-4 md:py-1.5 md:text-xs">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-green md:size-2" />
            <span className="hidden md:inline">{t('landing.hero.eyebrow')}</span>
            <span className="md:hidden">{t('landing.hero.eyebrowShort')}</span>
          </div>

          {/* H1 — patrón <Trans>: <1>ficha</1> = stamp, <3>línea3 con <2>🎲</2></3> = text-red */}
          <h1 className="reveal font-display font-black leading-[0.92] tracking-tight md:leading-[0.95]">
            <Trans
              i18nKey="landing.hero.title"
              components={{
                line: <span className="block text-[44px] md:text-[5.5rem] lg:text-[7rem]" />,
                1: <span className="stamp" />,
                2: <span className="inline-block animate-dice-roll">🎲</span>,
                3: <span className="text-red" />,
              }}
            />
          </h1>

          {/* Subtítulo */}
          <p className="reveal mt-5 max-w-xl text-[15px] font-medium md:mt-8 md:text-xl">
            <Trans
              i18nKey="landing.hero.subtitle"
              components={{
                1: <span className="rounded bg-yellow px-1 font-bold md:px-1.5" />,
              }}
            />
          </p>

          {/* CTAs */}
          <div className="reveal mt-6 flex flex-col gap-2.5 md:mt-8 md:flex-row md:flex-wrap md:gap-4">
            <Link
              to="/sessions"
              className="brutal brutal-press md:brutal-hover inline-flex items-center justify-center gap-2 rounded-xl bg-red px-7 py-3.5 text-center font-display text-base font-bold text-background md:py-4 md:text-lg"
            >
              {t('landing.cta.explore')}
              <ArrowRight size={18} strokeWidth={3} aria-hidden="true" className="md:size-[22px]" />
            </Link>
            <Link
              to="/register"
              className="brutal brutal-press md:brutal-hover inline-flex items-center justify-center gap-2 rounded-xl bg-background px-7 py-3.5 text-center font-display text-base font-bold text-foreground md:py-4 md:text-lg"
            >
              {t('landing.cta.register')}
            </Link>
          </div>

          {/* QuickSearch */}
          <div className="reveal mt-6 md:mt-10">
            <QuickSearch />
          </div>
        </div>

        {/* Columna derecha — preview (solo desktop) */}
        <div className="relative z-10 col-span-12 hidden lg:col-span-5 lg:block">
          <HeroSessionPreview />
        </div>
      </div>
    </section>
  )
}
