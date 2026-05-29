import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useEffect } from 'react'

import { cn } from '@/shared/lib/cn'

import { useProfileFeedbackStore } from '../store/profileFeedbackStore'

const AUTO_DISMISS_MS = 6000

/**
 * Banda sticky en lo alto de /profile que muestra el último feedback de
 * mutation (error o éxito). Errores se auto-cierran a los 6 s o con el botón ✕;
 * los successes igual.
 *
 * Existe para resolver el silencio del onError de useUpdateProfileMutation: sin
 * esto, un 500 del backend dejaba al usuario viendo el optimistic revertirse
 * sin razón visible.
 */
export function ProfileFeedbackBanner() {
  const message = useProfileFeedbackStore((s) => s.message)
  const variant = useProfileFeedbackStore((s) => s.variant)
  const shownAt = useProfileFeedbackStore((s) => s.shownAt)
  const clear = useProfileFeedbackStore((s) => s.clear)

  useEffect(() => {
    if (!message) return
    const id = setTimeout(clear, AUTO_DISMISS_MS)
    return () => clearTimeout(id)
    // shownAt incluido para resetear el timer cuando llega un mensaje nuevo.
  }, [message, shownAt, clear])

  if (!message) return null

  const isError = variant === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cn(
        'mb-4 flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
        isError
          ? 'border-red/40 bg-red-soft text-foreground'
          : 'border-green/40 bg-green-soft text-foreground',
      )}
    >
      <Icon
        size={18}
        className={cn('mt-0.5 shrink-0', isError ? 'text-red' : 'text-green')}
        aria-hidden="true"
      />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={clear}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-black/5"
        aria-label="Cerrar"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
