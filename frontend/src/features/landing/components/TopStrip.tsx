import { useTranslation } from 'react-i18next'

import { usePublicStatsQuery } from '../hooks/usePublicStatsQuery'

const SEPARATOR_COLORS = ['text-yellow', 'text-red', 'text-green', 'text-blue', 'text-yellow']

/**
 * Banner superior con marquee de stats animadas.
 * Si las stats fallan o están en loading, fallback a texto sin números —
 * la banda siempre se renderiza para no romper la altura visual del top.
 *
 * Animación: `animate-marquee` (22s) en desktop, `animate-marquee-mobile`
 * (18s) en pantallas <md. Reduced motion la para — el primer bloque de
 * items sigue visible estático.
 */
export function TopStrip() {
  const { t } = useTranslation()
  const { data } = usePublicStatsQuery()

  const items = [
    t('landing.topStrip.activeSessions', { count: data?.activeSessions ?? 0 }),
    t('landing.topStrip.activePlayers', { count: data?.activePlayers ?? 0 }),
    t('landing.topStrip.cities', { count: data?.cities ?? 0 }),
    t('landing.topStrip.free'),
    t('landing.topStrip.turn'),
  ]

  // Render del bloque interno — se repetirá 2× para conseguir el loop visual.
  // Mobile muestra solo 4 items (sin "turn") para que no se aprieten.
  const itemsMobile = items.slice(0, 4)

  return (
    <div className="marquee-wrap border-b-4 border-foreground bg-foreground py-2 text-background md:py-2">
      {/* Desktop variant */}
      <div className="hidden animate-marquee md:flex">
        <MarqueeBlock items={items} />
        <MarqueeBlock items={items} ariaHidden />
      </div>
      {/* Mobile variant */}
      <div className="flex animate-marquee-mobile md:hidden">
        <MarqueeBlock items={itemsMobile} compact />
        <MarqueeBlock items={itemsMobile} compact ariaHidden />
      </div>
    </div>
  )
}

interface MarqueeBlockProps {
  items: string[]
  ariaHidden?: boolean
  compact?: boolean
}

function MarqueeBlock({ items, ariaHidden, compact }: MarqueeBlockProps) {
  return (
    <div
      className={`flex shrink-0 items-center font-brutal uppercase tracking-widest ${
        compact ? 'gap-5 px-3 text-[10px]' : 'gap-8 px-4 text-xs'
      }`}
      aria-hidden={ariaHidden}
    >
      {items.map((item, i) => (
        <span key={i} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span>★ {item}</span>
          <span className={SEPARATOR_COLORS[i % SEPARATOR_COLORS.length]}>●</span>
        </span>
      ))}
    </div>
  )
}
