import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Lee filtros tipados desde `?param=value` y devuelve un setter que
 * actualiza el URL sin perder otros params no controlados.
 *
 * Convención: cualquier valor `''`, `null` o `undefined` se elimina del URL.
 *
 * @example
 * const { filters, setFilters } = useUrlFilters<{
 *   provinceCode?: string
 *   page?: string
 * }>()
 * filters.provinceCode      // 'MAD' | undefined
 * setFilters({ provinceCode: 'BCN', page: undefined })
 */
export function useUrlFilters<T extends Record<string, string | undefined>>() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<T>(() => {
    const obj: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      obj[key] = value
    })
    return obj as T
  }, [searchParams])

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === '') {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(
    (keys?: (keyof T)[]) => {
      setSearchParams(
        (prev) => {
          if (!keys) return new URLSearchParams()
          const next = new URLSearchParams(prev)
          keys.forEach((k) => next.delete(String(k)))
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  return { filters, setFilters, clearFilters }
}
