import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { GameTypeahead } from '@/features/games/components/GameTypeahead'
import type { GameSearchResult } from '@/features/games/types/game.types'
import { cn } from '@/shared/lib/cn'

import { useProfileQuery, useUpdateProfileMutation } from '../hooks/useProfile'
import type { FavoriteGameSummary } from '../types/profile.types'

const MAX = 5

/**
 * Picker de juegos favoritos. Sin state local: lee directamente del cache de
 * TanStack (`useProfileQuery`). Los cambios disparan `useUpdateProfileMutation`
 * con `_favoriteGamesOptimistic`, que actualiza el cache inmediatamente vía
 * `onMutate` y revierte si el server rechaza la mutation.
 *
 * Este patrón elimina las race conditions que tenía la versión anterior con
 * state local + useEffect de sincronización.
 */
export function FavoriteGamesPicker() {
  const { t } = useTranslation()
  const { data } = useProfileQuery()
  const update = useUpdateProfileMutation()
  const [open, setOpen] = useState(false)

  const items: FavoriteGameSummary[] = data?.favoriteGames ?? []

  function remove(bggId: number) {
    const next = items.filter((g) => g.bggId !== bggId)
    update.mutate({
      favoriteGameBggIds: next.map((g) => g.bggId),
      _favoriteGamesOptimistic: next,
    })
  }

  function add(game: FavoriteGameSummary) {
    if (items.find((g) => g.bggId === game.bggId)) {
      setOpen(false)
      return
    }
    const next = [...items, game]
    update.mutate({
      favoriteGameBggIds: next.map((g) => g.bggId),
      _favoriteGamesOptimistic: next,
    })
    setOpen(false)
  }

  const slots = Array.from({ length: MAX }, (_, i) => items[i] ?? null)

  return (
    <div>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingFavorites')}
      </h4>
      <div className="flex flex-wrap gap-3">
        {slots.map((g, i) =>
          g ? (
            <div
              key={g.bggId}
              className="relative h-28 w-24 overflow-hidden rounded-md border border-muted bg-white p-2"
            >
              {g.thumbnailUrl && (
                <img src={g.thumbnailUrl} alt={g.name} className="h-16 w-full object-contain" />
              )}
              <p className="mt-1 truncate text-[11px] font-medium">{g.name}</p>
              <button
                type="button"
                aria-label={`Quitar ${g.name}`}
                onClick={() => remove(g.bggId)}
                className="absolute right-1 top-1 rounded-full bg-black/40 p-0.5 text-white"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => setOpen(true)}
              disabled={items.length >= MAX}
              className={cn(
                'flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-muted text-xs text-muted-foreground transition hover:border-foreground/30',
                items.length >= MAX && 'cursor-not-allowed opacity-30',
              )}
            >
              <span className="text-xl">+</span>
              <span>{t('profile.favoritesAdd')}</span>
            </button>
          ),
        )}
      </div>
      {open && (
        <GameSearchModal
          onClose={() => setOpen(false)}
          onSelect={(g) => add({ bggId: g.bggId, name: g.name, thumbnailUrl: g.thumbnailUrl })}
        />
      )}
    </div>
  )
}

interface GameSearchModalProps {
  onClose: () => void
  onSelect: (game: GameSearchResult) => void
}

function GameSearchModal({ onClose, onSelect }: GameSearchModalProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<GameSearchResult | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="favorites-modal-title"
    >
      <button
        type="button"
        aria-label={t('common.close', { defaultValue: 'Cerrar' })}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="favorites-modal-title" className="text-base font-semibold">
            {t('profile.headingFavorites')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Cerrar' })}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <GameTypeahead
          label={t('profile.favoritesAdd')}
          labelSrOnly
          value={selected}
          onChange={setSelected}
          placeholder={t('profile.favoritesAdd')}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-muted px-3 py-2 text-sm"
          >
            {t('common.close', { defaultValue: 'Cerrar' })}
          </button>
          <button
            type="button"
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            {t('common.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
