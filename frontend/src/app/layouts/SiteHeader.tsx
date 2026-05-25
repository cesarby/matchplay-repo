import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Button } from '@/shared/components/Button'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { Logo } from '@/shared/components/Logo'
import { cn } from '@/shared/lib/cn'

/**
 * Header común a todas las pantallas (Main + Auth). Layout de 3 zonas:
 *
 *   [ logo ]              [ Partidas ]              [ idioma · usuario · logout ]
 *      izq                   centro                              der
 *
 * Tres divs flex con la misma anchura aproximada vía {@code flex-1} para que
 * el item central quede realmente centrado independientemente del contenido
 * de los laterales.
 */
export function SiteHeader() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()
  const location = useLocation()

  const isSessionsActive = location.pathname.startsWith('/sessions')

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        {/* Izquierda: logo grande */}
        <div className="flex flex-1 items-center">
          <Link to="/" aria-label="Matchplay — inicio">
            <Logo variant="text-only" className="h-10" />
          </Link>
        </div>

        {/* Centro: Partidas (pill rojo cuando activo) */}
        <nav className="flex flex-1 items-center justify-center text-sm" aria-label="Principal">
          <Link
            to="/sessions"
            aria-current={isSessionsActive ? 'page' : undefined}
            className={cn(
              'rounded-full px-4 py-1.5 transition',
              isSessionsActive
                ? 'bg-red-soft font-semibold text-red'
                : 'font-medium text-foreground hover:bg-muted',
            )}
          >
            {t('nav.sessions')}
          </Link>
        </nav>

        {/* Derecha: usuario · logout (o login/register) · idioma al final */}
        <div className="flex flex-1 items-center justify-end gap-3 text-sm">
          {isAuthenticated && user ? (
            <>
              <span className="hidden text-muted-foreground sm:inline">{user.username}</span>
              <Button variant="ghost" onClick={() => logout.mutate()} isLoading={logout.isPending}>
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-foreground hover:underline">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="font-medium text-red hover:underline">
                {t('nav.register')}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}
