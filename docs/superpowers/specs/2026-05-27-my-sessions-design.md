# Mis sesiones — Design

**Fecha**: 2026-05-27
**Estado**: Borrador para aprobación
**Ámbito**: nueva página `/sessions/mine` con 4 tabs (Creadas / Apuntado / En cola / Historial) para que el usuario autenticado vea sus propias partidas, y duplicación rápida desde el historial.

## Contexto

El menú móvil (`MobileMenu.tsx`) ya tiene un ítem "Mis partidas" deshabilitado con badge "Próximamente". Esta feature lo activa y le da contenido.

El listado público (`/sessions`) sirve para descubrir; "Mis partidas" sirve para gestionar lo propio: ver de un vistazo qué he creado, dónde estoy apuntado, en qué cola estoy, y poder duplicar partidas pasadas con un click para ahorrar tiempo organizando.

## Reglas de producto

- **Auth obligatoria**: anónimos no acceden (`/sessions/mine` redirige a `/login?next=/sessions/mine`).
- **4 tabs** (visibles siempre, sticky al scrollear):
  - **Creadas por mí**: soy el creador, status `OPEN | FULL | IN_PROGRESS`. Orden `scheduledAt ASC`.
  - **Apuntado**: figuro en `session_participants` con role `PLAYER`, status activo. Orden `scheduledAt ASC`.
  - **En lista de espera**: figuro como `WAITLIST`, status activo. Orden `scheduledAt ASC`.
  - **Historial**: creadas por mí en status `COMPLETED | CANCELLED`. Orden `scheduledAt DESC`.
- **Counters** en cada tab (`Apuntado (3)`): visibles siempre para que el user vea de un vistazo dónde tiene cosas sin entrar a tabs vacíos.
- **Duplicar** desde historial: precarga `CreateSessionPage` con `título, descripción, juego base, expansiones, ubicación, maxPlayers`. **NO** precarga `scheduledAt` (queda vacío para que el user fije nueva fecha) ni `creatorGuests` (queda en 0). Todos los campos son editables como en una creación normal.

## Backend

### Endpoint nuevo

```
GET /api/v1/me/sessions
```

Requiere autenticación. 401 si anónimo. Query params:

| Param | Valores | Default |
|---|---|---|
| `tab` | `CREATED \| PLAYER \| WAITLIST \| HISTORY` | `CREATED` |
| `page` | int >= 0 | `0` |
| `size` | int 1..50 | `20` |

### Response

```java
public record MySessionsResponse(
    PageResponse<SessionSummaryResponse> items,
    TabCounts counts
) {}

public record TabCounts(
    long created,
    long player,
    long waitlist,
    long history
) {}
```

Los 4 counts SIEMPRE van populados en cada respuesta (4 `SELECT COUNT(*)` indexed, cheap). Los counts respetan el mismo filtro de status por tab (los activos solo cuentan no-terminales, history solo terminales). Esto permite al frontend pintar los badges sin un segundo round-trip.

### Cambio en `SessionSummaryResponse`

Añadir campo nullable `List<String> expansionNames`:

```java
public record SessionSummaryResponse(
    // ... todos los campos actuales
    int expansionCount,
    List<String> expansionNames  // NUEVO — null/omitido en listado público; populado en HISTORY tab
) {}
```

- En el listado público (`GET /sessions`) → `null` (no necesario, ahorra payload).
- En `GET /me/sessions?tab=HISTORY` → populado con los nombres de las expansiones de cada partida.
- En `GET /me/sessions?tab=CREATED|PLAYER|WAITLIST` → `null` (solo se usa en la tabla del historial).

**Importante** (regla del proyecto en `CLAUDE.md`): `SessionSummaryResponse` se construye posicionalmente en tests. Al añadir este campo hay que actualizar TODOS los `new SessionSummaryResponse(...)` en `**/test/**` con `null` en la posición correcta. Grep antes de cerrar.

### Service nuevo

```
backend/src/main/java/com/matchplay/session/service/MySessionsService.java
                                                    /MySessionsServiceImpl.java
```

Un único método:

```java
public interface MySessionsService {
    MySessionsResponse findMine(Tab tab, Pageable pageable);
    enum Tab { CREATED, PLAYER, WAITLIST, HISTORY }
}
```

Implementación usa `JpaSpecificationExecutor<GameSession>` para construir el filtro por tab. Reusa `GameSessionSpecifications` existente para los filtros de status.

Pseudocódigo del filtro:

```java
Long userId = currentUserProvider.requireCurrentUserId();
Specification<GameSession> spec = switch (tab) {
    case CREATED -> creatorIs(userId).and(statusIn(OPEN, FULL, IN_PROGRESS));
    case HISTORY -> creatorIs(userId).and(statusIn(COMPLETED, CANCELLED));
    case PLAYER -> participantIs(userId, ParticipantRole.PLAYER).and(statusIn(OPEN, FULL, IN_PROGRESS));
    case WAITLIST -> participantIs(userId, ParticipantRole.WAITLIST).and(statusIn(OPEN, FULL, IN_PROGRESS));
};
Sort sort = (tab == HISTORY) ? Sort.by("scheduledAt").descending() : Sort.by("scheduledAt").ascending();
Page<GameSession> page = sessionRepository.findAll(spec, pageable.withSort(sort));

// Counts
TabCounts counts = new TabCounts(
    sessionRepository.count(creatorIs(userId).and(activeStatus())),
    sessionRepository.count(participantIs(userId, PLAYER).and(activeStatus())),
    sessionRepository.count(participantIs(userId, WAITLIST).and(activeStatus())),
    sessionRepository.count(creatorIs(userId).and(terminalStatus()))
);

// Map a SessionSummaryResponse. Si tab == HISTORY, popular expansionNames.
List<SessionSummaryResponse> items = page.getContent().stream()
    .map(s -> mapper.toSummary(s, /* withExpansionNames= */ tab == HISTORY))
    .toList();
```

Las dos `Specification` nuevas (`creatorIs(userId)`, `participantIs(userId, role)`) van en `GameSessionSpecifications`.

`participantIs` usa subquery `EXISTS` en `session_participants`:

```java
public static Specification<GameSession> participantIs(Long userId, ParticipantRole role) {
    return (root, query, cb) -> {
        Subquery<Long> sub = query.subquery(Long.class);
        Root<SessionParticipant> p = sub.from(SessionParticipant.class);
        sub.select(p.get("id"))
           .where(cb.equal(p.get("session"), root),
                  cb.equal(p.get("user").get("id"), userId),
                  cb.equal(p.get("role"), role));
        return cb.exists(sub);
    };
}
```

### Controller nuevo

```
backend/src/main/java/com/matchplay/session/controller/MySessionsController.java
```

```java
@RestController
@RequestMapping("/api/v1/me/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions")
public class MySessionsController {

    private final MySessionsService service;

    @GetMapping
    public MySessionsResponse findMine(
            @RequestParam(defaultValue = "CREATED") MySessionsService.Tab tab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        int safePage = Math.max(page, 0);
        return service.findMine(tab, PageRequest.of(safePage, safeSize));
    }
}
```

`SecurityConfig` debe proteger `/api/v1/me/**` (auth required). Verificar si ya está cubierto por la rule existente de `anyRequest().authenticated()` — probable que sí.

### Mapper

`SessionMapper.toSummary(session, withExpansionNames)` — añadir parámetro opcional. Si `false` (default), `expansionNames = null`. Si `true`, mapea `session.getExpansions().stream().map(Game::getName).toList()`.

### Tests backend

- `MySessionsServiceImplTest`:
  - `findMine_created_returnsOnlyMyCreatedActiveSessions`
  - `findMine_created_excludesCompletedSessions`
  - `findMine_history_returnsOnlyMyCreatedTerminalSessions`
  - `findMine_history_sortedDescending`
  - `findMine_player_returnsOnlySessionsWherePlayerRoleIsPlayer`
  - `findMine_waitlist_returnsOnlySessionsWithWaitlistRole`
  - `findMine_counts_areAccurate`
  - `findMine_history_populatesExpansionNames`
  - `findMine_other_tabs_doNotPopulateExpansionNames`
- `MySessionsControllerTest`:
  - `findMine_returns200WithDefaultTab`
  - `findMine_returns401WhenAnonymous`
  - `findMine_respectsPageAndSize`
  - `findMine_invalidTab_returns400`

## Frontend

### Routing

Nueva ruta `/sessions/mine` añadida al router. Lazy-loaded con `React.lazy`.

Guard: si no autenticado, redirige a `/login?next=/sessions/mine` (reusar el patrón existente del proyecto si hay un wrapper de auth-required routes).

### Tab navigation

URL query param `?tab=CREATED|PLAYER|WAITLIST|HISTORY`. Default `CREATED`. Cambio de tab → `setSearchParams({tab: 'X'})` para que sea bookmark-able y respete back-button del browser.

Persistencia entre tabs:
- Cada tab arranca en `page=0`. Al cambiar de tab, se resetea la página (otherwise switching from page 5 of CREATED a PLAYER puede aterrizar en una página inexistente). El page actual NO se persiste por tab (mantener simple).
- Counters compartidos (vienen del último response, se actualizan en cada fetch). La query key incluye `tab` y `page`, así que cambiar de tab dispara fetch nuevo con counters refrescados.
- Page size constante a 20 en todos los tabs (mismo `size` que el listado público).

### Componentes nuevos

**`MySessionsPage`** (`features/sessions/pages/MySessionsPage.tsx`):
- Header: `<h1>Mis partidas</h1>` font-display.
- Tabs bar sticky (variante **B aprobada — Pills coloreadas**):
  - 4 pills: `✏️ Creadas (N)` amarillo, `🎲 Apuntado (N)` verde, `⏳ En cola (N)` azul, `📚 Historial (N)` muted.
  - Activo en filled (fondo lleno del color); inactivos en outline con `opacity-60`.
  - Counter `(N)` dentro de la pill como subtle pill anidada con bg `rgba(0,0,0,0.08)`.
  - Mobile: scroll horizontal con sticky (los pills caben todos en row gracias a labels cortos en mobile — "Cola" en lugar de "En lista de espera").
  - Sticky bar: `position: sticky; top: 0;` con `bg-white border-b border-border`.
- Content:
  - Para `CREATED | PLAYER | WAITLIST`: grid de `<SessionCard>` con prop nueva `accentColor` (border-left coloreado del rol).
  - Para `HISTORY`: componente `<MyHistoryTable>` (ver abajo).
- Empty state por tab:
  - `CREATED` vacío → "No has creado partidas todavía" + CTA "Crear partida".
  - `PLAYER` vacío → "No estás apuntado a ninguna partida" + CTA "Explorar partidas" → `/sessions`.
  - `WAITLIST` vacío → "No estás en cola en ninguna partida" + CTA "Explorar partidas".
  - `HISTORY` vacío → "Aún no tienes partidas finalizadas" (sin CTA — informativo).
- Loading: skeleton de 3 cards (o filas de tabla en history) con `animate-pulse`.
- Error: mensaje + botón retry.

**`MyHistoryTable`** (`features/sessions/components/MyHistoryTable.tsx`):

Desktop — tabla con 6 columnas:

| Fecha | Nombre | Juego | Ubicación | Estado | Acción |
|---|---|---|---|---|---|
| `15/01/2026 19:00` | "Ark Nova en casa…" | Ark Nova | Madrid · Centro | Completada | ↻ Duplicar |

- **Fecha**: formato `d/MM/yyyy HH:mm`. Usar `Intl.DateTimeFormat(i18n.language, {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})`.
- **Nombre**: `session.title`, con `truncate` + `title={session.title}` para tooltip nativo en hover si excede.
- **Juego**: `session.baseGameName`, truncate también.
- **Ubicación**: `session.cityName · session.areaName`.
- **Estado**: color verde si COMPLETED, rojo si CANCELLED.
- **Acción**: botón `↻ Duplicar` rojo pequeño → `navigate('/sessions/new?from=' + session.id)`.

**Sub-fila de expansiones**: si `session.expansionNames?.length > 0`, debajo de la fila principal renderizar una sub-fila con fondo ligeramente más oscuro:

```
↳ Expansiones: Marine Worlds, Promo Pack
```

italic muted, separadas por coma, con `truncate` si pasa del ancho.

Si una partida no tiene expansiones, no se renderiza la sub-fila — la siguiente partida va pegada con su propio border-bottom.

Mobile (< 640px): la tabla se transforma en **mini-cards apiladas**. Cada card muestra:

```
┌─────────────────────────────────────────┐
│ 15/01/2026 19:00      [Completada]      │
│ Ark Nova en mi casa con amiguetes       │  ← nombre, truncate
│ Ark Nova · Madrid · Centro              │  ← juego · ubicación
│ Expansiones: Marine Worlds, Promo Pack  │  ← solo si tiene
│                          [↻ Duplicar]   │
└─────────────────────────────────────────┘
```

Stack vertical con `gap-3`. El botón Duplicar siempre full-width en mobile para tap target accesible.

**Extensión de `SessionCard`** (`shared/components/SessionCard.tsx`):

Añadir prop opcional `accentColor?: 'yellow' | 'green' | 'blue' | 'muted'`. Si presente, aplica clase `border-l-4 border-{color}` al wrapper. Si ausente, sin border-left (comportamiento actual).

### API + hooks

`mySessionsApi` en `features/sessions/api/mySessionsApi.ts`:

```ts
export const mySessionsApi = {
  findMine: (tab: MyTab, page = 0, size = 20): Promise<MySessionsResponse> =>
    httpClient
      .get<MySessionsResponse>('/me/sessions', { params: { tab, page, size } })
      .then((r) => r.data),
}
```

Hook en `features/sessions/hooks/useMySessions.ts`:

```ts
export function useMySessionsQuery(tab: MyTab, page: number) {
  return useQuery({
    queryKey: ['my-sessions', tab, page, i18next.language],
    queryFn: () => mySessionsApi.findMine(tab, page),
    enabled: true,
    staleTime: 30_000,
  })
}
```

### Types nuevos (`session.types.ts`)

```ts
export type MyTab = 'CREATED' | 'PLAYER' | 'WAITLIST' | 'HISTORY'

export interface TabCounts {
  created: number
  player: number
  waitlist: number
  history: number
}

export interface MySessionsResponse {
  items: PageResponse<SessionSummary>
  counts: TabCounts
}

// SessionSummary añade:
expansionNames: string[] | null
```

### Duplicar partida — modificar `CreateSessionPage`

`CreateSessionPage` ya existe en `features/sessions/pages/CreateSessionPage.tsx`. Modificar para que:

1. Lea `?from={sessionId}` del query string.
2. Si presente: fetch `useSessionDetailQuery(fromId)` (hook ya existente). Mientras carga, muestra spinner. Si error 404 (sesión no existe o no soy creador), ignora silenciosamente y arranca form vacío.
3. Cuando llega `data`: pre-llena `useForm` (o el state) con:
   - `title` = `data.title`
   - `description` = `data.description ?? ''`
   - `baseGameId` = `data.baseGameId`
   - `expansionBggIds` = `data.expansions.map(e => e.bggId)` (asumiendo que la entidad `ExpansionSummary` tiene `bggId` — verificar)
   - `cityCode` = `data.cityCode`
   - `areaCode` = `data.areaCode ?? null`
   - `maxPlayers` = `data.maxPlayers`
   - `scheduledAt` = `''` (queda vacío)
   - `creatorGuests` = `0` (por defecto)
4. El user puede editar cualquier campo antes de submit. Validaciones del form se aplican igual.

Solo se pre-llena UNA vez en el primer mount; cambios manuales del user no se sobrescriben.

### Menú: activar "Mis partidas"

En `MobileMenu.tsx`:

- Quitar `disabled` + `badge={t('nav.comingSoon')}` del `MenuItem` "Mis partidas".
- Añadir `to="/sessions/mine"` y `active={location.pathname === '/sessions/mine'}`.
- Usar icono `CalendarCheck` (ya importado).

Si hay un header desktop (verificar existencia de `DesktopMenu` o similar), añadir el mismo ítem para autenticados.

### i18n nuevas claves

Bajo `sessions.mine` (bloque nuevo):

```json
{
  "title": "Mis partidas",
  "tabs": {
    "created": "Creadas por mí",
    "createdShort": "Creadas",
    "player": "Apuntado",
    "waitlist": "En lista de espera",
    "waitlistShort": "Cola",
    "history": "Historial"
  },
  "empty": {
    "created": "No has creado partidas todavía.",
    "createdCta": "Crear partida",
    "player": "No estás apuntado a ninguna partida.",
    "playerCta": "Explorar partidas",
    "waitlist": "No estás en cola en ninguna partida.",
    "waitlistCta": "Explorar partidas",
    "history": "Aún no tienes partidas finalizadas."
  },
  "history": {
    "columns": {
      "date": "Fecha",
      "name": "Nombre",
      "game": "Juego",
      "location": "Ubicación",
      "status": "Estado",
      "action": ""
    },
    "expansions": "Expansiones:",
    "duplicate": "Duplicar",
    "statusCompleted": "Completada",
    "statusCancelled": "Cancelada"
  }
}
```

EN equivalente (traducción literal).

### Tests frontend

- `MySessionsPage.test.tsx`:
  - Renderiza los 4 tabs con counts del response.
  - Cambia de tab → cambia el query param y dispara nueva query.
  - Tab vacío muestra empty state con CTA correcta.
  - Tab CREATED renderiza grid de SessionCard con `accentColor='yellow'`.
  - Tab HISTORY renderiza `MyHistoryTable`.
  - Loading: skeleton visible mientras `isLoading`.
  - Error: mensaje + retry button.
  - Anónimo: redirige a `/login?next=/sessions/mine`.
- `MyHistoryTable.test.tsx`:
  - Renderiza columnas con formato fecha correcto.
  - Sub-fila de expansiones aparece solo si la partida las tiene.
  - Click en Duplicar navega a `/sessions/new?from={id}`.
  - Nombre largo truncado con `title` attribute para tooltip.
  - Mobile: cuando viewport < 640px (no fácil de testear con jsdom; alternativa: testear el componente mobile-card en aislamiento).
- `CreateSessionPage.test.tsx`:
  - Sin `?from=` → form vacío como hasta ahora.
  - Con `?from=7` → fetch + pre-fill todos los campos esperados, scheduledAt vacío, creatorGuests=0.
  - Edición posterior del user no se sobrescribe por re-fetch.

## Plan de entrega (orientativo, lo cierra writing-plans)

1. **BE** — endpoint + service + tests + Specifications nuevas + extensión SessionSummaryResponse.
2. **FE data layer** — types + api + hook.
3. **FE MyHistoryTable** — componente standalone con tests.
4. **FE MySessionsPage** — page con tabs + grid + integración.
5. **FE duplicar** — CreateSessionPage lee `?from=` y pre-fillea.
6. **FE menú** — activar "Mis partidas" en MobileMenu (y desktop si aplica).

## Out of scope (futuro)

- Filtros geo/juego/fechas dentro de cada tab (las "mis partidas" son pocas, sobra).
- Tabs adicionales (ej. "Invitado pero no respondido", "Recurrentes") — solo si emergen.
- Búsqueda por texto dentro del historial.
- Estadísticas / dashboard del histórico.
- Export del historial.
- Re-invitar a los mismos jugadores al duplicar (requiere modelo de "amigos" que no existe).

## Rechazado explícitamente

Nada nuevo en este spec.
