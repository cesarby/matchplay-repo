import {
  CalendarCheck,
  ChevronRight,
  Coins,
  Dices,
  HelpCircle,
  LogOut,
  MessageSquare,
  Plus,
  Star,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Avatar } from '@/shared/components/Avatar'
import { cn } from '@/shared/lib/cn'
import { type Locale, useLocaleStore } from '@/shared/store/localeStore'

interface MobileMenuProps {
  onClose: () => void
}

/**
 * Menú móvil brutal a pantalla completa.
 *
 * Overlay full-screen con shell brutalismo lúdico: header con logo y X
 * brutal, bloque usuario con avatar `ringBrutal` y stats (rating/coins) en
 * chips brutales, items grandes tipo card con icono coloreado, footer con
 * toggle de idioma + logout.
 *
 * Funcionalidad conservada de la versión café:
 *  - Esc cierra (handler global).
 *  - Cambio de ruta cierra (initialPath ref).
 *  - Bloqueo de scroll del body.
 *  - aria-current="page" en el item activo.
 *  - "Mis mensajes" disabled con pill "Pronto" (fase futura).
 */
export function MobileMenu({ onClose }: MobileMenuProps) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()
  const location = useLocation()

  // Cerrar SOLO cuando cambia la ruta (no en el mount inicial).
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

  const isSessionsActive = location.pathname === '/sessions'
  const isCreateActive = location.pathname.startsWith('/sessions/new')
  const isMyActive = location.pathname.startsWith('/sessions/mine')
  const isProfileActive = location.pathname.startsWith('/profile')
  const isHelpActive = location.pathname.startsWith('/help')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.openMenu')}
      className="landing-bg fixed inset-0 z-50 flex flex-col overflow-hidden p-5 md:hidden"
    >
      {/* Decoración brutal: cuadrados rotados con borde ink */}
      <span
        aria-hidden="true"
        className="brutal pointer-events-none absolute right-[-60px] top-[-60px] size-[180px] rotate-[15deg] rounded-3xl bg-red opacity-[0.12]"
      />
      <span
        aria-hidden="true"
        className="brutal pointer-events-none absolute bottom-[-80px] left-[-40px] size-[160px] -rotate-12 rounded-3xl bg-yellow opacity-25"
      />

      {/* Header del menú: logo brutal + X */}
      <div className="relative z-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="Matchplay — inicio">
          <span className="brutal-sm flex size-9 items-center justify-center rounded-md bg-red font-display text-lg font-black text-background">
            M
          </span>
          <span className="font-display text-xl font-black tracking-tight">
            matchplay
            <span className="text-red">.</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="brutal-sm inline-flex size-[42px] items-center justify-center rounded-md bg-background"
        >
          <X size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* Bloque usuario (sólo si autenticado) */}
      {isAuthenticated && user && (
        <div className="relative z-10 mt-6 flex items-center gap-3.5">
          <Avatar
            username={user.username}
            avatarCode={user.selectedAvatarCode}
            size={56}
            ringBrutal
          />
          <div>
            <div className="font-display text-xl font-black">
              {t('nav.greeting', { name: user.username })}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-2 font-brutal text-[10px] uppercase tracking-widest">
              <span className="brutal-sm inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 font-bold">
                <Star size={11} aria-hidden="true" className="text-yellow" />
                {user.ratingAvg.toFixed(1)}
              </span>
              <span className="brutal-sm inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 font-bold">
                <Coins size={11} aria-hidden="true" className="text-green" />
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
          accent="red"
        >
          {t('nav.sessions')}
        </MenuItem>

        {isAuthenticated && (
          <MenuItem
            to="/sessions/new"
            active={isCreateActive}
            icon={<Plus size={20} aria-hidden="true" />}
            accent="yellow"
          >
            {t('nav.createSession')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <MenuItem
            to="/sessions/mine"
            active={isMyActive}
            icon={<CalendarCheck size={20} aria-hidden="true" />}
            accent="green"
          >
            {t('nav.mySessions')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <MenuItem
            to="/profile"
            active={isProfileActive}
            icon={<UserIcon size={20} aria-hidden="true" />}
            accent="blue"
          >
            {t('nav.profile')}
          </MenuItem>
        )}

        {isAuthenticated && (
          <MenuItem
            disabled
            icon={<MessageSquare size={20} aria-hidden="true" />}
            accent="blue"
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
            accent="yellow"
          >
            {t('nav.help')}
          </MenuItem>
        )}

        {!isAuthenticated && (
          <>
            <MenuItem to="/login" icon={<UserIcon size={20} aria-hidden="true" />} accent="blue">
              {t('nav.login')}
            </MenuItem>
            <MenuItem to="/register" icon={<Plus size={20} aria-hidden="true" />} accent="red">
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
            className="brutal brutal-press flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-red px-4 py-3.5 font-display text-sm font-bold text-background disabled:opacity-60"
          >
            <LogOut size={16} strokeWidth={2.5} aria-hidden="true" />
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
// MenuItem · card brutal con icono coloreado
// ---------------------------------------------------------------------------

type Accent = 'red' | 'yellow' | 'green' | 'blue'

const ACCENT_CLASSES: Record<Accent, { bg: string; text: string }> = {
  red: { bg: 'bg-red', text: 'text-background' },
  yellow: { bg: 'bg-yellow', text: 'text-foreground' },
  green: { bg: 'bg-green', text: 'text-background' },
  blue: { bg: 'bg-blue', text: 'text-background' },
}

interface MenuItemProps {
  to?: string
  active?: boolean
  disabled?: boolean
  icon: React.ReactNode
  accent: Accent
  badge?: string
  children: React.ReactNode
}

function MenuItem({
  to,
  active = false,
  disabled = false,
  icon,
  accent,
  badge,
  children,
}: MenuItemProps) {
  const accentClasses = ACCENT_CLASSES[accent]

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'brutal-sm inline-flex size-11 shrink-0 items-center justify-center rounded-lg',
          accentClasses.bg,
          accentClasses.text,
        )}
      >
        {icon}
      </span>
      <span className="font-display text-base font-bold">{children}</span>
      {badge && (
        <span
          className={cn(
            'brutal-sm ml-auto rounded-md px-2 py-0.5 font-brutal text-[10px] font-bold uppercase tracking-widest',
            active ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {badge}
        </span>
      )}
      {!badge && (
        <ChevronRight
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className={cn('ml-auto', active ? 'text-background' : 'text-muted-foreground')}
        />
      )}
    </>
  )

  const className = cn(
    'brutal flex items-center gap-3 rounded-xl px-4 py-3 transition-colors',
    active && 'bg-foreground text-background',
    !active && !disabled && 'bg-background hover:bg-yellow/40',
    disabled && 'cursor-not-allowed bg-background opacity-55',
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
      className="brutal inline-flex gap-1 rounded-xl bg-background p-1"
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() => handleChange(code)}
          className={cn(
            'rounded-lg px-3 py-2 font-brutal text-xs font-bold uppercase tracking-wider',
            locale === code ? 'bg-foreground text-background' : 'text-muted-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
