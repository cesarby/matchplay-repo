import { ChevronDown, HelpCircle, Languages, LogOut, MessageSquare, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation'
import { Avatar } from '@/shared/components/Avatar'
import { cn } from '@/shared/lib/cn'

const SUPPORTED_LANGS = ['es', 'en'] as const

/**
 * Dropdown brutal del usuario autenticado.
 *
 * Trigger: avatar `ringBrutal` + nombre + chevron, en píldora hover yellow.
 * Items: Mi perfil, Mis mensajes (próximamente, disabled), Ayuda, toggle de
 *   idioma, Cerrar sesión en rojo brutal.
 *
 * Esc/click fuera cierran. Toggle de idioma NO cierra el menú (acción
 * inline).
 */
export function UserMenu() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()
  const navigate = useNavigate()
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
          'transition-colors hover:bg-yellow/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue',
        )}
      >
        <Avatar
          username={user.username}
          avatarCode={user.selectedAvatarCode}
          size={32}
          ringBrutal
        />
        <span className="hidden text-sm font-bold uppercase tracking-wider md:inline">
          {user.username}
        </span>
        <ChevronDown size={14} strokeWidth={2.5} className="text-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('nav.userMenuLabel')}
          className="brutal absolute right-0 top-full z-50 mt-2 w-72 rounded-xl bg-background py-1.5"
        >
          <MenuItem icon={<User size={16} />} onClick={() => handleNavigateAndClose('/profile')}>
            {t('nav.profile')}
          </MenuItem>
          <MenuItem icon={<MessageSquare size={16} />} disabled>
            {t('nav.messages')}
            <span className="brutal-sm ml-auto rounded bg-muted px-1.5 py-0.5 font-brutal text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('common.comingSoon')}
            </span>
          </MenuItem>
          <MenuItem icon={<HelpCircle size={16} />} onClick={() => handleNavigateAndClose('/help')}>
            {t('nav.help')}
          </MenuItem>

          {/* Idioma toggle — no cierra el menú */}
          <div className="flex items-center gap-3.5 border-t-2 border-foreground/10 px-3.5 py-2.5 text-sm">
            <Languages size={16} className="text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{t('nav.language')}</span>
            <div className="ml-auto flex gap-1">
              {SUPPORTED_LANGS.map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => i18n.changeLanguage(lng)}
                  className={cn(
                    'brutal-sm rounded-md px-2 py-0.5 font-brutal text-[11px] font-bold uppercase tracking-wider transition-colors',
                    i18n.language === lng
                      ? 'bg-foreground text-background'
                      : 'bg-background text-foreground hover:bg-yellow/40',
                  )}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Logout — rojo brutal */}
          <button
            type="button"
            role="menuitem"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(
              'flex w-full items-center gap-3.5 border-t-2 border-foreground/10 px-3.5 py-3 text-left text-sm font-bold',
              'text-red transition-colors hover:bg-red hover:text-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <LogOut size={16} strokeWidth={2.5} aria-hidden="true" />
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
        'flex w-full items-center gap-3.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors',
        disabled ? 'cursor-not-allowed italic text-muted-foreground' : 'hover:bg-yellow/30',
      )}
    >
      <span className={cn('text-muted-foreground', disabled && 'opacity-50')}>{icon}</span>
      {children}
    </button>
  )
}
