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

## `<GameWithExpansionsPicker>` ✅ implementado

Composición de orden superior que envuelve `GameTypeahead` para resolver el caso
"1 juego base + N expansiones del mismo juego" con un solo componente. Es el patrón
que se reusará en **CreateSessionForm**, **SessionFilters**, y futuros formularios
de edición de partida o filtrado por juego.

### Propósito

Resolver de una vez:

1. Buscar y seleccionar **un** juego base.
2. Si el juego base tiene expansiones disponibles en BGG (`hasExpansions === true`),
   permitir añadir **varias** expansiones asociadas a ese juego.
3. Mostrar el estado de forma visualmente clara (card del juego base, chips de
   expansiones) ocupando el ancho completo del contenedor.

### Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| Cardinalidad juego base | **1** | No chips para el base; un único `value` controlado. |
| Cardinalidad expansiones | **N** | Array `expansions: GameSearchResult[]`. |
| Visibilidad input expansiones | Solo si `base.hasExpansions === true` | Si el backend no marca el juego con expansiones disponibles, el segundo input ni se renderiza. |
| Layout | **Full-width**, columnar | Ocupa todo el ancho del contenedor padre, igual que en `CreateSessionForm` hoy. |
| Vista del juego base seleccionado | **Card** con thumbnail + nombre + año + ✕ | El input de búsqueda se **oculta** mientras hay base. Vuelve al quitar. |
| Vista de expansiones | **Chips** debajo del input de expansión | Cada chip con nombre + ✕. El input sigue visible para añadir más. |
| Cambiar juego base | Limpia todas las expansiones **sin aviso** | Las expansiones son del juego base; un base nuevo invalida la lista anterior. |
| Filtrado de expansiones | `gamesApi.search({ type: 'EXPANSION', baseGameId: base.bggId })` | Solo se buscan expansiones del juego base seleccionado. |
| Duplicados | El dropdown marca con check las ya añadidas; click ignorado | Mismo patrón que `GameTypeahead` para el ya-seleccionado. |
| Resultados dropdown | Varios registros visibles (igual que `GameTypeahead`) | `size: 10`. |

### Props

```ts
interface GameWithExpansionsPickerProps {
  /** Juego base seleccionado (controlled). */
  baseGame: GameSearchResult | null
  onBaseGameChange: (game: GameSearchResult | null) => void

  /** Expansiones añadidas (controlled). */
  expansions: GameSearchResult[]
  onExpansionsChange: (expansions: GameSearchResult[]) => void

  /** Labels (i18n desde el consumidor). */
  baseLabel: string
  expansionsLabel: string

  /** Placeholders opcionales. */
  basePlaceholder?: string
  expansionPlaceholder?: string

  /** Errores opcionales bajo cada input. */
  baseError?: string
  expansionsError?: string
}
```

### Layout (de arriba a abajo)

```
┌─────────────────────────────────────────────────────────────┐
│ Juego                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Buscar juego...                                      │ │   ← solo si baseGame === null
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │   ← solo si baseGame !== null
│ │ [img]  Catan                                       ✕    │ │
│ │        1995 · 3–4 jugadores                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

   ↓ (solo si baseGame !== null && baseGame.hasExpansions === true)

┌─────────────────────────────────────────────────────────────┐
│ Expansiones                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Buscar expansión de Catan...                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [Seafarers ✕]  [Cities & Knights ✕]                         │   ← chips debajo
└─────────────────────────────────────────────────────────────┘
```

### Comportamiento

1. **Sin base** → solo el input de juego base visible.
2. **Selecciona base** → el input se reemplaza por una card con thumbnail + nombre + año + ✕ + (jugadores).
3. **Quitar base** (`✕`) → desaparece la card, vuelve el input, se limpian todas las expansiones (`onExpansionsChange([])`).
4. **Cambiar base** (no soportado mientras hay card; el usuario tiene que pulsar `✕` primero) → mismo flujo que quitar.
5. **Base con `hasExpansions === false`** → el bloque de expansiones no se renderiza en absoluto.
6. **Añadir expansión** → click en un resultado del dropdown → push al array. El input se mantiene listo para añadir otra (no se cierra automáticamente; se cierra al hacer click fuera).
7. **Quitar expansión** → click en `✕` del chip → splice del array. El orden se preserva.
8. **Ya añadida** → en el dropdown aparece con `Check` y el click es no-op (idéntico a `GameTypeahead`).

### Reutilización interna

El componente se compone:

- `GameTypeahead` (modo BASE) → reusado tal cual para el juego base, **pero con un nuevo prop opcional `renderMode: 'input' | 'card'`** que controla si el seleccionado se muestra como input rellenado (default, retrocompat) o como card (lo que usa el picker).
- Lista de expansiones renderizada inline (input + dropdown + chips). El input de expansiones puede ser una variante del mismo `GameTypeahead` con `multi: true` (TBD en implementación) o un componente propio `ExpansionMultiPicker` interno al picker.

> **Nota implementación:** evaluar si vale la pena extraer `ExpansionMultiPicker` como
> componente público (`features/games/components/`). Si solo lo usa el picker, mantener
> inline reduce superficie. Decidir al implementar.

### Casos de uso previstos

| Consumidor | Modo |
|------------|------|
| `CreateSessionForm` (Fase 1, hoy) | Reemplaza el `GameTypeahead` solo-base actual. El form ya guarda `bggId`; pasará a guardar también `expansionBggIds: number[]` (requiere backend; ver pendientes). |
| `SessionFilters` (futuro) | Filtra sesiones por juego base + opcionalmente alguna expansión. |
| `EditSessionForm` (futuro) | Mismo flujo que crear. |

### A11y

- Cada input mantiene el patrón a11y de `GameTypeahead` (label asociado, `aria-invalid`, `role="listbox"/option"`).
- La card del juego base seleccionado expone el ✕ con `aria-label="Quitar juego seleccionado"`.
- Cada chip de expansión: ✕ con `aria-label="Quitar {nombre}"`.
- Cuando se quita el base, el foco vuelve al input de juego (re-renderizado).

### Tests (a escribir junto a la implementación)

- Renderiza solo el input de base cuando `baseGame === null`.
- Tras seleccionar un base con `hasExpansions: true`, aparece el input de expansiones.
- Tras seleccionar un base con `hasExpansions: false`, **no** aparece el input de expansiones.
- Quitar el base limpia `expansions` (verificar `onExpansionsChange` llamado con `[]`).
- Añadir/quitar expansiones actualiza el array en el orden esperado.
- Las expansiones ya añadidas aparecen marcadas en el dropdown.
- `gamesApi.search` se llama con `type: 'EXPANSION'` y `baseGameId` correcto.

---

## Pendientes / siguiente fase

- **Teclado completo** en el dropdown (↑/↓/Enter/Escape) — requiere refactor a
  `react-aria`/`downshift`.
- **Cache compartida** con detalles de juego cuando se cree la página `/games/:id`.
- **Test unit** dedicado a `GameTypeahead` (hoy cubierto indirectamente por
  `CreateSessionForm.test.tsx` y `GameWithExpansionsPicker.test.tsx`).
- **`SessionFilters`** para usar el picker (filtrado por base + expansión cuando
  el backend lo soporte; v1 backend deferred).
