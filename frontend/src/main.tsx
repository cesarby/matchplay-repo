import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { I18nProvider } from '@/app/providers/I18nProvider'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { SeoProvider } from '@/app/providers/SeoProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'

import './styles/globals.css'

/**
 * MSW en browser solo si VITE_USE_MSW=true. Por defecto OFF (incluso en dev)
 * para que el frontend hable con el backend real.
 *
 * Los tests usan MSW vía Node ({@code src/mocks/server.ts}) y no se ven
 * afectados por esta flag.
 *
 * Si arrastras un service worker registrado de antes, deberás desregistrarlo
 * una vez: DevTools → Application → Service Workers → Unregister.
 */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MSW !== 'true') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <SeoProvider>
        <I18nProvider>
          <ThemeProvider>
            <QueryProvider>
              <App />
            </QueryProvider>
          </ThemeProvider>
        </I18nProvider>
      </SeoProvider>
    </StrictMode>,
  )
})
