import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGameDetailQuery } from '@/features/games/hooks/useGames'
import { cn } from '@/shared/lib/cn'

import type { ExpansionSummary } from '../types/session.types'

interface SessionExpansionsBlockProps {
  expansions: ExpansionSummary[]
}

/**
 * Bloque "Expansiones (N)" en la session detail. Cards horizontales clicables;
 * al hacer click se expande un accordion inline que lazy-loadea el detalle
 * del juego (con su summary LLM).
 */
export function SessionExpansionsBlock({ expansions }: SessionExpansionsBlockProps) {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState<number | null>(null)

  if (expansions.length === 0) return null

  return (
    <section aria-labelledby="expansions-heading">
      <h2
        id="expansions-heading"
        className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"
      >
        {t('sessions.detail.expansionsHeading', { count: expansions.length })}
      </h2>
      <ul className="space-y-2">
        {expansions.map((exp) => (
          <ExpansionRow
            key={exp.bggId}
            expansion={exp}
            open={openId === exp.bggId}
            onToggle={() => setOpenId((curr) => (curr === exp.bggId ? null : exp.bggId))}
          />
        ))}
      </ul>
    </section>
  )
}

interface ExpansionRowProps {
  expansion: ExpansionSummary
  open: boolean
  onToggle: () => void
}

function ExpansionRow({ expansion, open, onToggle }: ExpansionRowProps) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useGameDetailQuery(expansion.bggId, open)

  return (
    <li className="overflow-hidden rounded border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`expansion-panel-${expansion.bggId}`}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/50"
      >
        {expansion.thumbnailUrl ? (
          <img
            src={expansion.thumbnailUrl}
            alt=""
            className="size-10 shrink-0 rounded object-cover"
            loading="lazy"
          />
        ) : (
          <div className="size-10 shrink-0 rounded bg-muted" aria-hidden="true" />
        )}
        <span className="flex-1 text-sm font-semibold text-foreground">{expansion.name}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div
          id={`expansion-panel-${expansion.bggId}`}
          className="border-t border-border p-3 text-sm"
        >
          {isLoading && <p className="italic text-muted-foreground">{t('common.loading')}</p>}
          {isError && <p className="text-red">{t('sessions.detail.expansionLoadError')}</p>}
          {data &&
            (data.summary ? (
              <p className="italic leading-relaxed text-foreground">{data.summary}</p>
            ) : (
              <p className="italic text-muted-foreground">
                {t('sessions.detail.expansionNoSummary')}
              </p>
            ))}
        </div>
      )}
    </li>
  )
}
