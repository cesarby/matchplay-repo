import { Outlet, useLocation } from 'react-router-dom'

import { MobileTabBar } from './MobileTabBar'
import { SiteHeader } from './SiteHeader'

/**
 * Layout principal. Mientras dura F1 del rediseño brutal, la landing (`/`)
 * provee SU PROPIO header (LandingHeader) y NO debe llevar el SiteHeader
 * café-style global. En F2 unificamos al header brutal y este caso especial
 * desaparece.
 *
 * Lo mismo con el footer: en mobile el lugar lo ocupa la MobileTabBar.
 * En desktop el footer global queda OCULTO en la landing (la landing
 * imprime su propio CTA final + tendrá footer brutal propio en F2).
 *
 * MobileTabBar es GLOBAL: aparece en TODAS las pantallas mobile (`md:hidden`),
 * incluida la landing. Se renderiza al final del layout para quedar sticky-
 * bottom sobre el contenido scrollable.
 */
export function MainLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Skip-link a11y — invisible hasta recibir focus */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-blue"
      >
        Saltar al contenido
      </a>

      {!isLanding && <SiteHeader />}

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      {!isLanding && (
        <footer className="hidden border-t bg-card py-4 text-center text-sm text-muted-foreground md:block">
          © {new Date().getFullYear()} Matchplay
        </footer>
      )}

      <MobileTabBar />
    </div>
  )
}
