# Frontend · Módulo Sessions — Spec

> Listado público, detalle, creación, participación y chat por partida. Fase 1 + 1.1 + chat MVP + editorial v3.

Referencia capa: [../spec.md](../spec.md) · Backend: [../../backend/modules/sessions-spec.md](../../backend/modules/sessions-spec.md)

---

## Propósito

Cubre tres pantallas y todos los flujos derivados:

1. **`/sessions`** — listado paginado con filtros (deep-linkable, alimentado por el QuickSearch de la landing).
2. **`/sessions/:id`** — detalle público con sección de jugadores, lista de espera, acciones contextuales y chat.
3. **`/sessions/new`** — formulario de creación (protegido). Incluye typeahead BGG, geo cascading y validación cliente.

Estos cuatro componentes shared se diseñaron para reutilizarse desde la landing y futuras vistas (perfil, mis partidas):

- `<SessionCard>` — card del listado con imagen del juego (top half), badges contextuales, progress bar de plazas y animación fade-up.
- `<SessionStatusBadge>` — píldora con i18n del status.
- `<Pagination>` — control de paginación circular con next destacado.
- `<GameTypeahead>` — búsqueda BGG con autocompletar (vive en `features/games/`).

## Diseño visual de `/sessions`

Aprobado en mockup `frontend/mockups/sessions-list-v3.html` (auth) y
`sessions-list-v3-anonymous.html` (sin auth). Resumen:

| Sección | Auth | Anónimo |
|---|---|---|
| Hero eyebrow | `"{count} partidas activas"` (rojo, uppercase tracking widest) | Idem |
| Hero H1 | "Encuentra tu **próxima mesa**" | "Explora **partidas abiertas**" |
| Hero subtitle | "Tu ubicación está prefiltrada. Cámbiala cuando quieras." | "Echa un vistazo a las próximas mesas. Para apuntarte o crear la tuya, necesitas una cuenta." |
| CTA hero | `Crear partida` (rojo, `animate-pulse-soft`, hover scale) | — (sin CTA en hero) |
| Hint debajo de filtros | — | Banner azul-soft con `Info` icon + link "Inicia sesión" |
| Cards listado | Iguales (listado es público) | Iguales |
| Banner CTA al final | — | Banda con "¿Te apetece organizar tu propia mesa?" + dos CTAs (Crear cuenta · Ya tengo cuenta) |
| Empty state CTA | `Organizar partida` → `/sessions/new` | `Crear cuenta gratis` → `/register` |

Decoración común del hero (con `aria-hidden`): tile rojo rotado a la
derecha, tile amarillo rotado abajo-derecha, dots foreground arriba-izquierda.

### `<SessionCard>` (shared)

- Altura `h-44` para la imagen del top half. Si `baseGameThumbnailUrl` está
  presente se renderiza `<img>` con `object-cover`; si no, gradiente
  determinístico por `bggId` (`FALLBACK_GRADIENTS`).
- Sobre la imagen: status badge (verde/rojo/azul con dot pulsing si OPEN)
  arriba-izquierda; badge de fecha contextual arriba-derecha (`urgent`
  rojo, `warning` amarillo, `info` azul-soft). **El badge de fecha incluye
  siempre la hora** (`"VIE · 29 MAY · 20:00"`) — `relativeDateLabel`
  añade `HH:mm` en todos los modos.
- Overlay `bg-gradient-to-t from-card via-card/30 to-transparent` para
  fundir la imagen con la card y dar legibilidad al título.
- Body: H3 Bricolage 2xl + juego (muted) + **pill `+N expansión/expansiones`**
  amarillo-soft junto al juego cuando `expansionCount > 0` (plural i18n) +
  meta inline (ubicación con icono verde, plazas con icono).
- Progress bar de plazas: `bg-green` con holgura, `from-green to-yellow`
  cuando queda ≤1 plaza, `bg-red` si llena.
- Microcopy: `"Solo 1 plaza"` (yellow) · `"3 plazas"` (green) · `"Plazas
  llenas · 2 en lista de espera"` (rojo+yellow).
- Hover: `-translate-y-1 hover:border-red hover:shadow-hover`, imagen
  `scale-110`, título → rojo.
- Animación: `animate-fade-up` con `animation-delay` calculado por el
  padre (`i * 80ms` para efecto secuencial).

### `<SessionFilters>` cards interactivas

- Cada filtro geo (Provincia / Ciudad / Zona) renderiza una "card-pill" con
  icono coloreado (azul=provincia, verde=ciudad, amarillo=zona) + label arriba
  + valor seleccionado abajo + chevron a la derecha.
- Por debajo, un `<select>` real con `appearance-none + absolute inset-0
  opacity-0` para conservar a11y (teclado, screen reader, mobile native picker).
- Cascading: cambiar provincia limpia ciudad/zona; cambiar ciudad limpia
  zona. Selects en cascada se deshabilitan visualmente con `opacity-50`.
- **Filtro de juego**: reutiliza `<GameTypeahead>` con `labelSrOnly` (mismo
  componente que `CreateSessionForm`). El placeholder + el icono de búsqueda
  comunican intención sin label visible. Sin filtro de expansión (out of scope
  para el listado).
- Grid `lg:grid-cols-4 lg:items-center` — 4 celdas del mismo ancho. El typeahead
  de juego no necesita doble columna (truncamiento del nombre seleccionado es
  aceptable, coherente con cómo trunca Zona).
- **Botón "Limpiar filtros"**: pill `bg-red-soft text-red`, hover → `bg-red
  text-white` + `scale-105`, icono `X` que rota 90° en hover. Texto dinámico
  con `count` y plural i18n: `"Limpiar 1 filtro"` / `"Limpiar 3 filtros"`.
  Solo aparece si hay ≥ 1 filtro activo.
- **Filtro de fecha**: eliminado en v1.2 (poca utilidad real, complicaba el
  layout). El backend sigue soportando `scheduledFrom`/`scheduledTo` por si
  hace falta más adelante.

### Animaciones registradas en `tailwind.config.ts`

```ts
keyframes: {
  fadeUp:    { from: { opacity: '0', transform: 'translateY(16px)' },
               to:   { opacity: '1', transform: 'translateY(0)' } },
  pulseSoft: { '0%,100%': { boxShadow: '0 8px 24px rgba(200,54,44,0.25)' },
               '50%':     { boxShadow: '0 8px 32px rgba(200,54,44,0.45)' } },
},
animation: {
  'fade-up':    'fadeUp 0.5s ease-out backwards',
  'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
}
```

### Helper `relativeDateLabel`

`shared/lib/relativeDateLabel.ts` devuelve `{ key, label, tone }` para
mostrar fecha contextual:

- hoy → `urgent` (rojo) → `"Hoy · 20:00"`
- mañana → `warning` (amarillo) → `"Mañana"`
- esta semana → `info` (azul-soft) → `"Vie · 21 nov"`
- más lejos → `info` → `"21 nov"`

---

## Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| Estado de filtros | URL (`useSearchParams`) | Compartible, deep-link desde landing, browser back funciona como se espera. |
| Hook helper | `useUrlFilters<T>()` en `shared/hooks/` | Lee/escribe params tipados; valores vacíos se eliminan del URL. |
| Naming params URL | `camelCase` (`provinceCode`, `cityCode`, `status`, `page`) | Mismo nombre que los del backend → mapping trivial. |
| Página default size | 20 (no exponer al usuario) | Coherente con backend. |
| Paginación | Page index 0-indexed alineado con Spring `Page` | Indicador "1/N" usa `page + 1`. |
| Game filter (texto libre) | **Deferred** | En v1 el `q` que pueda venir de la landing se conserva en URL pero no llega al backend. |
| Action buttons del detail | Contextuales por status + `yourRole` + `isOwner` | Ver tabla en sección "UX por estado". |
| Edit page (`/sessions/:id/edit`) | **Deferred** | Botón "Editar" enlaza, pero la página llega más adelante. |
| Form de creación | RHF + zod | Patrón ya consolidado en `RegisterForm`. |
| BGG typeahead | Debounce 300ms · enabled si q≥2 chars | `useDebouncedValue` en `shared/hooks/`. |
| Conversión datetime | `datetime-local` del input → `new Date(value).toISOString()` antes de mandar | Backend espera `Instant` (UTC). |
| Error mapping | `mapSessionError(err: ApiError)` → `{ channel: 'field' \| 'banner', i18nKey }` | Mismo patrón que `mapAuthError`. |
| i18n | Centralizada en `shared/i18n/locales/{es,en}.json` bajo `sessions.*` | **Prohibido** crear `features/sessions/locales/`. |

---

## Arquitectura del módulo

```
features/sessions/
├── pages/
│   ├── SessionsListPage.tsx
│   ├── SessionDetailPage.tsx
│   └── CreateSessionPage.tsx
├── components/
│   ├── SessionFilters.tsx          # filtros del listado
│   ├── SessionActions.tsx          # botones del detail según contexto
│   ├── SessionPlayerRow.tsx        # fila de jugador: variant player o guestOf (con avatar coloreado)
│   ├── CreatorActions.tsx          # acciones del creador (Editar + Cerrar mesa)
│   ├── EditSessionModal.tsx        # modal PATCH /sessions/{id}
│   ├── CloseSessionModal.tsx       # modal POST /sessions/{id}/close
│   ├── SessionExpansionsBlock.tsx  # bloque "Expansiones (N)" con accordion lazy
│   ├── GameCover.tsx               # imagen de portada BGG o placeholder
│   ├── GameCoverPlaceholder.tsx    # caja con gradient + icono Dices si no hay thumbnail
│   ├── SessionChatButton.tsx       # mini-card del sidebar (3 estados: null/outsider/activo)
│   ├── SessionChatDrawer.tsx       # drawer de chat con polling 20s
│   ├── ChatMessageRow.tsx          # fila de mensaje (mine vs ajeno, pending si id < 0)
│   ├── JoinCallToAction.tsx        # CTA full-width solo mobile
│   └── CreateSessionForm.tsx       # form RHF+zod
├── api/
│   ├── sessionsApi.ts              # 9 endpoints (añade close)
│   └── messagesApi.ts              # list, send, markRead
├── hooks/
│   ├── useSessions.ts              # queries + mutations + sessionKeys
│   └── useChatMessages.ts          # useChatMessagesQuery, useSendMessageMutation, useMarkChatReadMutation
├── lib/
│   └── errorMapping.ts             # códigos error.session.* → field|banner + i18n
├── types/
│   └── session.types.ts            # alineado con DTOs Java (incluye SessionMessage)
└── __tests__/                      # SessionFilters, SessionsListPage,
                                    # SessionDetailPage, CreateSessionForm
```

`<SessionCard>` y `<SessionStatusBadge>` viven en `shared/components/` porque también los usa la landing (preview hero) y los futuros módulos perfil / mis partidas.

---

## Types (alineados con backend)

```ts
export type SessionStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ParticipantRole = 'PLAYER' | 'WAITLIST'

export interface SessionMessage {
  id: number
  userId: number
  username: string
  content: string
  createdAt: string  // ISO Instant
}

export interface SessionSummary {
  id: number
  title: string
  baseGameId: number | null
  baseGameName: string | null
  /** Thumbnail BGG cacheado en backend (nullable si BGG no aporta). */
  baseGameThumbnailUrl: string | null
  cityCode: string | null
  cityName: string | null
  areaCode: string | null
  areaName: string | null
  scheduledAt: string  // ISO Instant
  maxPlayers: number
  registeredPlayers: number
  waitlistCount: number
  status: SessionStatus
  creatorId: number | null
  creatorUsername: string | null
}

export interface SessionPlayer {
  userId: number
  username: string
  name: string
  role: ParticipantRole
  position: number | null    // FIFO en cola; null para PLAYER
  joinedAt: string
}

export interface ExpansionSummary {
  bggId: number
  name: string
  thumbnailUrl: string | null
}

export interface SessionDetail extends Omit<SessionSummary, 'creatorId' | 'creatorUsername'> {
  description: string | null
  baseGameSummary: string | null    // resumen LLM del juego base, en el idioma activo
  creatorId: number | null
  creatorUsername: string | null
  creatorGuests: number             // acompañantes del creador (no usuarios registrados)
  chatUnreadCount: number | null    // null si outsider o anónimo; 0 si al día; N si N no leídos
  chatMessageCount: number | null   // null si sesión cerrada; 0 o N total de mensajes
  players: SessionPlayer[]
  expansions: ExpansionSummary[]
  yourRole: ParticipantRole | null
  createdAt: string
  updatedAt: string
}

export interface CreateSessionRequest {
  title: string
  description?: string | null
  baseGameId: number
  cityCode: string
  areaCode?: string | null
  scheduledAt: string
  maxPlayers: number
}

export interface UpdateSessionRequest {
  title?: string | null
  description?: string | null
  areaCode?: string | null
  scheduledAt?: string | null
  maxPlayers?: number | null
}

export interface ChangeStatusRequest { status: SessionStatus }

export interface SessionSearchParams {
  provinceCode?: string
  cityCode?: string
  areaCode?: string
  gameId?: number
  scheduledFrom?: string
  scheduledTo?: string
  status?: SessionStatus
  page?: number
  size?: number
}
```

---

## API client

`features/sessions/api/sessionsApi.ts`:

```ts
sessionsApi.search(params)       // GET    /sessions
sessionsApi.getById(id)          // GET    /sessions/{id}
sessionsApi.listPlayers(id)      // GET    /sessions/{id}/players
sessionsApi.create(body)         // POST   /sessions
sessionsApi.update(id, body)     // PATCH  /sessions/{id}
sessionsApi.changeStatus(id,b)   // PATCH  /sessions/{id}/status
sessionsApi.close(id)            // POST   /sessions/{id}/close
sessionsApi.join(id)             // POST   /sessions/{id}/join
sessionsApi.leave(id)            // DELETE /sessions/{id}/join
```

`features/sessions/api/messagesApi.ts`:

```ts
messagesApi.list(id, since?)   // GET  /sessions/{id}/messages[?since=ISO]  → SessionMessage[]
messagesApi.send(id, content)  // POST /sessions/{id}/messages              → SessionMessage (201)
messagesApi.markRead(id)       // POST /sessions/{id}/messages/mark-read    → 204
```

Paths **relativos a `baseURL`** del `httpClient` (que ya incluye `/api/v1`). Es un error
prefijar el path con `/api/v1/...` aquí (duplica el prefix). Patrón consistente con
`authApi` y `geoApi`.

---

## TanStack Query

`features/sessions/hooks/useSessions.ts`:

```ts
sessionKeys = {
  all: ['sessions'],
  lists: () => [...all, 'list'],
  list: (params) => [...lists(), params],
  details: () => [...all, 'detail'],
  detail: (id, lang) => [...details(), id, lang],  // lang = i18next.language
  players: (id) => [...detail(id), 'players'],
}

useSessionsQuery(params)              // staleTime 60s
useSessionDetailQuery(id)             // enabled si id es number, staleTime 30s; key incluye i18next.language → refetch al cambiar idioma
useSessionPlayersQuery(id)            // staleTime 15s (lighter polling)

useCreateSessionMutation()
useUpdateSessionMutation(id)
useChangeSessionStatusMutation(id)
useCloseSessionMutation(id)           // POST /sessions/{id}/close
useJoinSessionMutation(id)
useLeaveSessionMutation(id)
```

Las mutations comparten un helper `syncCacheFromDetail(qc, detail)` que:

1. `setQueryData(detail(id), detail)` — pinta la respuesta optimista en cache.
2. `invalidateQueries(lists())` — los listados pueden cambiar de orden o contenido.
3. `invalidateQueries(players(id))` — los players también si hubo join/leave.

`invalidateQueries` devuelve una `Promise` que **no se espera** (`void`) — fire-and-forget intencional.

`features/sessions/hooks/useChatMessages.ts`:

```ts
useChatMessagesQuery(sessionId, enabled)
// Polling cada 20s mientras enabled=true (drawer abierto).
// Query key incluye i18next.language (coherente con el resto del módulo).

useSendMessageMutation(sessionId, currentUser)
// Optimistic insert con id temporal negativo.
// Al success, reemplaza con el mensaje real devuelto por el backend.
// En error, rollback silencioso.

useMarkChatReadMutation(sessionId)
// Optimistic clear del badge chatUnreadCount a 0.
// Llama POST /sessions/{id}/messages/mark-read (204).
```

---

## SessionsListPage (`/sessions`)

```
┌────────────────────────────────────────────────────────────┐
│ Partidas                              [+ Crear partida]    │  ← CTA solo si auth
├────────────────────────────────────────────────────────────┤
│ [Provincia] [Ciudad] [Estado]            [Limpiar]         │  ← SessionFilters
├────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ Card 1  │  │ Card 2  │  │ Card 3  │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │  ← Grid de SessionCard
│  ...                                                       │
├────────────────────────────────────────────────────────────┤
│                       ‹  1/8  ›                            │  ← Pagination
└────────────────────────────────────────────────────────────┘
```

- **URL state**: lee `provinceCode`, `cityCode`, `areaCode`, `gameId`, `gameName`, `page` con `useUrlFilters`. **No** se envía `status`: el backend filtra por defecto a `OPEN + FULL` (sesiones accionables — apuntarse o waitlist). Ver `docs/backend/modules/sessions-spec.md` para la regla del default.
- **City disabled** hasta seleccionar provincia. Cambiar provincia limpia ciudad.
- **Cambio de filtro** vuelve a `page=0` (descarta `page` del URL).
- **Grid responsive**: 1 col mobile · 2 cols sm · 3 cols lg.
- **Estados UI**: skeleton (6 placeholders animados) · empty (mensaje + dashed border) · error (banner rojo + retry).

---

## SessionDetailPage (`/sessions/:id`)

Layout v3 (editorial refactor). Diseño 2-col en `sm+` para el header, 2-col en `lg+` para el cuerpo.

```
┌─────────────────────────────────────────────────────────────┐
│ [OPEN] [Apuntado / En cola #N]                              │  ← status + yourRole badges (sm+: en header)
│ ┌──────────┬──────────────────────────────────────────────┐ │
│ │ GameCover│ # Catan Night (font-display)                 │ │  ← header 2-col sm+
│ │ 160px    │ Catan (italic muted)                         │ │
│ │          │ Organiza @alice                              │ │
│ │          │ 📅 Hoy 20:00  📍 Madrid  👥 3/4 · 2 en cola │ │
│ │          │ [CreatorActions si isOwner]                  │ │
│ └──────────┴──────────────────────────────────────────────┘ │
│                                                             │
│ [Unirme a esta mesa — solo mobile, si aplica]               │  ← JoinCallToAction
├──────────────────────────────────┬──────────────────────────┤
│ MAIN                             │ SIDEBAR                  │
│                                  │                          │
│ ## Sobre Catan                   │ Apuntados (3/4)          │
│ Resumen LLM…                     │ ┌──────────────────────┐ │
│                                  │ │ (A) alice            │ │  ← avatar coloreado por inicial
│ ## Expansiones (N)               │ │ (B) bob              │ │
│ [accordion lazy]                 │ │ (C) carol            │ │
│                                  │ └──────────────────────┘ │
│ ## Descripción                   │                          │
│ Mesa nocturna…                   │ Lista de espera (2)      │
│                                  │ ┌──────────────────────┐ │
│                                  │ │ #1  eve              │ │
│                                  │ │ #2  frank            │ │
│                                  │ └──────────────────────┘ │
│                                  │                          │
│                                  │ [SessionChatButton]      │
│                                  │                          │
│                                  │ ──────────────────────── │
│                                  │ [SessionActions]         │
└──────────────────────────────────┴──────────────────────────┘
```

### UX por estado (matriz)

| status | rol del usuario | botones visibles |
|--------|-----------------|------------------|
| `OPEN` | anónimo | `Unirme` → `/login?from=...` |
| `OPEN` | apuntado nada | `Unirme` (entra como PLAYER) |
| `OPEN` | `PLAYER` | `Salir` |
| `OPEN` | `WAITLIST` | `Salir` (de la cola) |
| `OPEN` | creador | `<CreatorActions>`: Editar (siempre) + Cerrar mesa (solo si OPEN) |
| `FULL` | anónimo | `Unirme` → login |
| `FULL` | apuntado nada | `Unirme` (entra como WAITLIST) |
| `FULL` | `PLAYER`/`WAITLIST` | `Salir` |
| `FULL` | creador | `<CreatorActions>`: Editar (siempre) |
| `CANCELLED`/`COMPLETED` | * | — (sin acciones) |

`isOwner = currentUser.userId === session.creatorId`. Importante: el campo es `userId`,
no `id` (el `CurrentUser` del módulo auth usa `userId`).

`<CreatorActions>` se renderiza si `isOwner && status ∈ {OPEN, FULL}`. Vive en
`features/sessions/components/CreatorActions.tsx`. Contiene:

- **`<EditSessionModal>`** — abre al pulsar "Editar". Fecha (reutiliza `<SessionDateTimePicker>`)
  + maxPlayers (mín = `registeredPlayers`). Si hay waitlist muestra nota informativa.
  Submit → `PATCH /sessions/{id}` con `scheduledAt` + `maxPlayers`.
- **`<CloseSessionModal>`** — abre al pulsar "Cerrar mesa" (solo visible si `status === OPEN`).
  Confirmación cuyo copy varía según `waitlistCount > 0`. Submit → `POST /sessions/{id}/close`.

### Renderizado de detail

- 404 (ApiError.status === 404) → mensaje específico + SEO `noindex`.
- Otros errores → banner genérico.
- Players y waitlist se separan filtrando por `role` y ordenando waitlist por `position asc`.
- SeoHead con `canonical=/sessions/:id`.

**Header editorial (v3)**:

Layout 2-col en `sm+` (`grid-cols-[160px_1fr]`): `<GameCover>` izquierda, bloque de info derecha.
En mobile: stacked, cover centrado 144px.

El bloque de info incluye (de arriba abajo): badges de status + yourRole → H1 en `font-display` → nombre del juego en italic muted → "organiza @..." → meta vertical (fecha / ubicación / plazas) → `<CreatorActions>` si `isOwner`.

**Bloques del área principal** (en orden, de arriba abajo):

1. **Sobre {gameName}** — bloque con borde izquierdo amarillo y fondo `bg-yellow-soft/30`.
   Solo se renderiza si `baseGameSummary?.trim() && baseGameName`. Título i18n
   `sessions.detail.aboutGameHeading` ("Sobre {{game}}" / "About {{game}}").
2. **`<SessionExpansionsBlock>`** — renderiza "Expansiones (N)" / "Expansión (1)" (plural i18n)
   debajo del bloque "Sobre el juego". Cards horizontales clicables; solo una expandida a
   la vez (mutex). Click → dispara `useGameDetailQuery(bggId, enabled)` lazy → muestra
   summary del juego, o skeleton/error. `aria-expanded` + `aria-controls` vinculados.
3. **Descripción** — texto libre de la partida.

**CTA mobile — `<JoinCallToAction>`**:

Renderizado justo bajo el header, solo en `sm-` (`sm:hidden`). Devuelve `null` si:
sesión terminal, caller ya es participante, o no quedan plazas. Anónimo →
`<Link to="/login?next=/sessions/{id}">` con clave i18n `sessions.detail.joinLoginCta`.
Autenticado → `<button>` que dispara `useJoinSessionMutation`. Wrapper tiene `id="join-cta"`.

**Sidebar — filas de apuntados con avatar coloreado**:

Cada `<SessionPlayerRow>` muestra un círculo con la inicial mayúscula del username coloreado
por `pickAvatarColor(username)` (helper `shared/lib/avatarColor.ts`, determinístico, 6 clases
Tailwind). Las filas de waitlist incluyen el número de posición.

`<SessionPlayerRow>` acepta una API discriminada:

```ts
// variant jugador
{ player: SessionPlayer; showPosition?: boolean; guestOf?: never }
// variant acompañante (no requiere SessionPlayer)
{ guestOf: string; player?: never; showPosition?: never }
```

La fila `guestOf` muestra "+1 acompañante de @{creator}" en estilo muted
(`border-dashed bg-muted/30 italic`). No necesita pasar un player dummy.

**Sidebar — `<SessionChatButton>`**:

Mini-card del sidebar con 3 estados exclusivos (compara con `== null` loose para cubrir `undefined`):

1. `chatMessageCount == null` → no renderiza nada (sesión cerrada).
2. `chatUnreadCount == null` → caja muted dashed con `role="note"`, no clicable, opacity 70. Muestra conteo de mensajes + aviso "Apúntate para participar." (clave `sessions.chat.outsiderNotice`). No es un botón.
3. Caso base → card-banner clicable con icono `MessageSquare` + "CHAT" uppercase + conteo de mensajes + badge rojo si `chatUnreadCount > 0`. Click abre `<SessionChatDrawer>`.

**Sidebar — orden**:

Apuntados → Lista de espera (header siempre, body solo si `waitlistCount > 0`) → `<SessionChatButton>` → divider → `<SessionActions>`. En mobile el sidebar va al final de la página.

---

## Componentes de chat

### `<GameCover>` + `<GameCoverPlaceholder>`

`features/sessions/components/GameCover.tsx` / `GameCoverPlaceholder.tsx`.

- `<GameCover thumbnailUrl name>`: renderiza `<img object-cover>` si `thumbnailUrl` está presente; `<GameCoverPlaceholder>` si es `null`.
- `<GameCoverPlaceholder>`: caja `aspect-[3/4]` con gradient `from-yellow-soft to-red/10`, icono `Dices` de lucide-react y nombre del juego en `font-display` (2 líneas truncado). Sin imágenes externas.

### `<SessionChatDrawer>`

Drawer que se abre desde `<SessionChatButton>` (click). Montado en `SessionDetailPage`, controlado por estado local `chatOpen`.

- **Posición**: derecho, 420px en desktop (`sm+`), full-screen en mobile.
- **Apertura**: `useMarkChatReadMutation` se dispara al abrir (optimistic clear del badge). El drawer llama a `useChatMessagesQuery` con `enabled = open` para iniciar/parar el polling.
- **Polling**: cada 20 segundos mientras el drawer está abierto.
- **Lista de mensajes**: `<ChatMessageRow>` por cada mensaje. Auto-scroll inteligente: solo baja automáticamente si el usuario estaba cerca del fondo (no interrumpe si ha scrolleado arriba a leer historial).
- **Input**: `<textarea>` con autoresize hasta 3 líneas. `Enter` envía, `Shift+Enter` inserta newline. Límite 500 caracteres con contador `X/500` visible. Botón `Send` a la derecha.
- **Variante WAITLIST**: input y botón se ocultan completamente. Se muestra el aviso `sessions.chat.waitlistNotice`.
- **Cierre**: Escape, click en backdrop (`aria-hidden`, no duplica el botón), botón `×`.

### `<ChatMessageRow>`

Fila de mensaje individual.

- **Mine** (`message.userId === currentUser.userId`): alineado a la derecha, color de fondo propio.
- **Ajeno**: alineado a la izquierda, avatar coloreado con la inicial por `pickAvatarColor`.
- **Pending** (id < 0, insertado optimistamente): `opacity-60`. Al success, el id temporal se reemplaza con el id real. En error, rollback silencioso.

### `pickAvatarColor` helper

`shared/lib/avatarColor.ts`. `pickAvatarColor(username: string): string` devuelve una de 6 clases Tailwind de color de fondo de forma determinística (hash sobre el username). Aplicado en `<SessionPlayerRow>` (círculo inicial en sidebar) y en `<ChatMessageRow>` (avatar ajeno).

---

## CreateSessionPage (`/sessions/new`)

Ruta envuelta en `<ProtectedRoute>` — anónimos van a `/login?from=...`.

**Layout** (rediseño v1.4, mockup `create-session-redesign-B-preview.html` aprobado):

- Página: `mx-auto max-w-7xl px-4 sm:px-6` (mismo ancho que el listado público — consistencia visual entre pantallas).
- **Escritorio (`≥lg`)**: dos columnas con `lg:grid-cols-[1fr_400px]`. Form a la izquierda (panel-card), `<SessionLivePreview>` a la derecha (sticky).
- **Móvil**: el aside se apila debajo del form.
- Encabezado: eyebrow `"CREAR PARTIDA"` (rojo, uppercase, tracking widest) + h1 `"Prepara los detalles de tu mesa"` + pill animado `"● en vivo"` (solo `sm:+`).
- Form panel: `rounded-3xl border bg-card p-7` con sombra `shadow-warm`. Dentro, 4 secciones separadas por `border-b border-dashed border-border` (sin borde la última).

**Patrón de cada sección** (helper interno `<FormSection>`):

```
●  INFORMACIÓN                                   01 / 04
   [campos…]
- - - - - - - - - - - - - - - - - - - - - - - -
●  JUEGO                                         02 / 04
   …
```

- `●` dot 8px coloreado por sección: 1=red, 2=blue, 3=green, 4=yellow.
- Nombre en `font-display text-sm font-bold uppercase tracking-[0.08em]`.
- Contador a la derecha en `font-mono text-xs text-muted-foreground`.

**Form (RHF + zod):**

| Campo | Validación cliente | Componente |
|-------|--------------------|------------|
| `title` | `@NotBlank`, `Size(max 150)` | `TextField` |
| `description` | `Size(max 500)`, opcional, contador `n / 500` | `<textarea>` con `maxLength={500}` |
| `game` (BGG) + `expansions` | base requerido (Controller), N expansiones opcionales | `<GameWithExpansionsPicker>` |
| `provinceCode` | requerido | `SelectField` |
| `cityCode` | requerido, depende de provincia | `SelectField` (cascading) |
| `areaCode` | requerido, depende de ciudad | `SelectField` |
| `scheduledAt` | válido y futuro | `<SessionDateTimePicker>` (custom) |
| `maxPlayers` | `Min(2)`, `Max(20)`. Auto-rellena con `game.maxPlayers` al elegir juego. Label muestra `(min–max BGG)` | `TextField` type=number |
| `creatorGuests` | `Min(0)`. Max dinámico = `maxPlayers - 2`. **Cross-check estricto: `1 + creatorGuests < maxPlayers`** (debe quedar ≥1 plaza libre para otro jugador). Default 0. Sin helper text (label autodescriptivo). | `TextField` type=number |

> **Regla de producto**: todos los campos son obligatorios excepto
> `description`. Esto incluye `areaCode`.

**UX rules**:

1. **Prefill localización**: al montar, si el `useAuth().user` tiene `province/city/area`, se rellenan en cascada (con 3 `useEffect` gated por `citiesQuery.data` y `areasQuery.data` para esperar a que la opción exista en el `<select>` antes de hacer `setValue`).
2. **Plazas automáticas**: `useEffect` sobre `selectedGame.bggId` hace `setValue('maxPlayers', game.maxPlayers)` al cambiar el juego. Si BGG no aporta el dato (cooperativos), no toca.
3. **Descripción 0/500**: contador en vivo arriba del textarea (`aria-live="polite"`), pasa a `text-red` si excede.
4. **Picker fecha custom**: ver `<SessionDateTimePicker>` abajo.
5. **Acompañantes con regla "≥1 plaza libre"**: si `1 + creatorGuests ≥ maxPlayers`, el submit pre-bloquea con `setError('creatorGuests', ...)`. El backend tiene la misma validación con `error.session.guests.exceed.max`.
6. **Submit a través del publish bar**: el botón "Publicar partida" vive dentro de `<SessionLivePreview>` y es el `type="submit"` del form. No hay botón submit duplicado.

### `<GameWithExpansionsPicker>` (reusable, en `features/games/`)

Composición sobre `<GameTypeahead>` para el patrón "1 juego base + N expansiones del mismo base".

- **Sin base seleccionado** → `GameTypeahead` para el base.
- **Con base seleccionado** → card con thumbnail + nombre + año + jugadores + ✕. El input desaparece.
- **Si `baseGame.hasExpansions === true`** → aparece debajo un sub-buscador multi-select de expansiones del mismo base. Chips bajo el input con ✕ por chip. Las ya añadidas aparecen con check en el dropdown (click ignorado).
- **Cambiar/quitar base** → limpia silenciosamente todas las expansiones (regla de pertenencia: las expansiones están atadas al base).
- **Búsqueda de expansiones**: `gamesApi.search({ type: 'EXPANSION', baseGameId, size: 50 })`. El backend ignora `q` en este modo; el filtrado por texto se hace client-side sobre los resultados.

Tests cubren los 6 flujos clave (vacío, selección base, card, hasExpansions=false, quitar base limpia, chips ✕, dedupe).

### `<SessionLivePreview>` (en `features/sessions/components/`)

Componente del aside del create form. Construye un `SessionSummary` "fake"
desde el estado del form (`watch()`) y lo pasa a la **`SessionCard` real**
con `asStatic` para que no envuelva en `<Link>`. El usuario ve
exactamente cómo se verá su partida en el listado mientras la rellena —
cero duplicación de markup de card.

Props (todas opcionales salvo `maxPlayers` y `creatorGuests`):

```ts
interface SessionLivePreviewProps {
  title?: string
  baseGame?: GameSearchResult | null
  expansionCount: number
  cityName?: string
  areaName?: string
  scheduledAt?: string   // "YYYY-MM-DDTHH:mm"
  maxPlayers: number
  creatorGuests: number
  creator?: { userId: number; username: string } | null
  isPending?: boolean
}
```

**Empty-states**: cuando un campo no está, se sustituye por placeholder i18n
para que la card nunca se vea rota — `title` → `"Tu partida"`, `baseGameName`
→ `"Pendiente de elegir juego"`, `scheduledAt` → string inválida (el
`relativeDateLabel` devuelve `"—"`).

**Publish bar** (debajo de la card): card roja con `type="submit"` que ES el
submit del form. Texto pequeño "Todo listo" + título display "Publicar
partida" + pill blanco/20 con icono dado "Crear". Mientras `isPending`,
muestra "Publicando…" y se deshabilita con `cursor-wait opacity-80`.

**Banner azul-soft**: debajo del publish bar, mensaje contextual con
`publishHint` y pluralización por `count = spotsLeft`:

- 1 plaza: `"…hasta llenar la última plaza libre."`
- N plazas: `"…hasta llenar las {count} plazas libres."`

### `<SessionDateTimePicker>` (en `features/sessions/components/`)

Picker custom con calendario `react-day-picker` v10 + grid de slots de 30 min.

- **Trigger** botón con icono `CalendarDays` rojo + texto formateado (`"sáb 30 may 2026 · 20:00"` o `"Selecciona fecha y hora"`).
- **Popover**: calendario tematizado board-game-café + strip de 29 slots (08:00 → 22:00 en pasos de 30 min, 22:00 incluido) en grid de 6 cols.
- **Modificadores** vía `modifiersClassNames` (no `classNames` — v10 separa UI parts de modificadores): día seleccionado `!bg-red !text-white`, hoy `!bg-yellow-soft !border-yellow`, pasado `opacity-40 line-through`, fuera del mes `opacity-30`.
- **Valor controlado**: string `"YYYY-MM-DDTHH:mm"` (formato datetime-local) para mantener compatibilidad con el resto del form. Internamente parsea con `date-fns.parse`.
- **Locale español**, semana empieza en lunes (`weekStartsOn={1}`).
- **Cerrar**: botón "Hecho", click fuera, o Escape.

**Submit:**

1. zod parse local. Si falla → `setError` por campo.
2. Convierte `scheduledAt` (datetime-local, asumido en zona local) → `new Date(value).toISOString()`.
3. POST `/sessions` con `expansionBggIds: number[]` si hay expansiones.
4. Si éxito → `navigate('/sessions/:id')` con el id devuelto.
5. Si error backend:
   - Si trae `fieldErrors` (Bean Validation) → `setError` por cada campo.
   - Si no, usa `mapSessionError(err)`:
     - `channel: 'field'` → `setError(field, t(i18nKey))`.
     - `channel: 'banner'` → muestra banner global.

---

## Error mapping (`features/sessions/lib/errorMapping.ts`)

Mapea cada código `error.session.*` del backend a `{ channel, field?, i18nKey }`:

| Código backend | Channel | Field | Clave i18n FE |
|----------------|---------|-------|---------------|
| `error.session.scheduled.in.past` | field | `scheduledAt` | `sessions.errors.scheduledInPast` |
| `error.session.max.players.above.game` | field | `maxPlayers` | `sessions.errors.maxAboveGame` |
| `error.session.max.players.below.game.min` | field | `maxPlayers` | `sessions.errors.maxBelowGameMin` |
| `error.session.max.players.below.current` | field | `maxPlayers` | `sessions.errors.maxBelowCurrent` |
| `error.session.full` | banner | — | `sessions.errors.full` |
| `error.session.already.joined` | banner | — | `sessions.errors.alreadyJoined` |
| `error.session.join.own` | banner | — | `sessions.errors.joinOwn` |
| `error.session.not.owner` | banner | — | `sessions.errors.notOwner` |
| `error.session.not.participant` | banner | — | `sessions.errors.notParticipant` |
| `error.session.status.invalid.transition` | banner | — | `sessions.errors.invalidTransition` |
| `error.session.not.found` | banner | — | `sessions.errors.notFound` |
| (cualquier otro) | banner | — | `auth.errors.generic` |

---

## i18n

Claves bajo `sessions.*` en `shared/i18n/locales/{es,en}.json`:

```
sessions.status.{OPEN|FULL|IN_PROGRESS|COMPLETED|CANCELLED}
sessions.card.spots / waitlist / youArePlayer / youAreWaitlist / byCreator
sessions.list.{title, empty, loadMore}
sessions.filters.{province, city, area, game, from, to, status, apply, clear}
sessions.detail.{playersHeading, waitlistHeading, descriptionHeading, noDescription,
                 join, leave, cancelSession, closeRegistrations, reopenRegistrations, edit,
                 closeButton, aboutGameHeading, guestOf,
                 joinCta, joinLoginCta,
                 expansionsHeading_one, expansionsHeading_other,
                 expansionLoadError, expansionNoSummary}
sessions.chat.{title, headerTitle, inputPlaceholder, waitlistNotice, send, empty, loadError,
               sendError, unreadBadge_one, unreadBadge_other,
               totalMessages_zero, totalMessages_one, totalMessages_other,
               outsiderNotice}
sessions.edit.{title, scheduledAt, maxPlayers, waitlistNote, submit}
sessions.close.{title, confirmNoWaitlist, confirmWithWaitlist, submit}
sessions.create.{title, submit, submitting, fields.*}
sessions.errors.{required, tooLong, notFound, full, alreadyJoined, joinOwn,
                 notParticipant, notOwner, scheduledInPast, maxBelowCurrent,
                 maxAboveGame, maxBelowGameMin, invalidTransition, emptyCannotClose}
```

Key highlights:
- `sessions.detail.guestOf` — ES "+1 acompañante de @{{username}}" / EN "+1 guest of @{{username}}".
- `sessions.detail.aboutGameHeading` — ES "Sobre {{game}}" / EN "About {{game}}".
- `sessions.detail.joinCta` / `sessions.detail.joinLoginCta` — CTA mobile de unirse (auth y anónimo respectivamente).
- `sessions.detail.expansionsHeading_one/_other` — plural por count (ES "Expansión (1)" / "Expansiones (2)").
- `sessions.chat.outsiderNotice` — aviso en `<SessionChatButton>` cuando `chatUnreadCount == null` (outsider).
- `sessions.chat.unreadBadge_one/_other` — badge rojo en el drawer con cuenta de no leídos.
- `sessions.chat.totalMessages_zero/_one/_other` — conteo en la mini-card del sidebar.

`sessions.card.*` se usa también desde la landing (preview hero). No duplicar.

---

## Accesibilidad

- Skip-link sigue siendo del `MainLayout`.
- `SessionCard` con `<Link>` rodeando todo el card → focus visible + `aria-label={title}`.
- `<article>` para cada card y para el detalle.
- Headings: H1 único del detalle, H2 para sección PLAYERS / WAITLIST / Descripción.
- `<time dateTime={iso}>` para fechas.
- `Pagination` con `<nav aria-label="Paginación">` + botones con `aria-label`.
- `<SessionPlayerRow>` con `aria-label="Posición N"` en el badge cuando aplica.
- Color/contraste: badges con `text-foreground` sobre `bg-*-soft` (15:1 AAA garantizado).

---

## Tests

| Archivo | Cobertura | Tests |
|---------|-----------|-------|
| `SessionCard.test.tsx` (shared) | render, badges, link, asStatic | 8 |
| `SessionFilters.test.tsx` | cascading, clear, status, disabled | 7 |
| `SessionsListPage.test.tsx` | header, empty, data, URL→params, paginación, CTA por auth | 6 |
| `SessionDetailPage.test.tsx` | render, login CTA, join/leave por role, acciones owner, waitlist con position, cancel PATCH, hidden si CANCELLED, chat button estados (cerrado/outsider/activo), JoinCallToAction mobile | 8+ |
| `CreateSessionForm.test.tsx` | render campos, required, fecha pasada, submit OK con payload mapeado, error backend → field | 4 |

Total frontend del módulo: **33+ tests**.

---

## Pendientes / siguiente fase

- **MySessionsPage** + **Profile page** — referenciadas como "Próximamente" en el `<MobileMenu>`. Dependen de `GET /sessions/mine?scope=...` (backend Fase 2) y endpoints de perfil.
- **Confirmación al cancelar** — modal "¿Seguro?" antes del `changeStatus({ CANCELLED })`. Hoy es un click directo.
- **Toast de éxito** — al unirse / salir / enviar mensaje, mostrar feedback efímero. Requiere infra de toasts (no existe en v1).
- **Optimistic updates** en join/leave — mejora la sensación de respuesta. Hoy se espera la respuesta del backend.
- **Detail card de fecha** (mockup B+D guardado en `mockups/create-session-datepicker-B-D.html`) — card "billete" con número grande del día, día de semana y countdown. Pensada para el detalle de partida (visual informativo), no para crear/editar.
- **SSE / WebSocket** — el chat usa polling 20s. SSE o WebSocket mejoraría la latencia percibida (Fase 3).
- **Rate limit** en send mensaje — Bucket4j por usuario en backend (deferred, coordinado con backend Fase 2).
