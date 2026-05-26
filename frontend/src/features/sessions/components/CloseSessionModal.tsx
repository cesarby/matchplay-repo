import { useTranslation } from 'react-i18next'

interface CloseSessionModalProps {
  open: boolean
  registeredPlayers: number
  waitlistCount: number
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}

export function CloseSessionModal({
  open,
  registeredPlayers,
  waitlistCount,
  onConfirm,
  onClose,
  isPending,
}: CloseSessionModalProps) {
  const { t } = useTranslation()
  if (!open) return null
  const body =
    waitlistCount > 0
      ? t('sessions.close.bodyWithWaitlist', {
          count: registeredPlayers,
          waitlist: waitlistCount,
        })
      : t('sessions.close.body', { count: registeredPlayers })
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
    >
      <div className="w-full max-w-md rounded-md border-2 border-border bg-card p-6 shadow-xl">
        <h2 id="close-modal-title" className="mb-3 font-display text-xl font-bold text-foreground">
          {t('sessions.close.title')}
        </h2>
        <p className="mb-6 text-sm text-foreground">{body}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border-2 border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {t('sessions.close.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('sessions.close.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
