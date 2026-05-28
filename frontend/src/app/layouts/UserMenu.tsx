import {
  ChevronDown,
  HelpCircle,
  Languages,
  LogOut,
  MessageSquare,
  Moon,
  Sun,
  User,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Avatar } from '@/shared/components/Avatar'
import { useTheme } from '@/shared/hooks/useTheme'
import { cn } from '@/shared/lib/cn'

const SUPPORTED_LANGS = ['es', 'en'] as const

/**
 * Dropdown del usuario autenticado. Trigger: avatar + nombre (oculto en <md).
 * Items: Mi perfil, Mis mensajes (próx), Ayuda, Idioma toggle, Modo oscuro,
 * Cerrar sesión. Esc/click fuera cierran. Toggle de idioma/tema NO cierra.
 *
 * <p>El toggle de modo oscuro usa {@link useTheme} con persistencia real
 * en localStorage (clave {@code matchplay-theme}).</p>
 */
export function UserMenu() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!isAuthenticated || !user) return null

  function handleNavigateAndClose(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-full p-1 pr-2',
          'transition hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
        )}
      >
        <Avatar username={user.username} avatarCode={user.avatarCode} size={32} />
        <span className="hidden text-sm font-medium md:inline">{user.username}</span>
        <ChevronDown size={12} className="text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('nav.userMenuLabel')}
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-72',
            'rounded-xl border border-black/5 bg-white py-1.5',
            'shadow-[0_12px_32px_rgba(0,0,0,0.14)]',
          )}
        >
          <MenuItem icon={<User size={16} />} onClick={() => handleNavigateAndClose('/profile')}>
            {t('nav.profile')}
          </MenuItem>
          <MenuItem icon={<MessageSquare size={16} />} disabled>
            {t('nav.messages')}
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('common.comingSoon')}
            </span>
          </MenuItem>
          <MenuItem icon={<HelpCircle size={16} />} onClick={() => handleNavigateAndClose('/help')}>
            {t('nav.help')}
          </MenuItem>

          {/* Idioma toggle */}
          <div className="flex items-center gap-3.5 px-3.5 py-2 text-sm">
            <Languages size={16} className="text-muted-foreground" aria-hidden="true" />
            <span>{t('nav.language')}</span>
            <div className="ml-auto flex gap-1">
              {SUPPORTED_LANGS.map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => i18n.changeLanguage(lng)}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-semibold transition',
                    i18n.language === lng
                      ? 'border-foreground bg-foreground text-white'
                      : 'border-black/10 bg-transparent text-muted-foreground',
                  )}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Modo oscuro toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center gap-3.5 px-3.5 py-2 text-left text-sm hover:bg-foreground/5"
          >
            {theme === 'dark' ? (
              <Sun size={16} className="text-muted-foreground" />
            ) : (
              <Moon size={16} className="text-muted-foreground" />
            )}
            <span>{t('nav.darkMode')}</span>
            <span
              className={cn(
                'ml-auto inline-block h-5 w-9 rounded-full transition',
                theme === 'dark' ? 'bg-foreground' : 'bg-muted',
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  'mt-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  theme === 'dark' ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>

          {/* Logout */}
          <button
            type="button"
            role="menuitem"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(
              'flex w-full items-center gap-3.5 border-t border-black/5 px-3.5 pb-2 pt-3 text-left text-sm',
              'text-[#C8362C] transition hover:bg-[rgba(200,54,44,0.06)]',
            )}
          >
            <LogOut size={16} aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}

function MenuItem({ icon, onClick, disabled, children }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3.5 px-3.5 py-2 text-left text-sm transition',
        disabled ? 'cursor-not-allowed italic text-muted-foreground' : 'hover:bg-foreground/5',
      )}
    >
      <span className={cn('text-muted-foreground', disabled && 'opacity-50')}>{icon}</span>
      {children}
    </button>
  )
}
