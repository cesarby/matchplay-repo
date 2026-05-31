import { useTranslation } from 'react-i18next'

/**
 * Sticker card del hero: mockup de sesión hardcoded desde i18n.
 *
 * NO es una sesión real — es marketing copy controlado para que el visual
 * no se rompa con el tiempo. Cuando exista el módulo de sessions, se puede
 * sustituir por una sesión real destacada.
 *
 * Diferencias entre viewports:
 * - Desktop: rotación leve + wiggle on hover + float infinito.
 * - Mobile: rotate-[-2deg] estático + float infinito, sin wiggle (es táctil).
 *
 * El componente se renderiza igual en ambos — solo cambian las clases responsive.
 */
export function HeroSessionPreview() {
  const { t } = useTranslation()

  // 12 celdas del dice grid — patrón de colores fijo (mockup del board).
  const cells = [
    'bg-red',
    'bg-yellow',
    'bg-blue',
    'bg-green',
    'bg-yellow',
    'bg-red',
    'bg-green',
    'bg-blue',
    'bg-blue',
    'bg-green',
    'bg-red',
    'bg-yellow',
  ]

  return (
    <article className="brutal-lg mx-auto max-w-md rotate-2 animate-float rounded-2xl bg-background p-5 md:rotate-0 md:p-6 md:hover:animate-wiggle">
      {/* Chips: ID + estado */}
      <div className="mb-3 flex items-center justify-between md:mb-4">
        <span className="tag-cut rounded-md bg-foreground px-2.5 py-1 font-brutal text-[10px] font-bold uppercase text-background md:px-3 md:text-xs">
          {t('landing.hero.preview.id')}
        </span>
        <span className="brutal-sm rounded-md bg-green px-2.5 py-1 font-brutal text-[10px] font-bold uppercase text-background md:px-3 md:text-xs">
          ● {t('landing.hero.preview.open')}
        </span>
      </div>

      {/* Dice grid (mockup del board) */}
      <div
        role="img"
        aria-label={t('landing.hero.preview.boardAlt')}
        className="brutal-inner mb-4 rounded-lg bg-background-alt p-2.5 md:mb-5 md:rounded-xl md:p-3"
      >
        <div className="dgrid">
          {cells.map((color, i) => (
            <div key={i} className={`dcell ${color}`} />
          ))}
        </div>
      </div>

      {/* Título + meta */}
      <h3 className="font-display text-xl font-black leading-tight md:text-2xl">
        {t('landing.hero.preview.title')}
      </h3>
      <p className="mt-1.5 font-brutal text-[10px] uppercase tracking-wider text-muted-foreground md:mt-2 md:text-xs">
        {t('landing.hero.preview.meta')}
      </p>

      {/* Avatares + plazas */}
      <div className="mt-3 flex items-center justify-between md:mt-4">
        <div className="flex -space-x-1.5">
          <span className="brutal-sm flex size-8 items-center justify-center rounded-full bg-red text-xs font-bold text-background md:size-9 md:text-sm">
            A
          </span>
          <span className="brutal-sm flex size-8 items-center justify-center rounded-full bg-yellow text-xs font-bold text-foreground md:size-9 md:text-sm">
            M
          </span>
          <span className="brutal-sm flex size-8 items-center justify-center rounded-full bg-blue text-xs font-bold text-background md:size-9 md:text-sm">
            C
          </span>
          {/* Slot vacío — solo desktop */}
          <span className="brutal-sm hidden size-8 items-center justify-center rounded-full border-dashed bg-background text-xs font-bold text-foreground md:flex md:size-9 md:text-sm">
            +1
          </span>
        </div>
        <span className="font-brutal text-[11px] font-bold text-foreground md:text-xs">
          {t('landing.hero.preview.spots')}
        </span>
      </div>

      {/* CTA */}
      <button
        type="button"
        className="brutal brutal-press md:brutal-hover mt-4 w-full rounded-lg bg-red py-2.5 font-display text-base font-bold text-background md:mt-5 md:py-3 md:text-lg"
      >
        {t('landing.hero.preview.cta')}
      </button>
    </article>
  )
}
