import { Outlet } from 'react-router-dom'

import { SiteHeader } from './SiteHeader'

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

      <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Matchplay
      </footer>
    </div>
  )
}
