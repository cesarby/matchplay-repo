import { Lock, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCloseSessionMutation, useUpdateSessionMutation } from '../hooks/useSessions'
import type { SessionDetail } from '../types/session.types'

import { CloseSessionModal } from './CloseSessionModal'
import { EditSessionModal } from './EditSessionModal'

interface CreatorActionsProps {
  session: SessionDetail
}

/**
 * Botones de gestión visibles al creador en la página de detalle:
 * editar fecha/plazas, cerrar mesa anticipadamente. Solo se monta
 * cuando ya hay {@link SessionDetail} cargada, así los hooks de
 * mutación reciben siempre un id real.
 */
export function CreatorActions({ session }: CreatorActionsProps) {
  const { t } = useTranslation()
  const [editOpen, setEditOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

  const updateMut = useUpdateSessionMutation(session.id)
  const closeMut = useCloseSessionMutation(session.id)

  const canClose = session.status === 'OPEN'

  return (
    <>
      <div className="mt-4 flex gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
        >
          <Pencil size={14} aria-hidden="true" />
          {t('sessions.detail.edit')}
        </button>
        {canClose && (
          <button
            type="button"
            onClick={() => setCloseOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red/40 bg-card px-3 py-1.5 text-sm font-semibold text-red hover:bg-red/10"
          >
            <Lock size={14} aria-hidden="true" />
            {t('sessions.detail.closeButton')}
          </button>
        )}
      </div>

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
      <CloseSessionModal
        open={closeOpen}
        registeredPlayers={session.registeredPlayers}
        waitlistCount={session.waitlistCount}
        isPending={closeMut.isPending}
        onClose={() => setCloseOpen(false)}
        onConfirm={() => closeMut.mutate(undefined, { onSuccess: () => setCloseOpen(false) })}
      />
    </>
  )
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}
