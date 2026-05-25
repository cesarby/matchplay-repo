import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Button } from '@/shared/components/Button'
import { Logo } from '@/shared/components/Logo'

export function MainLayout() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Skip-link a11y — invisible hasta recibir focus */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-blue"
      >
        Saltar al contenido
      </a>

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
                <Button
                  variant="ghost"
                  onClick={() => logout.mutate()}
                  isLoading={logout.isPending}
                >
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

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Matchplay
      </footer>
    </div>
  )
}
