import { useTranslation } from 'react-i18next'

import { SeoHead } from '@/shared/components/SeoHead'

import { CreateSessionForm } from '../components/CreateSessionForm'

/**
 * Página `/sessions/new` — formulario de creación de partida con live preview.
 *
 * Protegida en el router con {@code <ProtectedRoute>}; el creator se
 * resuelve del usuario autenticado en el backend (no se manda en el body).
 *
 * SEO: noindex — es una página transaccional sin valor para indexar.
 *
 * El layout (header + 2 columnas form+preview) vive dentro de
 * {@link CreateSessionForm}; aquí solo se fija el ancho de la página.
 */
export default function CreateSessionPage() {
  const { t } = useTranslation()

  return (
    <div className="container max-w-6xl py-8">
      <SeoHead
        title={`${t('sessions.create.title')} | Match&Play`}
        description={t('sessions.create.title')}
        noindex
      />

      <CreateSessionForm />
    </div>
  )
}
