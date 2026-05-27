import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import type { MyTab, TabCounts } from '../types/session.types'

interface TabDef {
  tab: MyTab
  labelKey: string
  shortLabelKey?: string
  emoji: string
  activeBg: string
  activeText: string
  outlineBorder: string
  outlineText: string
}

const TABS: TabDef[] = [
  {
    tab: 'CREATED',
    labelKey: 'sessions.mine.tabs.created',
    shortLabelKey: 'sessions.mine.tabs.createdShort',
    emoji: '✏️',
    activeBg: 'bg-yellow text-foreground',
    activeText: 'text-foreground',
    outlineBorder: 'border-yellow',
    outlineText: 'text-yellow',
  },
  {
    tab: 'PLAYER',
    labelKey: 'sessions.mine.tabs.player',
    emoji: '🎲',
    activeBg: 'bg-green text-white',
    activeText: 'text-white',
    outlineBorder: 'border-green',
    outlineText: 'text-green',
  },
  {
    tab: 'WAITLIST',
    labelKey: 'sessions.mine.tabs.waitlist',
    shortLabelKey: 'sessions.mine.tabs.waitlistShort',
    emoji: '⏳',
    activeBg: 'bg-blue text-white',
    activeText: 'text-white',
    outlineBorder: 'border-blue',
    outlineText: 'text-blue',
  },
  {
    tab: 'HISTORY',
    labelKey: 'sessions.mine.tabs.history',
    emoji: '📚',
    activeBg: 'bg-foreground text-background',
    activeText: 'text-background',
    outlineBorder: 'border-muted-foreground',
    outlineText: 'text-muted-foreground',
  },
]

interface MySessionsTabsProps {
  active: MyTab
  counts: TabCounts
  onChange: (next: MyTab) => void
}

/**
 * Tabs sticky en la cabecera de Mis partidas. Pills coloreadas por tab
 * (alineadas con la paleta 4-color del proyecto) que muestran el count.
 * Activa colored solid; inactivas outline con opacidad. Responsive: en
 * mobile usa labels cortos cuando existen, en sm+ los completos.
 */
export function MySessionsTabs({ active, counts, onChange }: MySessionsTabsProps) {
  const { t } = useTranslation()
  const countOf = (tab: MyTab): number => {
    switch (tab) {
      case 'CREATED':
        return counts.created
      case 'PLAYER':
        return counts.player
      case 'WAITLIST':
        return counts.waitlist
      case 'HISTORY':
        return counts.history
    }
  }

  return (
    <div
      role="tablist"
      aria-label={t('sessions.mine.tabsLabel')}
      className="sticky top-0 z-10 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-border bg-card px-4 py-3 sm:px-6"
    >
      {TABS.map((tabDef) => {
        const isActive = active === tabDef.tab
        const count = countOf(tabDef.tab)
        return (
          <button
            key={tabDef.tab}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tabDef.tab)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition sm:text-sm',
              isActive
                ? cn(tabDef.activeBg, 'border-transparent')
                : cn('bg-transparent opacity-70', tabDef.outlineBorder, tabDef.outlineText),
            )}
          >
            <span aria-hidden="true">{tabDef.emoji}</span>
            <span className="sm:hidden">{t(tabDef.shortLabelKey ?? tabDef.labelKey)}</span>
            <span className="hidden sm:inline">{t(tabDef.labelKey)}</span>
            <span
              className={cn(
                'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                isActive ? 'bg-black/15' : 'bg-black/10',
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
