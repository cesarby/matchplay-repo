import { Outlet } from 'react-router-dom'

import { MobileTabBar } from './MobileTabBar'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/**
 * Layout principal. Renderiza el shell brutal global en TODAS las rutas:
 *
 * - `SiteHeader` brutal — auth-aware (CTAs login/register o UserMenu).
 * - `SiteFooter` brutal — 4 columnas + barra inferior.
 * - `MobileTabBar` sticky bottom — `md:hidden` interna.
 *
 * Tras F2.4 ya no hay caso especial para la landing: usa el mismo
 * SiteHeader y SiteFooter que el resto. El LandingHeader interno fue
 * eliminado en F2.4.
 */
export function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Skip-link a11y — invisible hasta recibir focus */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-blue"
      >
        Saltar al contenido
      </a>

      <SiteHeader />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />

      <MobileTabBar />
    </div>
  )
}
