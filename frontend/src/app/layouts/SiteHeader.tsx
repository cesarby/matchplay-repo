import { Dices } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Avatar } from '@/shared/components/Avatar'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { Logo } from '@/shared/components/Logo'
import { cn } from '@/shared/lib/cn'

import { MobileMenu } from './MobileMenu'
import { UserMenu } from './UserMenu'

/**
 * Header común a todas las pantallas (Main + Auth).
 *
 * <p><strong>Desktop ({@code md:} y superior)</strong>: layout de 3 zonas
 * con flex-1 cada una para centrar el item central:</p>
 * <pre>
 *   [ logo ]              [ Partidas ]              [ idioma · usuario · logout ]
 * </pre>
 *
 * <p><strong>Móvil ({@code &lt; md})</strong>: solo logo + botón hamburguesa
 * estilo dado que abre {@link MobileMenu} a pantalla completa.</p>
 */
export function SiteHeader() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isMyActive = location.pathname.startsWith('/sessions/mine')
  const isSessionsActive = location.pathname.startsWith('/sessions') && !isMyActive

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Izquierda: logo */}
          <div className="flex flex-1 items-center md:flex-1">
            <Link to="/" aria-label="Matchplay — inicio">
              <Logo variant="text-only" className="h-9 md:h-10" />
            </Link>
          </div>

          {/* Centro (sólo desktop): Partidas · Mis partidas */}
          <nav
            className="hidden flex-1 items-center justify-center gap-2 text-sm md:flex"
            aria-label="Principal"
          >
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
            {isAuthenticated && (
              <Link
                to="/sessions/mine"
                aria-current={isMyActive ? 'page' : undefined}
                className={cn(
                  'rounded-full px-4 py-1.5 transition',
                  isMyActive
                    ? 'bg-green-soft font-semibold text-green'
                    : 'font-medium text-foreground hover:bg-muted',
                )}
              >
                {t('nav.mySessions')}
              </Link>
            )}
          </nav>

          {/* Derecha desktop: usuario · menú o login/register · idioma */}
          <div className="hidden flex-1 items-center justify-end gap-3 text-sm md:flex">
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <>
                <Link to="/login" className="text-foreground hover:underline">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="font-medium text-red hover:underline">
                  {t('nav.register')}
                </Link>
                <LanguageSwitcher />
              </>
            )}
          </div>

          {/* Trigger móvil: avatar si autenticado, burger estilo dado si anónimo */}
          {isAuthenticated && user ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={menuOpen}
              className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-full p-0.5 ring-2 ring-foreground/10 transition hover:ring-foreground/20 md:hidden"
            >
              <Avatar username={user.username} avatarCode={user.selectedAvatarCode} size={36} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={menuOpen}
              className="relative inline-flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-md md:hidden"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-1 rounded-lg border-[1.5px] border-white/20"
              />
              <Dices size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  )
}
