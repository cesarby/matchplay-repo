import {
  CalendarCheck,
  ChevronRight,
  Coins,
  Dices,
  HelpCircle,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Star,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Logo } from '@/shared/components/Logo'
import { cn } from '@/shared/lib/cn'
import { type Locale, useLocaleStore } from '@/shared/store/localeStore'
import { useThemeStore } from '@/shared/store/themeStore'

interface MobileMenuProps {
  onClose: () => void
}

/**
 * Menú móvil a pantalla completa con vibe board-game-café.
 *
 * <p>Sigue el mockup {@code mobile-menu-C-fullscreen.html}: decoración con
 * cuadrados rotados rojo/amarillo en las esquinas, saludo personalizado en
 * font-display, avatar grande con gradiente rotado -3°, items grandes tipo
 * card y footer compacto con toggle de idioma + logout.</p>
 *
 * <p>"Mis partidas" enlaza a {@code /sessions/mine}, "Mi perfil" a
 * {@code /profile} y "Ayuda" a {@code /help} cuando hay usuario autenticado.
 * "Mis mensajes" sigue deshabilitada con pill "Pronto" (Fase futura). El
 * toggle de "Modo oscuro" escribe al {@link useThemeStore} (mismo store que
 * usa el {@link UserMenu} de desktop).</p>
 */
export function MobileMenu({ onClose }: MobileMenuProps) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()
  const location = useLocation()

  // Cerrar SOLO cuando cambia la ruta (no en el mount inicial, que sería
  // un cierre inmediato apenas abrir el menú).
  const initialPath = useRef(location.pathname)
  useEffect(() => {
    if (location.pathname !== initialPath.current) {
      onClose()
    }
  }, [location.pathname, onClose])

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Bloquear scroll del body mientras esté abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const initial = (user?.username ?? '?').slice(0, 1).toUpperCase()
  const isSessionsActive = location.pathname === '/sessions'
  const isCreateActive = location.pathname.startsWith('/sessions/new')
  const isMyActive = location.pathname.startsWith('/sessions/mine')
  const isProfileActive = location.pathname.startsWith('/profile')
  const isHelpActive = location.pathname.startsWith('/help')
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.openMenu')}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background-alt p-5 md:hidden"
    >
      {/* Decoración: cuadrados rotados (replicando el mockup) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[-60px] top-[-60px] size-[220px] rotate-[15deg] rounded-[32px] bg-red opacity-[0.08]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-80px] left-[-40px] size-[180px] -rotate-12 rounded-[28px] bg-yellow opacity-15"
      />

      {/* Header del menú */}
      <div className="relative z-10 flex items-center justify-between">
        <Link to="/" aria-label="Matchplay — inicio">
          <Logo variant="text-only" className="h-9" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="inline-flex size-[42px] items-center justify-center rounded-xl border-[1.5px] border-border bg-card"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Bloque usuario (sólo si autenticado) */}
      {isAuthenticated && user && (
        <div className="relative z-10 mt-6 flex items-center gap-3.5">
          <div
            aria-hidden="true"
            className="inline-flex size-16 -rotate-3 items-center justify-center rounded-[20px] bg-gradient-to-br from-red to-yellow font-display text-[1.75rem] font-extrabold text-white shadow-lg"
          >
            {initial}
          </div>
          <div>
            <div className="font-display text-xl font-bold">
              {t('nav.greeting', { name: user.username })}
            </div>
            <div className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-semibold">
                <Star size={12} aria-hidden="true" className="text-yellow" />
                {user.ratingAvg.toFixed(1)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-semibold">
                <Coins size={12} aria-hidden="true" className="text-green" />
                {user.rewardPoints}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Items del menú */}
      <nav
        aria-label={t('nav.openMenu')}
        className="relative z-10 mt-6 flex flex-1 flex-col gap-2.5 overflow-y-auto"
      >
        <MenuItem
          to="/sessions"
          active={isSessionsActive}
          icon={<Dices size={20} aria-hidden="true" />}
          iconBg="bg-red-soft"
          iconColor="text-red"
        >
          {t('nav.sessions')}
        </MenuItem>

        {isAuthenticated && (
          <MenuItem
            to="/sessions/new"
            active={isCreateActive}
            icon={<Plus size={20} aria-hidden="true" />}
            iconBg="bg-yellow-soft"
            iconColor="text-yellow"
          >
            {t('nav.createSession')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <MenuItem
            to="/sessions/mine"
            active={isMyActive}
            icon={<CalendarCheck size={20} aria-hidden="true" />}
            iconBg="bg-green-soft"
            iconColor="text-green"
          >
            {t('nav.mySessions')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <MenuItem
            to="/profile"
            active={isProfileActive}
            icon={<UserIcon size={20} aria-hidden="true" />}
            iconBg="bg-blue-soft"
            iconColor="text-blue"
          >
            {t('nav.profile')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <MenuItem
            disabled
            icon={<MessageSquare size={20} aria-hidden="true" />}
            iconBg="bg-blue-soft"
            iconColor="text-blue"
            badge={t('common.comingSoon')}
          >
            {t('nav.messages')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <MenuItem
            to="/help"
            active={isHelpActive}
            icon={<HelpCircle size={20} aria-hidden="true" />}
            iconBg="bg-yellow-soft"
            iconColor="text-yellow"
          >
            {t('nav.help')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <DarkModeToggle
            theme={theme}
            onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        )}

        {!isAuthenticated && (
          <>
            <MenuItem
              to="/login"
              icon={<UserIcon size={20} aria-hidden="true" />}
              iconBg="bg-blue-soft"
              iconColor="text-blue"
            >
              {t('nav.login')}
            </MenuItem>
            <MenuItem
              to="/register"
              icon={<Plus size={20} aria-hidden="true" />}
              iconBg="bg-red-soft"
              iconColor="text-red"
            >
              {t('nav.register')}
            </MenuItem>
          </>
        )}
      </nav>

      {/* Footer: idioma + logout */}
      <div className="relative z-10 mt-4 flex items-center gap-2">
        <LanguageToggle />
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-red bg-red px-4 py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
          >
            <LogOut size={16} aria-hidden="true" />
            {t('nav.logout')}
          </button>
        ) : (
          <div className="flex-[1.4]" />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MenuItem · card grande con icono coloreado
// ---------------------------------------------------------------------------

interface MenuItemProps {
  to?: string
  active?: boolean
  disabled?: boolean
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  badge?: string
  children: React.ReactNode
}

function MenuItem({
  to,
  active = false,
  disabled = false,
  icon,
  iconBg,
  iconColor,
  badge,
  children,
}: MenuItemProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-[42px] shrink-0 items-center justify-center rounded-[11px]',
          active ? 'bg-white/10 text-white' : `${iconBg} ${iconColor}`,
        )}
      >
        {icon}
      </span>
      <span className="font-display text-[1.05rem] font-semibold">{children}</span>
      {badge && (
        <span
          className={cn(
            'ml-auto rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider',
            active ? 'bg-white/15 text-white/80' : 'bg-muted text-muted-foreground',
          )}
        >
          {badge}
        </span>
      )}
      {!badge && (
        <ChevronRight
          size={16}
          aria-hidden="true"
          className={cn('ml-auto', active ? 'text-white/50' : 'text-muted-foreground')}
        />
      )}
    </>
  )

  const className = cn(
    'flex items-center gap-[15px] rounded-2xl border-[1.5px] px-4 py-3.5 transition',
    active && 'border-foreground bg-foreground text-background',
    !active && !disabled && 'border-border bg-card hover:border-red',
    disabled && 'cursor-not-allowed border-border bg-card opacity-55',
  )

  if (disabled || !to) {
    return (
      <div className={className} aria-disabled={disabled || undefined}>
        {content}
      </div>
    )
  }

  return (
    <Link to={to} className={className} aria-current={active ? 'page' : undefined}>
      {content}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// DarkModeToggle · MenuItem-style con switch a la derecha
// ---------------------------------------------------------------------------

interface DarkModeToggleProps {
  theme: 'light' | 'dark'
  onToggle: () => void
}

function DarkModeToggle({ theme, onToggle }: DarkModeToggleProps) {
  const { t } = useTranslation()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      className="flex items-center gap-[15px] rounded-2xl border-[1.5px] border-border bg-card px-4 py-3.5 text-left transition hover:border-red"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-muted text-muted-foreground"
      >
        {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </span>
      <span className="font-display text-[1.05rem] font-semibold">{t('nav.darkMode')}</span>
      <span
        aria-hidden="true"
        className={cn(
          'ml-auto inline-block h-6 w-11 rounded-full transition',
          isDark ? 'bg-foreground' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'mt-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform',
            isDark ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// LanguageToggle · compacto, inline en el footer del menú
// ---------------------------------------------------------------------------

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
]

function LanguageToggle() {
  const { i18n } = useTranslation()
  const { locale, setLocale } = useLocaleStore()

  function handleChange(next: Locale) {
    setLocale(next)
    void i18n.changeLanguage(next)
  }

  return (
    <div
      role="group"
      aria-label="Cambiar idioma"
      className="inline-flex gap-1 rounded-xl bg-muted p-[3px]"
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => handleChange(code)}
          className={cn(
            'rounded-lg px-3 py-2 text-xs font-bold',
            locale === code ? 'bg-foreground text-background' : 'text-muted-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
