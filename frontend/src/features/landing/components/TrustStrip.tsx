import { CheckCircle2, MapPin, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { usePublicStatsQuery } from '../hooks/usePublicStatsQuery'

interface StatCardProps {
  value: number
  label: string
  caption: string
  /** Background color de la card (los 3 acentos del producto). */
  bg: 'bg-red' | 'bg-blue' | 'bg-green'
  /** Mismo color en text-* para tintar el icono dentro del cuadro blanco. */
  iconColor: 'text-red' | 'text-blue' | 'text-green'
  /** Icono SVG node. */
  icon: React.ReactNode
  /** Reveal delay para escalonar la entrada (segundos). */
  delay?: number
}

function StatCard({ value, label, caption, bg, iconColor, icon, delay = 0 }: StatCardProps) {
  return (
    <div
      // - `text-white` (no `text-background`) → contraste pleno con los colores saturados, mismo
      //   efecto cartoon/sticker del mockup. text-background (cream) atenúa el blanco crispy.
      // - NO usamos `.reveal` aquí: los stat cards aparecen tras la query asíncrona y el
      //   IntersectionObserver de useRevealOnScroll() solo observa elementos presentes en el
      //   mount inicial. `animate-fade-up` se ejecuta on-mount, garantizando visibilidad.
      className={`brutal-lg md:brutal-hover relative animate-fade-up rounded-2xl p-4 text-white md:p-7 ${bg}`}
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {/* Mobile layout: label+number a la izquierda, icono a la derecha */}
      <div className="flex items-center justify-between md:hidden">
        <div>
          <p className="font-brutal text-[10px] font-bold uppercase tracking-widest">{label}</p>
          <p className="mt-1 font-display text-5xl font-black leading-none">{value}</p>
        </div>
        <span
          aria-hidden="true"
          className={`brutal-sm flex size-12 items-center justify-center rounded-md bg-white ${iconColor}`}
        >
          {icon}
        </span>
      </div>

      {/* Desktop layout: label+icon arriba, número gigante, caption */}
      <div className="hidden md:block">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-brutal text-xs font-bold uppercase tracking-widest">{label}</span>
          <span
            aria-hidden="true"
            className={`brutal-sm flex size-10 items-center justify-center rounded-md bg-white ${iconColor}`}
          >
            {icon}
          </span>
        </div>
        <p className="font-display text-7xl font-black leading-none">{value}</p>
        <p className="mt-3 font-medium text-white/85">{caption}</p>
      </div>
    </div>
  )
}

function StatSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="brutal-lg animate-pulse rounded-2xl bg-muted p-4 md:p-7"
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      <div className="h-3 w-24 rounded bg-muted-foreground/30 md:h-4 md:w-32" />
      <div className="mt-3 h-12 w-20 rounded bg-muted-foreground/30 md:mt-4 md:h-20 md:w-28" />
    </div>
  )
}

/**
 * Trust strip — 3 cards brutal con stats reales.
 * Layout: 3 columnas en desktop (rotación alterna), stack en mobile.
 *
 * Estados:
 * - Loading → 3 skeletons brutal
 * - Error → null (silencioso, no es crítico)
 * - Success → datos
 */
export function TrustStrip() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = usePublicStatsQuery()

  if (isError) return null

  return (
    <section aria-label={t('landing.stats.ariaLabel')} className="px-4 pb-8 md:px-6 md:pb-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 md:grid md:grid-cols-3 md:gap-6">
        {isLoading || !data ? (
          <>
            <StatSkeleton />
            <StatSkeleton delay={0.08} />
            <StatSkeleton delay={0.16} />
          </>
        ) : (
          <>
            <StatCard
              value={data.activeSessions}
              label={t('landing.stats.activeSessions')}
              caption={t('landing.stats.activeSessionsCaption')}
              bg="bg-red"
              iconColor="text-red"
              icon={<CheckCircle2 size={20} strokeWidth={2.5} />}
            />
            <StatCard
              value={data.activePlayers}
              label={t('landing.stats.activePlayers')}
              caption={t('landing.stats.activePlayersCaption')}
              bg="bg-blue"
              iconColor="text-blue"
              icon={<UsersRound size={20} strokeWidth={2.5} />}
              delay={0.08}
            />
            <StatCard
              value={data.cities}
              label={t('landing.stats.cities')}
              caption={t('landing.stats.citiesCaption')}
              bg="bg-green"
              iconColor="text-green"
              icon={<MapPin size={20} strokeWidth={2.5} />}
              delay={0.16}
            />
          </>
        )}
      </div>
    </section>
  )
}
