import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Slide {
  eyebrowKey: string
  titleKey: string
  descriptionKey: string
}

const SLIDES: Slide[] = [
  {
    eyebrowKey: 'landing.community.slides.one.eyebrow',
    titleKey: 'landing.community.slides.one.title',
    descriptionKey: 'landing.community.slides.one.description',
  },
  {
    eyebrowKey: 'landing.community.slides.two.eyebrow',
    titleKey: 'landing.community.slides.two.title',
    descriptionKey: 'landing.community.slides.two.description',
  },
  {
    eyebrowKey: 'landing.community.slides.three.eyebrow',
    titleKey: 'landing.community.slides.three.title',
    descriptionKey: 'landing.community.slides.three.description',
  },
]

/**
 * Carousel de comunidad con 3 slides placeholder.
 * Usa embla-carousel-react con loop y sin auto-advance (a11y).
 * Controles prev/next + indicadores de paginación.
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
    <section className="bg-blue py-16" aria-labelledby="community-title">
      <div className="container">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/70">
            {t('landing.community.eyebrow')}
          </p>
          <h2
            id="community-title"
            className="font-display text-3xl font-bold text-white lg:text-4xl"
          >
            {t('landing.community.title')}
          </h2>
        </div>

        {/* Carousel */}
        <div
          className="relative"
          aria-roledescription="carousel"
          aria-label={t('landing.community.title')}
        >
          <div ref={emblaRef} className="overflow-hidden rounded">
            <div className="flex">
              {SLIDES.map((slide, i) => (
                <div
                  key={slide.titleKey}
                  className="relative min-w-full"
                  aria-roledescription="slide"
                  aria-label={t('landing.community.goTo', { n: i + 1 })}
                >
                  <div className="relative overflow-hidden rounded bg-blue-soft/10 px-8 py-10 lg:p-14">
                    {/* Formas decorativas */}
                    <div
                      aria-hidden="true"
                      className="absolute -right-8 -top-8 size-40 rotate-12 rounded-3xl bg-white/5"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute -bottom-6 right-24 size-24 rounded-full bg-yellow/20"
                    />

                    {/* Contenido */}
                    <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      {t(slide.eyebrowKey)}
                    </span>
                    <h3 className="font-display text-2xl font-bold text-white lg:text-3xl">
                      {t(slide.titleKey)}
                    </h3>
                    <p className="mt-3 max-w-xl text-base text-white/85">
                      {t(slide.descriptionKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controles */}
          <div className="mt-6 flex items-center justify-between">
            {/* Indicadores */}
            <div className="flex gap-2" role="group" aria-label="Slide indicators">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  aria-label={t('landing.community.goTo', { n: i + 1 })}
                  aria-pressed={i === selectedIndex}
                  className={`h-2 rounded-full bg-white transition-all duration-300 ${
                    i === selectedIndex ? 'w-8 opacity-100' : 'w-2 opacity-40'
                  }`}
                />
              ))}
            </div>

            {/* Flechas prev/next */}
            <div className="flex gap-2">
              <button
                onClick={scrollPrev}
                aria-label={t('landing.community.prev')}
                className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                onClick={scrollNext}
                aria-label={t('landing.community.next')}
                className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
