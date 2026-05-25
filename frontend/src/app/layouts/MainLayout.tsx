import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Button } from '@/shared/components/Button'

export function MainLayout() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold">
            Matchplay
          </Link>
          <nav className="flex items-center gap-3 text-sm">
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
      <main className="container flex-1 py-8">
        <Outlet />
      </main>
      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Matchplay
      </footer>
    </div>
  )
}
