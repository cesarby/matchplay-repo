import { useEffect, useState } from 'react'

const KEY = 'matchplay-theme'
type Theme = 'light' | 'dark'

function readInitial(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

/**
 * Hook para leer/cambiar el tema. Persiste en `localStorage` bajo `matchplay-theme`.
 * Aplica `class="dark"` al `<html>` cuando theme === 'dark'.
 *
 * Para evitar el flash de "tema claro luego oscuro" en boot, ejecutar
 * {@link initThemeEarly} en main.tsx antes del render.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitial)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(next: Theme) {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
    setThemeState(next)
  }

  return { theme, setTheme }
}

/**
 * Llamar lo antes posible (main.tsx) antes del primer render para evitar
 * flash de contenido sin la class `dark` aplicada.
 */
export function initThemeEarly() {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark') document.documentElement.classList.add('dark')
  } catch {
    /* ignore */
  }
}
