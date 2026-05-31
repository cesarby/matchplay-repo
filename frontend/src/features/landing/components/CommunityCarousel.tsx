import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

interface Slide {
  badgeKey: string
  quoteKey: string
  bodyKey: string
  /** Avatares con iniciales — patrón fijo por slide */
  avatars: Array<{ initial: string; bg: string; fg: 'text-foreground' | 'text-background' }>
  /** Para el mini-card sticker: nombre del juego mostrado */
  gameKey: string
  /** Para el mini-card sticker: meta (lugar + fecha) */
  metaKey: string
  /** Patrón de colores del dice-grid 4x2 (8 celdas) */
  cells: string[]
}

const SLIDES: Slide[] = [
  {
    badgeKey: 'landing.community.slides.one.badge',
    quoteKey: 'landing.community.slides.one.quote',
    bodyKey: 'landing.community.slides.one.body',
    avatars: [
      { initial: 'L', bg: 'bg-red', fg: 'text-background' },
      { initial: 'P', bg: 'bg-green', fg: 'text-background' },
      { initial: 'R', bg: 'bg-yellow', fg: 'text-foreground' },
    ],
    gameKey: 'landing.community.slides.one.game',
    metaKey: 'landing.community.slides.one.meta',
    cells: [
      'bg-red',
      'bg-yellow',
      'bg-green',
      'bg-blue',
      'bg-yellow',
      'bg-red',
      'bg-blue',
      'bg-green',
    ],
  },
  {
    badgeKey: 'landing.community.slides.two.badge',
    quoteKey: 'landing.community.slides.two.quote',
    bodyKey: 'landing.community.slides.two.body',
    avatars: [
      { initial: 'D', bg: 'bg-blue', fg: 'text-background' },
      { initial: 'S', bg: 'bg-red', fg: 'text-background' },
      { initial: 'A', bg: 'bg-yellow', fg: 'text-foreground' },
    ],
    gameKey: 'landing.community.slides.two.game',
    metaKey: 'landing.community.slides.two.meta',
    cells: [
      'bg-blue',
      'bg-red',
      'bg-yellow',
      'bg-green',
      'bg-red',
      'bg-green',
      'bg-blue',
      'bg-yellow',
    ],
  },
  {
    badgeKey: 'landing.community.slides.three.badge',
    quoteKey: 'landing.community.slides.three.quote',
    bodyKey: 'landing.community.slides.three.body',
    avatars: [
      { initial: 'M', bg: 'bg-green', fg: 'text-background' },
      { initial: 'I', bg: 'bg-yellow', fg: 'text-foreground' },
      { initial: 'J', bg: 'bg-blue', fg: 'text-background' },
    ],
    gameKey: 'landing.community.slides.three.game',
    metaKey: 'landing.community.slides.three.meta',
    cells: [
      'bg-green',
      'bg-yellow',
      'bg-red',
      'bg-blue',
      'bg-green',
      'bg-red',
      'bg-yellow',
      'bg-blue',
    ],
  },
]

/**
 * Carousel de comunidad — quotes + mini-card sticker brutal.
 * Sin auto-advance (decisión a11y previa, conservada).
 * Patrón embla + tailwind responsive.
 */
export function CommunityCarousel() {
  const { t } = useTranslation()
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  return (
    <section
      id="community"
      className="px-4 py-8 md:px-6 md:py-24"
      aria-labelledby="community-title"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="reveal mb-5 md:mb-14">
          <span className="brutal-sm mb-3 inline-block rounded-md bg-blue px-2 py-0.5 font-brutal text-[10px] font-bold uppercase tracking-widest text-background md:mb-5 md:px-4 md:py-1.5 md:text-base">
            {t('landing.community.eyebrow')}
          </span>
          <h2
            id="community-title"
            className="max-w-2xl font-display text-3xl font-black leading-[0.95] md:text-5xl lg:text-6xl"
          >
            <Trans
              i18nKey="landing.community.title"
              components={{
                1: <span className="rounded bg-yellow px-2 md:rounded-md md:px-3" />,
              }}
            />
          </h2>
        </div>

        {/* Card outer brutal — ESTÁTICA, fuera del embla. Así su box-shadow
            no queda recortado por el overflow-hidden del embla. El embla
            envuelve solo el CONTENIDO interno que cambia entre slides
            (badge + quote + body + mini-card). La paginación queda dentro
            de esta card outer pero fuera del embla.
            Match estructural con concept-B-brutalist-mobile.html (un único
            <div class="reveal bg-cream brutal-lg rounded-2xl p-5">). */}
        <div
          aria-roledescription="carousel"
          aria-label={t('landing.community.ariaLabel')}
          className="reveal brutal-lg rounded-2xl bg-background p-5 md:rounded-3xl md:p-8 lg:p-12"
        >
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {SLIDES.map((slide, i) => (
                // Cada slide es flex-[0_0_100%]. El padding `py-7 pr-4`:
                //   - pr-4 crea 16px de gap visible entre slides durante el swipe
                //     (sin esto se verían pegadas una a otra)
                //   - py-7 (1.75rem = 28px arriba y abajo) da room al box-shadow
                //     y a la rotación (md:rotate-[3deg]) del mini-card (Terraforming
                //     Mars) dentro del propio slide, para que el overflow-hidden
                //     del embla no lo recorte por arriba ni por abajo
                <div
                  key={slide.quoteKey}
                  className="relative min-w-0 flex-[0_0_100%] py-7 pr-4"
                  aria-roledescription="slide"
                  aria-label={t('landing.community.slidePosition', {
                    n: i + 1,
                    total: SLIDES.length,
                  })}
                >
                  <SlideContent slide={slide} />
                </div>
              ))}
            </div>
          </div>

          {/* Controles — dentro de la card outer pero fuera del embla:
              están siempre visibles y no swipean con el contenido. */}
          <div className="mt-5 flex items-center justify-between md:mt-10">
            {/* Indicadores */}
            <div className="flex items-center gap-1.5 md:gap-2" role="group" aria-label="Slides">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  aria-label={t('landing.community.goTo', { n: i + 1 })}
                  aria-pressed={i === selectedIndex}
                  className={`h-2.5 rounded-full bg-foreground transition-all md:h-3 ${
                    i === selectedIndex ? 'w-8 md:w-10' : 'w-2.5 bg-foreground/20 md:w-3'
                  }`}
                />
              ))}
            </div>

            {/* Prev / Next */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={scrollPrev}
                aria-label={t('landing.community.prev')}
                className="brutal-sm brutal-press md:brutal-hover flex size-10 items-center justify-center rounded-lg bg-background md:size-12 md:rounded-xl"
              >
                <ChevronLeft size={16} strokeWidth={3} aria-hidden="true" className="md:size-5" />
              </button>
              <button
                onClick={scrollNext}
                aria-label={t('landing.community.next')}
                className="brutal-sm brutal-press md:brutal-hover flex size-10 items-center justify-center rounded-lg bg-foreground text-background md:size-12 md:rounded-xl"
              >
                <ChevronRight size={16} strokeWidth={3} aria-hidden="true" className="md:size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SlideContent({ slide }: { slide: Slide }) {
  const { t } = useTranslation()

  // El brutal-lg outer ya lo provee el wrapper del carousel.
  // Aquí solo va el contenido que cambia entre slides.
  return (
    <div>
      <div className="grid grid-cols-12 items-center gap-4 md:gap-8">
        {/* Bloque izquierdo: quote + body + CTA */}
        <div className="col-span-12 lg:col-span-7">
          <span className="rounded-md bg-foreground px-2 py-1 font-brutal text-[10px] font-bold uppercase tracking-widest text-background md:px-3 md:text-xs">
            {t(slide.badgeKey)}
          </span>
          <h3 className="mt-3 font-display text-xl font-black leading-tight md:mt-5 md:text-3xl lg:text-4xl">
            {t(slide.quoteKey)}
          </h3>
          <p className="mt-3 text-sm font-medium md:mt-4 md:text-lg">{t(slide.bodyKey)}</p>

          {/* Avatares + nombres — solo desktop */}
          <div className="mt-4 hidden items-center gap-4 md:flex">
            <div className="flex -space-x-1.5">
              {slide.avatars.map((a, i) => (
                <span
                  key={i}
                  className={`brutal-sm flex size-11 items-center justify-center rounded-full font-bold ${a.bg} ${a.fg}`}
                >
                  {a.initial}
                </span>
              ))}
            </div>
            <p className="font-bold">{t('landing.community.waiting')}</p>
          </div>
        </div>

        {/* Mini card sticker. En mobile más pequeño (max-w-[220px], padding y
            radius compactos) para que no acapare todo el slide; en desktop
            crece a tamaño completo con rotación. */}
        <div className="col-span-12 lg:col-span-5">
          <div className="brutal-drop-lg mx-auto max-w-[280px] animate-float rounded-xl bg-background-alt p-4 md:max-w-none md:rotate-3 md:rounded-2xl md:p-5">
            <div className="mb-3 flex items-center justify-between md:mb-4">
              <span className="rounded-md bg-foreground px-2 py-1 font-brutal text-[10px] font-bold uppercase text-background md:px-3 md:text-xs">
                {t(slide.metaKey)}
              </span>
              <span className="font-brutal text-xs font-bold text-green md:text-sm">3/4</span>
            </div>
            <div className="dgrid">
              {slide.cells.map((color, i) => (
                <div key={i} className={`dcell ${color}`} />
              ))}
            </div>
            <p className="mt-3 font-display text-sm font-black md:mt-4 md:text-lg">
              {t(slide.gameKey)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
