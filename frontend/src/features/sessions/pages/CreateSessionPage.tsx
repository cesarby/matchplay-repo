import { useTranslation } from 'react-i18next'

import { SeoHead } from '@/shared/components/SeoHead'

import { CreateSessionForm } from '../components/CreateSessionForm'

/**
 * Página `/sessions/new` — formulario de creación de partida.
 *
 * Protegida en el router con {@code <ProtectedRoute>}; el creator se
 * resuelve del usuario autenticado en el backend (no se manda en el body).
 *
 * SEO: noindex — es una página transaccional sin valor para indexar.
 */
export default function CreateSessionPage() {
  const { t } = useTranslation()

  return (
    <div className="container max-w-3xl py-8">
      <SeoHead
        title={`${t('sessions.create.title')} | Match&Play`}
        description={t('sessions.create.title')}
        noindex
      />

      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">
          {t('sessions.create.title')}
        </h1>
      </header>

      <CreateSessionForm />
    </div>
  )
}
