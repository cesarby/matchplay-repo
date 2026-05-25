import { Users, Zap, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { usePublicStatsQuery } from '../hooks/usePublicStatsQuery'

function StatSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
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
    <div className="flex flex-col items-center gap-1">
      <div aria-hidden="true" className="mb-1">
        {icon}
      </div>
      <span className="font-display text-2xl font-bold text-foreground">
        {value.toLocaleString()}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

/**
 * Banda con 3 estadísticas reales de la comunidad.
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
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
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
                icon={<Zap size={24} className="text-red" />}
              />
              <StatItem
                value={data!.activePlayers}
                label={t('landing.stats.activePlayers')}
                icon={<Users size={24} className="text-blue" />}
              />
              <StatItem
                value={data!.cities}
                label={t('landing.stats.cities')}
                icon={<MapPin size={24} className="text-green" />}
              />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
