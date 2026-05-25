import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * SessionCard hardcoded con datos del i18n para el visual del hero.
 * No recibe datos reales — es marketing copy fijo.
 * Tiene cinta lateral roja via CSS ::before.
 */
export function HeroSessionPreview() {
  const { t } = useTranslation()

  return (
    <article
      className="relative overflow-hidden rounded bg-card shadow-[var(--shadow)]"
      style={{
        // Cinta lateral roja (6px) via CSS inline — más portable que un pseudoelemento en JSX
        borderLeft: '6px solid rgb(var(--p-red))',
      }}
    >
      <div className="p-5">
        {/* Chips */}
        <div className="mb-4 flex gap-2">
          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
            {t('landing.hero.visual.ownChip')}
          </span>
          <span className="rounded-full bg-green-soft px-3 py-1 text-xs font-semibold text-foreground">
            {t('landing.hero.visual.openChip')}
          </span>
        </div>

        {/* Título */}
        <h3 className="font-display text-xl font-bold text-foreground">
          {t('landing.hero.visual.title')}
        </h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{t('landing.hero.visual.meta')}</p>

        {/* Board preview (grid de colores) */}
        <div
          role="img"
          aria-label={t('landing.hero.visual.ariaLabel')}
          className="mb-4 grid grid-cols-4 gap-1 overflow-hidden rounded-xl"
        >
          {/* 12 celdas con colores semánticos — decorativas */}
          <div aria-hidden="true" className="aspect-square rounded bg-yellow-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-red-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-green-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-blue-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-green-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-blue-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-yellow-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-red-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-red-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-green-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-blue-soft" />
          <div aria-hidden="true" className="aspect-square rounded bg-yellow-soft" />
        </div>

        {/* Footer: ciudad + fecha + plazas */}
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t('landing.hero.visual.city')} · {t('landing.hero.visual.date')} ·{' '}
            {t('landing.hero.visual.time')}
          </span>
          <span className="rounded-full bg-green-soft px-2 py-0.5 text-xs font-semibold text-foreground">
            {t('landing.hero.visual.spots')}
          </span>
        </div>

        {/* CTA */}
        <Link
          to="/sessions"
          className="inline-flex w-full items-center justify-center rounded-sm bg-red px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t('landing.cta.join')}
        </Link>
      </div>
    </article>
  )
}
