import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import type { MyTab, TabCounts } from '../types/session.types'

interface TabDef {
  tab: MyTab
  labelKey: string
  shortLabelKey?: string
  emoji: string
  activeBg: string
  /**
   * Bg del badge de count cuando la pill está activa. Sigue la regla del mockup:
   * pill oscura (texto blanco) → overlay blanco para que el badge sea MÁS CLARO
   * que el pill; pill clara (yellow + texto oscuro) → overlay negro para que el
   * badge sea más oscuro que el pill. En ambos casos el badge contrasta con el
   * fondo del pill, no compite con el texto.
   */
  activeCountBg: string
  outlineBorder: string
  outlineText: string
}

/**
 * Configuración de tabs alineada con `historial-v2.html`. Los hex literales en
 * `outlineText` y en HISTORY active replican los tonos oscuros del mockup, que
 * no coinciden con los tokens 4-color del proyecto (más brillantes/saturados).
 *
 * - Outline pill: border con el color brand, text con el tono OSCURO del mismo
 *   color para legibilidad sobre cream bg. opacity 0.7 (mockup usa 0.6).
 * - Active pill: bg saturado, text contrastante.
 * - Count badge: overlay claro en pills oscuras, oscuro en pill yellow (claro).
 */
const TABS: TabDef[] = [
  {
    tab: 'CREATED',
    labelKey: 'sessions.mine.tabs.created',
    shortLabelKey: 'sessions.mine.tabs.createdShort',
    emoji: '✏️',
    activeBg: 'bg-yellow text-foreground',
    activeCountBg: 'bg-black/15',
    outlineBorder: 'border-yellow',
    outlineText: 'text-[#6B4A00]',
  },
  {
    tab: 'PLAYER',
    labelKey: 'sessions.mine.tabs.player',
    emoji: '🎲',
    activeBg: 'bg-green text-white',
    activeCountBg: 'bg-white/25',
    outlineBorder: 'border-green',
    outlineText: 'text-[#0B5A3B]',
  },
  {
    tab: 'WAITLIST',
    labelKey: 'sessions.mine.tabs.waitlist',
    shortLabelKey: 'sessions.mine.tabs.waitlistShort',
    emoji: '⏳',
    activeBg: 'bg-blue text-white',
    activeCountBg: 'bg-white/25',
    outlineBorder: 'border-blue',
    outlineText: 'text-[#1F3A6B]',
  },
  {
    tab: 'HISTORY',
    labelKey: 'sessions.mine.tabs.history',
    emoji: '📚',
    activeBg: 'bg-[#1F1F2E] text-white',
    activeCountBg: 'bg-white/20',
    outlineBorder: 'border-[#6B6B6B]',
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
                isActive ? tabDef.activeCountBg : 'bg-black/10',
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
