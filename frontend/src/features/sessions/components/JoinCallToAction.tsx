import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useJoinSessionMutation } from '../hooks/useSessions'
import type { SessionDetail } from '../types/session.types'

interface JoinCallToActionProps {
  session: SessionDetail
  isAuthenticated: boolean
}

/**
 * CTA destacado de "Unirme" para no apuntados, visible solo en mobile.
 * Se renderiza bajo el header de la detail page como contrapeso al sidebar
 * que pasa al final del scroll en mobile.
 *
 * Devuelve null si la acción no aplica: sesión terminal, ya soy participante,
 * o no quedan plazas.
 */
export function JoinCallToAction({ session, isAuthenticated }: JoinCallToActionProps) {
  const { t } = useTranslation()
  const join = useJoinSessionMutation(session.id)

  const canJoinAtAll =
    session.status !== 'COMPLETED' &&
    session.status !== 'CANCELLED' &&
    session.yourRole === null &&
    session.registeredPlayers < session.maxPlayers

  if (!canJoinAtAll) return null

  if (!isAuthenticated) {
    return (
      <div className="mb-6 sm:hidden">
        <Link
          to={`/login?next=/sessions/${session.id}`}
          className="block w-full rounded-md bg-red px-4 py-3 text-center text-base font-bold text-white shadow-md transition hover:opacity-90"
        >
          {t('sessions.detail.joinLoginCta')}
        </Link>
      </div>
    )
  }

  return (
    <div id="join-cta" className="mb-6 sm:hidden">
      <button
        type="button"
        onClick={() => join.mutate()}
        disabled={join.isPending}
        className="w-full rounded-md bg-red px-4 py-3 text-base font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
      >
        {t('sessions.detail.joinCta')}
      </button>
    </div>
  )
}
