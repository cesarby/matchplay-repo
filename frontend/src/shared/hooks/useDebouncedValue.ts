import { useEffect, useState } from 'react'

/**
 * Devuelve el valor después de que haya estado quieto {@code delay} ms.
 * Útil para typeaheads, búsquedas reactivas, autosave.
 *
 * @example
 * const debounced = useDebouncedValue(query, 300)
 * useEffect(() => fetchResults(debounced), [debounced])
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])

  return debounced
}
