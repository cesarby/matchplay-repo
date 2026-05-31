import { Dices, PlusCircle, UsersRound, type LucideIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

interface DiscoveryCard {
  numberKey: string
  titleKey: string
  descriptionKey: string
  Icon: LucideIcon
  /** Background del card. */
  bg: 'bg-yellow' | 'bg-green' | 'bg-red'
  /** Color del texto principal (yellow → ink, green/red → background). */
  textColor: 'text-foreground' | 'text-background'
  /** Clase responsive de rotación del icono en hover (solo desktop). */
  iconHoverClass: string
  /** Reveal delay para escalonar entrada (segundos). */
  delay: number
}

const CARDS: DiscoveryCard[] = [
  {
    numberKey: '01.',
    titleKey: 'landing.discovery.cards.one.title',
    descriptionKey: 'landing.discovery.cards.one.description',
    Icon: UsersRound,
    bg: 'bg-yellow',
    textColor: 'text-foreground',
    iconHoverClass: 'group-hover:-rotate-12',
    delay: 0,
  },
  {
    numberKey: '02.',
    titleKey: 'landing.discovery.cards.two.title',
    descriptionKey: 'landing.discovery.cards.two.description',
    Icon: Dices,
    bg: 'bg-green',
    textColor: 'text-background',
    iconHoverClass: 'group-hover:rotate-12',
    delay: 0.08,
  },
  {
    numberKey: '03.',
    titleKey: 'landing.discovery.cards.three.title',
    descriptionKey: 'landing.discovery.cards.three.description',
    Icon: PlusCircle,
    bg: 'bg-red',
    textColor: 'text-background',
    iconHoverClass: 'group-hover:scale-110',
    delay: 0.16,
  },
]

/**
 * Sección "Cómo va" — 3 cards brutal, cada una con su color sólido.
 * Sin links al final (decisión: las cards son explicativas, no navegables).
 *
 * Hover: el icono interno gira/escala (solo desktop — md:brutal-hover).
 * Mobile usa solo brutal-press.
 */
export function DiscoveryCards() {
  const { t } = useTranslation()

  return (
    <section className="px-4 pb-8 md:px-6 md:pb-24" aria-labelledby="discovery-title">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="reveal mb-5 md:mx-auto md:mb-14 md:max-w-3xl md:text-center">
          <span className="brutal-sm mb-3 inline-block rounded-md bg-foreground px-2 py-0.5 font-brutal text-[10px] font-bold uppercase tracking-widest text-background md:mb-5 md:px-4 md:py-1.5 md:text-base">
            {t('landing.discovery.eyebrow')}
          </span>
          <h2
            id="discovery-title"
            className="font-display text-3xl font-black leading-[0.95] md:text-5xl lg:text-6xl"
          >
            <Trans
              i18nKey="landing.discovery.title"
              components={{
                1: <span className="rounded bg-red px-2 text-background md:rounded-md md:px-3" />,
              }}
            />
          </h2>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-7">
          {CARDS.map(
            ({
              numberKey,
              titleKey,
              descriptionKey,
              Icon,
              bg,
              textColor,
              iconHoverClass,
              delay,
            }) => (
              <article
                key={titleKey}
                className={`reveal brutal-lg md:brutal-hover group rounded-2xl p-5 md:p-7 ${bg} ${textColor}`}
                style={delay > 0 ? { transitionDelay: `${delay}s` } : undefined}
              >
                <div className="mb-3 flex items-center justify-between md:mb-5">
                  <span className="font-brutal text-xl font-black md:text-2xl">{numberKey}</span>
                  <div
                    className={`brutal flex size-11 items-center justify-center rounded-lg bg-background text-foreground transition-transform md:size-14 md:rounded-xl ${iconHoverClass}`}
                  >
                    <Icon
                      size={22}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="md:size-7"
                    />
                  </div>
                </div>
                <h3 className="font-display text-xl font-black leading-tight md:mb-3 md:text-2xl">
                  {t(titleKey)}
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed md:mt-0 md:text-base">
                  {t(descriptionKey)}
                </p>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
