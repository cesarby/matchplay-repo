import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router-dom'

/**
 * Layout para las pantallas de login/register.
 *
 * Sin header global — son flujos focalizados (cero distracciones, cero nav)
 * con un único botón "Volver" arriba a la izquierda que devuelve al usuario
 * a la landing por si pulsó Entrar / Crear cuenta por equivocación.
 */
export function AuthLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="relative flex flex-1 items-center justify-center p-4">
        {/* Botón Volver — absolute para no afectar al centrado del card. */}
        <Link
          to="/"
          className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue md:left-6 md:top-6"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('common.back')}
        </Link>

        <div className="w-full max-w-md rounded bg-card p-8 shadow">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
