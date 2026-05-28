import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  registeredPlayers: number
  waitlistCount: number
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Modal de confirmación para cancelar una partida.
 *
 * <p>Avisa de que la acción es irreversible, que el chat se borra, y que los
 * apuntados no reciben notificación (el módulo de notificaciones aún no está
 * disponible). Si hay jugadores o personas en cola, el cuerpo incluye el total
 * para que el organizador valore el impacto.</p>
 */
export function CancelSessionModal({
  open,
  registeredPlayers,
  waitlistCount,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  if (!open) return null
  const total = registeredPlayers + waitlistCount
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label={t('common.close', { defaultValue: 'Cerrar' })}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-md rounded-lg bg-card p-5 shadow-xl">
        <h3 id="cancel-modal-title" className="mb-2 text-base font-semibold">
          {t('sessions.cancelConfirm.title')}
        </h3>
        <p className="mb-3 text-sm text-foreground">
          {total > 0
            ? t('sessions.cancelConfirm.bodyWithPlayers', { count: total })
            : t('sessions.cancelConfirm.body')}
        </p>
        <p className="mb-4 text-xs italic text-muted-foreground">
          {t('sessions.cancelConfirm.note')}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-muted px-3 py-2 text-sm"
          >
            {t('sessions.cancelConfirm.keep')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t('sessions.cancelConfirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
