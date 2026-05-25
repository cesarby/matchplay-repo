# Frontend · Módulo Games — Spec

> Búsqueda BGG cliente. Hoy expone solo el typeahead que usa el form de crear partida;
> en fases siguientes crecerá con páginas de descubrimiento, juegos favoritos, etc.

Referencia capa: [../spec.md](../spec.md) · Backend: [../../backend/modules/games-spec.md](../../backend/modules/games-spec.md)

---

## Propósito

Encapsular el acceso al endpoint público `GET /api/v1/games` y proveer un componente
de UI reutilizable para que cualquier flujo de la app pueda **buscar y seleccionar** un
juego base de BoardGameGeek.

En la Fase 1 se consume desde:

- `features/sessions/components/CreateSessionForm` — autocompletar el campo `game` al crear una partida.

Casos futuros previstos:

- Vista de descubrimiento `/games` (ver juegos populares, expansiones, etc.).
- Selector de juegos favoritos en perfil.
- Filtro "por juego" en listados de partidas (hoy el listado solo filtra por `gameId` numérico — falta el UI).

---

## Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| Fuente de datos | Backend `GET /api/v1/games` | El backend cachea BGG; el cliente nunca llama BGG directamente. |
| Debounce | 300 ms en el input | Por `useDebouncedValue` en `shared/hooks/`. |
| Mínimo de caracteres | 2 | El backend ya rechaza < 2; el cliente además evita la llamada con `enabled`. |
| Tamaño de página típico | 10 (typeahead) | Tope backend = 50. El dropdown muestra los 10 primeros. |
| Tipo por defecto | `BASE` | `EXPANSION` requiere `baseGameId`; lo soporta el API pero no se usa todavía en el typeahead. |
| Selección | Devuelve el objeto completo `GameSearchResult` | El consumidor extrae `bggId` para mandar al backend. |
| Cacheo | TanStack Query `staleTime: 5 min`, `gcTime: 30 min` | Los resultados de BGG son estables. |
| i18n | Mensajes operativos (loading, vacío) usan claves comunes (`common.loading`, etc.) | Sin namespace propio en v1. |
| Cobertura tests | Implícita vía tests de `CreateSessionForm` (que ejercita el typeahead end-to-end con MSW). | Sin test unit dedicado a `GameTypeahead` aún. |

---

## Arquitectura del módulo

```
features/games/
├── api/
│   └── gamesApi.ts         # search(params): Promise<PageResponse<GameSearchResult>>
├── hooks/
│   └── useGames.ts         # useGamesSearchQuery(params)
├── components/
│   └── GameTypeahead.tsx   # combobox controlled
├── types/
│   └── game.types.ts       # GameSearchResult, GameSearchType
└── (pages/ — futuro)
```

---

## Types

```ts
export interface GameSearchResult {
  bggId: number
  name: string
  year: number | null
  minPlayers: number | null
  maxPlayers: number | null
  minPlayTimeMinutes: number | null
  maxPlayTimeMinutes: number | null
  thumbnailUrl: string | null
  imageUrl: string | null
  isExpansion: boolean
  hasExpansions: boolean
  baseGameBggId: number | null
}

export type GameSearchType = 'BASE' | 'EXPANSION'
```

Alineado 1:1 con `com.matchplay.game.dto.GameSearchResponse` del backend.

---

## API client

```ts
// features/games/api/gamesApi.ts
export interface GameSearchParams {
  q?: string
  type?: GameSearchType
  baseGameId?: number
  page?: number
  size?: number
}

gamesApi.search(params): Promise<PageResponse<GameSearchResult>>
```

Construye el query string omitiendo valores `undefined | null | ''`. Path **relativo**
a `baseURL` (`/games`, no `/api/v1/games`).

---

## TanStack Query

```ts
useGamesSearchQuery(params: GameSearchParams)
```

- `queryKey: ['games', 'search', params]` — el `params` participa, así que cambios de
  filtros generan caches separadas.
- `enabled` solo si `typeof params.q === 'string' && params.q.trim().length >= 2`.
- `staleTime: 5 min`, `gcTime: 30 min`.

---

## `<GameTypeahead>`

Combobox simple (no usa `downshift` ni `react-aria` por simplicidad de v1; se evaluará
si la a11y completa lo justifica).

### Props

```ts
interface GameTypeaheadProps {
  label: string
  value: GameSearchResult | null
  onChange: (game: GameSearchResult | null) => void
  error?: string
  placeholder?: string
  emptyText?: string
}
```

### Comportamiento

1. Input texto, controlado internamente (`query`).
2. `useDebouncedValue(query, 300)` → llamada al hook → dropdown con resultados.
3. Click en una opción → `onChange(game)` + cierra dropdown.
4. Botón **✕** (visible solo si hay `value`) → `onChange(null)` + vacía input.
5. Editar el input tras seleccionar → `onChange(null)` (perdemos selección porque el
   usuario está cambiando de juego).
6. Click fuera del wrapper (`mousedown`) → cierra dropdown.

### UI de cada opción

- Thumbnail si lo hay (placeholder `bg-muted` si no).
- Nombre `font-medium`.
- Año `(1995)` muted.
- Rango jugadores `3–4 jugadores` muted.
- Checkmark `text-green` si está seleccionado.

### A11y

- `<label>` asociado al input por `id` (con `useId`).
- `aria-invalid`, `aria-describedby` apuntando al error.
- `role="listbox"` sobre el dropdown, `role="option"` sobre cada item.
- `aria-selected` en la opción seleccionada.
- Botón limpiar con `aria-label="Limpiar selección"`.

**Limitación conocida v1**: no se gestiona navegación por teclado dentro del dropdown
(↑/↓ + Enter). El usuario puede tabular hasta los items con Tab.

---

## Pendientes / siguiente fase

- **Soporte EXPANSION** desde la UI (el API ya está). Solo se activará en el form de
  expansiones de partida, cuando se introduzca.
- **Teclado completo** en el dropdown (↑/↓/Enter/Escape) — requiere refactor a
  `react-aria`/`downshift`.
- **Cache compartida** con detalles de juego cuando se cree la página `/games/:id`.
- **Test unit** dedicado a `GameTypeahead` (hoy cubierto solo indirectamente).
