import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SessionDateTimePicker } from './SessionDateTimePicker'

interface EditPayload {
  scheduledAt: string
  maxPlayers: number
}

interface EditSessionModalProps {
  open: boolean
  /** Valor inicial en formato datetime-local "YYYY-MM-DDTHH:mm". */
  initialScheduledAt: string
  initialMaxPlayers: number
  registeredPlayers: number
  waitlistCount: number
  onSubmit: (payload: EditPayload) => void
  onClose: () => void
  isPending: boolean
}

export function EditSessionModal({
  open,
  initialScheduledAt,
  initialMaxPlayers,
  registeredPlayers,
  waitlistCount,
  onSubmit,
  onClose,
  isPending,
}: EditSessionModalProps) {
  const { t } = useTranslation()
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt)
  const [maxPlayers, setMaxPlayers] = useState(initialMaxPlayers)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const minMax = registeredPlayers

  function handleSubmit() {
    if (maxPlayers < minMax) {
      setError(t('sessions.edit.maxPlayersBelowMin', { min: minMax }))
      return
    }
    setError(null)
    onSubmit({ scheduledAt, maxPlayers })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
    >
      <div className="w-full max-w-lg rounded-md border-2 border-border bg-card p-6 shadow-xl">
        <h2 id="edit-modal-title" className="mb-4 font-display text-xl font-bold text-foreground">
          {t('sessions.edit.title')}
        </h2>

        <div className="space-y-4">
          {/* El popover del picker usa z-30. El modal es z-50. El popover vive
              dentro del modal, por lo que su z-index es relativo al stacking
              context del modal — funciona correctamente sin ajustes adicionales. */}
          <SessionDateTimePicker
            label={t('sessions.edit.scheduledAt')}
            value={scheduledAt}
            onChange={setScheduledAt}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="edit-max-players" className="text-sm font-medium text-foreground">
              {t('sessions.edit.maxPlayers')}
            </label>
            <input
              id="edit-max-players"
              type="number"
              min={minMax}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number.parseInt(e.target.value, 10) || 0)}
              className="w-32 rounded-sm border-2 border-border bg-card px-3 py-2 text-base outline-none focus:border-red focus:ring-2 focus:ring-yellow/30"
            />
            <p className="text-xs text-muted-foreground">
              {t('sessions.edit.maxPlayersHint', { min: minMax })}
            </p>
          </div>

          {waitlistCount > 0 && (
            <p className="rounded bg-yellow-soft/50 px-3 py-2 text-sm text-foreground">
              {t('sessions.edit.waitlistNote', { count: waitlistCount })}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border-2 border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {t('sessions.edit.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('sessions.edit.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
