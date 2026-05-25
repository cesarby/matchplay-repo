import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Button } from '@/shared/components/Button'
import { Logo } from '@/shared/components/Logo'

/**
 * Header común a todas las pantallas (Main + Auth). Tener el logo y el
 * acceso a "Partidas" siempre visible asegura que el usuario pueda volver
 * al landing desde cualquier sitio (login, register, sessions, etc.).
 */
export function SiteHeader() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()

  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" aria-label="Matchplay — inicio">
          <Logo variant="text-only" className="h-7" />
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/sessions" className="text-foreground hover:underline">
            {t('nav.sessions')}
          </Link>
          {isAuthenticated && user ? (
            <>
              <span className="text-muted-foreground">{user.username}</span>
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
        </nav>
      </div>
    </header>
  )
}
