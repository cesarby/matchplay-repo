import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Header brutal interno de la landing. Reemplaza al `SiteHeader` global
 * mientras dura F1 — en F2 se unificará y este componente desaparecerá.
 *
 * Desktop: container brutal con logo, nav inline (4 anchors) y botones CTAs.
 * Mobile: sticky con logo + CTAs "Entrar" / "Crear cuenta" — sin hamburger
 *   (la MobileTabBar inferior cubre la navegación, así que el header solo
 *   ofrece las acciones de auth).
 */
export function LandingHeader() {
  const { t } = useTranslation()

  return (
    <>
      {/* Desktop header — container brutal centrado */}
      <header className="hidden px-6 pt-6 md:block">
        <div className="brutal mx-auto flex max-w-7xl items-center justify-between rounded-2xl bg-background px-6 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Matchplay — inicio">
            <span className="brutal-sm flex size-10 items-center justify-center rounded-md bg-red font-display text-xl font-black text-background">
              M
            </span>
            <span className="font-display text-2xl font-black tracking-tight">
              matchplay
              <span className="text-red">.</span>
            </span>
          </Link>

          <nav
            className="flex items-center gap-8 text-sm font-bold uppercase tracking-wider"
            aria-label={t('landing.nav.ariaLabel')}
          >
            <a href="#how" className="transition-colors hover:text-red">
              {t('landing.nav.explore')}
            </a>
            <a href="#how" className="transition-colors hover:text-red">
              {t('landing.nav.how')}
            </a>
            <a href="#community" className="transition-colors hover:text-red">
              {t('landing.nav.community')}
            </a>
            <Link to="/help" className="transition-colors hover:text-red">
              {t('landing.nav.help')}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-4 py-2 text-sm font-bold transition-colors hover:bg-yellow/40"
            >
              {t('landing.nav.login')}
            </Link>
            <Link
              to="/register"
              className="brutal-sm md:brutal-hover rounded-md bg-red px-4 py-2 text-sm font-bold text-background"
            >
              {t('landing.nav.signup')}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile header — sticky top, logo + 2 CTAs (sin hamburger) */}
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

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-yellow/40"
            >
              {t('landing.nav.login')}
            </Link>
            <Link
              to="/register"
              className="brutal-sm rounded-md bg-red px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-background"
            >
              {t('landing.nav.signup')}
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}
