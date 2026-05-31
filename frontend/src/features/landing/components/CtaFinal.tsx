import { ArrowRight } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * CTA final — sección amarilla brutal con la última llamada a registro.
 * El patrón `.checker` se usa como decoración sutil interna (solo desktop).
 * Mobile usa pb-28 a nivel de section para no chocar con la TabBar sticky.
 */
export function CtaFinal() {
  const { t } = useTranslation()

  return (
    <section className="px-4 pb-8 md:px-6 md:pb-24">
      <div className="reveal brutal-lg relative mx-auto max-w-5xl rounded-2xl bg-yellow p-7 text-center text-foreground md:rounded-3xl md:p-12 lg:p-16">
        {/* Decoración checker — solo desktop */}
        <div
          aria-hidden="true"
          className="checker pointer-events-none absolute inset-3 hidden rounded-2xl opacity-[0.04] md:block"
        />
        <div className="relative">
          <h2 className="font-display text-3xl font-black leading-[0.95] md:text-5xl lg:text-6xl">
            <Trans
              i18nKey="landing.ctaFinal.heading"
              components={{
                br: <br />,
                1: <span className="rounded-md bg-red px-2 text-background md:px-3" />,
              }}
            />
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium md:mt-5 md:text-lg">
            {t('landing.ctaFinal.body')}
          </p>
          <Link
            to="/register"
            className="brutal brutal-press md:brutal-hover mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 font-display text-base font-bold text-background md:mt-8 md:w-auto md:px-8 md:py-4 md:text-lg"
          >
            {t('landing.ctaFinal.cta')}
            <ArrowRight size={18} strokeWidth={3} aria-hidden="true" className="md:size-[22px]" />
          </Link>
        </div>
      </div>
    </section>
  )
}
