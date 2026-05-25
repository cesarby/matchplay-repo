import { Users, Dices, PlusCircle, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface DiscoveryCard {
  titleKey: string
  descriptionKey: string
  Icon: LucideIcon
  accentColor: string // Tailwind class for border-left color
  iconBg: string
  iconColor: string
}

const CARDS: DiscoveryCard[] = [
  {
    titleKey: 'landing.discovery.cards.one.title',
    descriptionKey: 'landing.discovery.cards.one.description',
    Icon: Users,
    accentColor: 'border-yellow',
    iconBg: 'bg-yellow-soft',
    iconColor: 'text-foreground',
  },
  {
    titleKey: 'landing.discovery.cards.two.title',
    descriptionKey: 'landing.discovery.cards.two.description',
    Icon: Dices,
    accentColor: 'border-green',
    iconBg: 'bg-green-soft',
    iconColor: 'text-foreground',
  },
  {
    titleKey: 'landing.discovery.cards.three.title',
    descriptionKey: 'landing.discovery.cards.three.description',
    Icon: PlusCircle,
    accentColor: 'border-red',
    iconBg: 'bg-red-soft',
    iconColor: 'text-foreground',
  },
]

/**
 * Sección con 3 cards de propuesta de valor.
 * Cinta lateral semántica (amarillo/verde/rojo) vía border-left.
 * Iconos decorativos con aria-hidden.
 * Contraste: text-foreground sobre bg-*-soft (15:1+ AAA).
 */
export function DiscoveryCards() {
  const { t } = useTranslation()

  return (
    <section className="py-16" aria-labelledby="discovery-title">
      <div className="container">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-red">
            {t('landing.discovery.eyebrow')}
          </p>
          <h2
            id="discovery-title"
            className="font-display text-3xl font-bold text-foreground lg:text-4xl"
          >
            {t('landing.discovery.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            {t('landing.discovery.subtitle')}
          </p>
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {CARDS.map(({ titleKey, descriptionKey, Icon, accentColor, iconBg, iconColor }) => (
            <article
              key={titleKey}
              className={`relative overflow-hidden rounded border-l-[6px] bg-card p-6 shadow-[var(--shadow)] transition-shadow duration-200 hover:shadow-[var(--shadow-hover)] ${accentColor}`}
            >
              {/* Icono decorativo */}
              <div
                className={`mb-4 flex size-12 items-center justify-center rounded-2xl ${iconBg}`}
              >
                <Icon size={22} aria-hidden={true} className={iconColor} />
              </div>

              <h3 className="font-display text-lg font-bold text-foreground">{t(titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(descriptionKey)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
