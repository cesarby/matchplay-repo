import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Button } from '@/shared/components/Button'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { Logo } from '@/shared/components/Logo'

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

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center gap-4">
        {/* Izquierda: logo grande */}
        <div className="flex flex-1 items-center">
          <Link to="/" aria-label="Matchplay — inicio">
            <Logo variant="text-only" className="h-10" />
          </Link>
        </div>

        {/* Centro: Partidas */}
        <nav className="flex flex-1 items-center justify-center text-sm" aria-label="Principal">
          <Link
            to="/sessions"
            className="rounded-sm px-3 py-1.5 font-medium text-foreground hover:bg-muted"
          >
            {t('nav.sessions')}
          </Link>
        </nav>

        {/* Derecha: idioma + usuario + logout (o login/register si anónimo) */}
        <div className="flex flex-1 items-center justify-end gap-3 text-sm">
          <LanguageSwitcher />
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
        </div>
      </div>
    </header>
  )
}
