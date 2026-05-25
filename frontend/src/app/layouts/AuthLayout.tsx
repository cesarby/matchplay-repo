import { Outlet } from 'react-router-dom'

import { SiteHeader } from './SiteHeader'

/**
 * Layout para las pantallas de login/register.
 * Mismo header que el resto de la app para que el usuario pueda volver
 * al landing/sessions en cualquier momento, incluso si se equivocó al
 * pulsar "iniciar sesión".
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded bg-card p-8 shadow">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
