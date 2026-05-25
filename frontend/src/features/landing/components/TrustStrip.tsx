import { MapPin, Users, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { usePublicStatsQuery } from '../hooks/usePublicStatsQuery'

function StatSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 animate-pulse rounded-full bg-muted" />
      <div className="space-y-1">
        <div className="h-7 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

interface StatItemProps {
  value: number
  label: string
  icon: React.ReactNode
}

function StatItem({ value, label, icon }: StatItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="shrink-0">
        {icon}
      </div>
      <div className="leading-tight">
        <p className="font-display text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/**
 * Banda con 3 estadísticas reales de la comunidad.
 * Layout horizontal: icono a la izquierda + número/label apilados a la derecha.
 * Loading → skeleton. Error → ocultar. Success → datos.
 */
export function TrustStrip() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = usePublicStatsQuery()

  if (isError) return null

  return (
    <section
      aria-label={t('landing.stats.ariaLabel')}
      className="border-y border-border bg-card py-8"
    >
      <div className="container">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {isLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatItem
                value={data!.activeSessions}
                label={t('landing.stats.activeSessions')}
                icon={<Zap size={28} className="text-red" />}
              />
              <StatItem
                value={data!.activePlayers}
                label={t('landing.stats.activePlayers')}
                icon={<Users size={28} className="text-blue" />}
              />
              <StatItem
                value={data!.cities}
                label={t('landing.stats.cities')}
                icon={<MapPin size={28} className="text-green" />}
              />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
