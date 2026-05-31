import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Avatar } from '@/shared/components/Avatar'
import { cn } from '@/shared/lib/cn'

import { MobileMenu } from './MobileMenu'
import { UserMenu } from './UserMenu'

/**
 * SiteHeader brutal — header global de la app.
 *
 * UNIFICADO (F2.4): mismo componente para todas las rutas (landing y resto).
 * El antiguo LandingHeader fue absorbido. La detección de estado auth
 * decide qué CTAs y qué nav mostrar.
 *
 * Layout desktop (md+):
 *   - Container brutal `rounded-2xl` centrado dentro de `max-w-7xl`.
 *   - Logo izquierda · Nav center · CTAs/UserMenu derecha.
 *
 * Layout mobile (<md):
 *   - Sticky top con backdrop-blur.
 *   - Anónimo: logo + CTAs "Entrar" / "Crear cuenta".
 *   - Autenticado: logo + Avatar trigger → MobileMenu overlay.
 */
export function SiteHeader() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isSessionsActive = location.pathname === '/sessions'
  const isMyActive = location.pathname.startsWith('/sessions/mine')

  return (
    <>
      {/* Desktop header — container brutal centrado, NO sticky */}
      <header className="hidden px-6 pt-6 md:block">
        <div className="brutal mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-background px-6 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" aria-label="Matchplay — inicio">
            <span className="brutal-sm flex size-10 items-center justify-center rounded-md bg-red font-display text-xl font-black text-background">
              M
            </span>
            <span className="font-display text-2xl font-black tracking-tight">
              matchplay
              <span className="text-red">.</span>
            </span>
          </Link>

          {/* Nav center */}
          <nav
            className="flex items-center gap-8 text-sm font-bold uppercase tracking-wider"
            aria-label="Principal"
          >
            <Link
              to="/sessions"
              aria-current={isSessionsActive ? 'page' : undefined}
              className={cn('transition-colors hover:text-red', isSessionsActive && 'text-red')}
            >
              {t('nav.sessions')}
            </Link>
            {isAuthenticated && (
              <Link
                to="/sessions/mine"
                aria-current={isMyActive ? 'page' : undefined}
                className={cn('transition-colors hover:text-red', isMyActive && 'text-red')}
              >
                {t('nav.mySessions')}
              </Link>
            )}
            <Link to="/help" className="transition-colors hover:text-red">
              {t('nav.help')}
            </Link>
          </nav>

          {/* CTAs / UserMenu */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-4 py-2 text-sm font-bold transition-colors hover:bg-yellow/40"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="brutal-sm md:brutal-hover rounded-md bg-red px-4 py-2 text-sm font-bold text-background"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile header — sticky top */}
      <header className="sticky top-0 z-30 border-b-2 border-foreground/10 bg-background/95 px-4 pb-3 pt-4 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Matchplay — inicio">
            <span className="brutal-sm flex size-9 items-center justify-center rounded-md bg-red font-display text-lg font-black text-background">
              M
            </span>
            <span className="font-display text-xl font-black tracking-tight">
              matchplay
              <span className="text-red">.</span>
            </span>
          </Link>

          {isAuthenticated && user ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={menuOpen}
              className="rounded-full p-0.5"
            >
              <Avatar
                username={user.username}
                avatarCode={user.selectedAvatarCode}
                size={36}
                ringBrutal
              />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-yellow/40"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="brutal-sm rounded-md bg-red px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-background"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </header>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  )
}
