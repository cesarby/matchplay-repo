import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'

import {
  useChangeSessionStatusMutation,
  useJoinSessionMutation,
  useLeaveSessionMutation,
  useUpdateSessionMutation,
} from '../hooks/useSessions'
import type { SessionDetail } from '../types/session.types'

import { CancelSessionModal } from './CancelSessionModal'
import { EditSessionModal } from './EditSessionModal'

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

interface SessionActionsProps {
  session: SessionDetail
}

/**
 * Botones de acción del detalle. Visibilidad condicional según:
 *
 * - status terminal (COMPLETED, CANCELLED) → nada
 * - anónimo → CTA "Inicia sesión para unirte"
 * - autenticado, no es organizador, yourRole=null → "Unirme" (entra como PLAYER o WAITLIST según capacidad)
 * - autenticado, yourRole=PLAYER → "Salir"
 * - autenticado, yourRole=WAITLIST → "Salir de la cola"
 * - autenticado, es organizador → "Editar" + transiciones de estado:
 *     · OPEN  → "Cerrar inscripciones" (→ FULL)   |  "Cancelar partida" (→ CANCELLED)
 *     · FULL  → "Reabrir inscripciones" (→ OPEN)  |  "Cancelar partida" (→ CANCELLED)
 */
export function SessionActions({ session }: SessionActionsProps) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const join = useJoinSessionMutation(session.id)
  const leave = useLeaveSessionMutation(session.id)
  const changeStatus = useChangeSessionStatusMutation(session.id)
  const updateMut = useUpdateSessionMutation(session.id)

  // Si está terminal, no se puede hacer nada
  if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
    return null
  }

  // No autenticado: invitamos a login
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to={`/login?from=${encodeURIComponent(`/sessions/${session.id}`)}`}
          className="inline-flex items-center justify-center rounded-sm bg-red px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t('sessions.detail.join')}
        </Link>
      </div>
    )
  }

  const isOwner = user?.userId === session.creatorId

  // Organizador: edición + transiciones
  if (isOwner) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center justify-center rounded-sm border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            {t('sessions.detail.edit')}
          </button>

          {session.status === 'OPEN' && (
            <button
              type="button"
              onClick={() => changeStatus.mutate({ status: 'FULL' })}
              disabled={changeStatus.isPending}
              className="inline-flex items-center justify-center rounded-sm bg-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {t('sessions.detail.closeRegistrations')}
            </button>
          )}

          {session.status === 'FULL' && (
            <button
              type="button"
              onClick={() => changeStatus.mutate({ status: 'OPEN' })}
              disabled={changeStatus.isPending}
              className="inline-flex items-center justify-center rounded-sm bg-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {t('sessions.detail.reopenRegistrations')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            disabled={changeStatus.isPending}
            className="inline-flex items-center justify-center rounded-sm border border-red bg-red-soft px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-red hover:text-white disabled:opacity-50"
          >
            {t('sessions.detail.cancelSession')}
          </button>
        </div>

        <CancelSessionModal
          open={cancelOpen}
          registeredPlayers={session.registeredPlayers}
          waitlistCount={session.waitlistCount}
          isPending={changeStatus.isPending}
          onClose={() => setCancelOpen(false)}
          onConfirm={() =>
            changeStatus.mutate({ status: 'CANCELLED' }, { onSuccess: () => setCancelOpen(false) })
          }
        />

        <EditSessionModal
          open={editOpen}
          initialScheduledAt={toLocalDatetimeInput(session.scheduledAt)}
          initialMaxPlayers={session.maxPlayers}
          registeredPlayers={session.registeredPlayers}
          waitlistCount={session.waitlistCount}
          isPending={updateMut.isPending}
          onClose={() => setEditOpen(false)}
          onSubmit={(payload) => {
            updateMut.mutate(
              {
                scheduledAt: new Date(payload.scheduledAt).toISOString(),
                maxPlayers: payload.maxPlayers,
              },
              { onSuccess: () => setEditOpen(false) },
            )
          }}
        />
      </>
    )
  }

  // Usuario apuntado → salir
  if (session.yourRole === 'PLAYER' || session.yourRole === 'WAITLIST') {
    return (
      <button
        type="button"
        onClick={() => leave.mutate()}
        disabled={leave.isPending}
        className="inline-flex items-center justify-center rounded-sm border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
      >
        {t('sessions.detail.leave')}
      </button>
    )
  }

  // Usuario no apuntado → unirse
  return (
    <button
      type="button"
      onClick={() => join.mutate()}
      disabled={join.isPending}
      className="inline-flex items-center justify-center rounded-sm bg-red px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {t('sessions.detail.join')}
    </button>
  )
}
