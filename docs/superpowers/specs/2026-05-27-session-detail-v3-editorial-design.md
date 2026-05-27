# Session Detail v3 — Editorial layout + chat visible para todos

**Fecha**: 2026-05-27
**Estado**: Borrador para aprobación
**Ámbito**: refresh visual de `SessionDetailPage` (dirección "editorial") + extensión del chat para que el contador total de mensajes sea visible a cualquier visitante y el bloque sea clicable también para no-apuntados (lleva a la acción de unirse).

## Contexto

La detail page actual cumple su función pero se siente "plana": tipografía uniforme, todo blanco-card, sin jerarquía visual ni protagonismo del juego. La feature de chat (sprint anterior) solo muestra el bloque para participantes — visitantes no descubren que hay conversación viva en la mesa, lo que reduce la conversión a "Unirme".

Este spec recoge dos hilos relacionados:

1. **Layout editorial**: cover del juego como elemento visual fuerte, meta vertical con iconos de color, "Sobre el juego" con acento amarillo, sidebar con mini-cards.
2. **Chat universal**: el contador total de mensajes se expone a cualquier visitante; el bloque del chat siempre se renderiza (excepto sesiones cerradas/canceladas) y es clicable en ambos estados:
   - **Participante** (PLAYER/WAITLIST/creador): abre el drawer.
   - **No participante** (logueado fuera o anónimo): hace scroll/focus al botón "Unirme" más arriba en la página.

## Reglas de producto

- El contador total `chatMessageCount` es **público**: cualquier visitante con acceso a la detail page lo ve.
- El contador `chatUnreadCount` sigue siendo **solo para participantes** (privado).
- Si la sesión está `COMPLETED` o `CANCELLED`, el bloque del chat no se renderiza (los mensajes ya fueron borrados; `chatMessageCount === null`).
- Si la sesión está activa y count = 0, el bloque sigue visible con texto "Sin mensajes aún".
- En mobile (< 640px), el sidebar se apila debajo del contenido principal, full width.
- Para no-apuntados con plaza libre, el botón "Unirme" aparece **destacado bajo el header** en mobile (full width rojo), no escondido en el sidebar. En desktop puede seguir en su posición actual.

## Backend

### Modelo de datos

Sin cambios en BBDD. Reutiliza la tabla `session_messages` existente.

### Repository

`backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java` añade un método:

```java
long countBySessionId(Long sessionId);
```

Es un método derivado JPA. Es un `SELECT COUNT(*)` indexado por `session_id` — barato. Se llama una vez por GET detail.

### DTO `SessionDetailResponse`

Añade `Integer chatMessageCount` entre `chatUnreadCount` y `players`:

```java
public record SessionDetailResponse(
    Long id,
    String title,
    String description,
    Long baseGameId,
    String baseGameName,
    String baseGameThumbnailUrl,
    String baseGameSummary,
    List<ExpansionSummary> expansions,
    String cityCode,
    String cityName,
    String areaCode,
    String areaName,
    Instant scheduledAt,
    int maxPlayers,
    int registeredPlayers,
    int creatorGuests,
    int waitlistCount,
    SessionStatus status,
    Long creatorId,
    String creatorUsername,
    Integer chatUnreadCount,
    Integer chatMessageCount,
    List<SessionPlayerResponse> players,
    ParticipantRole yourRole,
    Instant createdAt,
    Instant updatedAt
) {}
```

**Regla del proyecto en CLAUDE.md** (records posicionales): grep `new SessionDetailResponse(` en todos los tests y añadir `null` en la posición correspondiente. Locales conocidos a actualizar: `GameSessionServiceImplTest`, `GameSessionControllerTest`, `SessionMapperTest`.

### Service

`GameSessionServiceImpl.buildDetail`:

- Calcula `Integer chatMessageCount` así:
  - Si `session.getStatus() ∈ {COMPLETED, CANCELLED}` → `null` (el chat ya no aplica).
  - En otro caso → `(int) messageRepository.countBySessionId(session.getId())`.
- Lo pasa al `mapper.toDetail(...)` como nuevo parámetro.

`SessionMapper.toDetail` añade 5º parámetro `Integer chatMessageCount` y lo pasa al constructor del response en la posición correcta.

### Tests

- `SessionMessageRepositoryTest` (o el sitio donde se prueben repos): caso del `countBySessionId` con 0, 1 y N mensajes.
- `GameSessionServiceImplTest`:
  - `getDetail_chatMessageCount_returnsTotalCount` — sesión OPEN con 3 mensajes → 3.
  - `getDetail_chatMessageCount_isNullWhenCompleted` — sesión COMPLETED → null.
  - `getDetail_chatMessageCount_isNullWhenCancelled` — sesión CANCELLED → null.
- `SessionMapperTest`: actualizar fixtures posicionales con `null` en el campo nuevo.

## Frontend — datos

### Types

`frontend/src/features/sessions/types/session.types.ts`:

```ts
export interface SessionDetail extends ... {
  // ... campos existentes
  chatUnreadCount: number | null   // ya existe
  chatMessageCount: number | null  // NUEVO — total de mensajes, visible a cualquier visitante
  // ...
}
```

Y la fixture en `__tests__/SessionDetailPage.test.tsx` (helper `detail()`) gana `chatMessageCount: 0` por defecto.

## Frontend — `SessionChatButton` ampliado

Mismo nombre, comportamiento ampliado con 3 ramas exclusivas:

### Estado 1 — Participante (sin cambios funcionales)

`chatUnreadCount !== null` (= soy PLAYER, WAITLIST o creador). Render actual: card-banner con borde rojo solid, badge "X" si unread > 0, contenido "💬 Chat · {chatMessageCount} mensajes". Click abre el drawer.

Pequeño cambio: añadir el contador total bajo el título del bloque, no solo el unread badge. Estructura:

```
┌─────────────────────────────────────┐
│ 💬  Chat              [3]           │
│     12 mensajes                     │
└─────────────────────────────────────┘
```

### Estado 2 — No participante con sesión activa

`chatUnreadCount === null && chatMessageCount !== null`. Render como caja muted clicable:

```
┌ - - - - - - - - - - - - - - - - - -┐
│ 💬  12 mensajes                     │
│     Apúntate para participar →      │
└ - - - - - - - - - - - - - - - - - -┘
```

- Bordes dashed `border-border` muted.
- Fondo `bg-muted/30`, hover `bg-muted/50`.
- Cursor pointer.
- Click → llama a `onJoinPrompt()` recibido como prop opcional. Esa función debe:
  - Si hay un botón "Unirme" en pantalla: scroll smooth al elemento y aplicar un flash visual de 1s (animar la `box-shadow` o un highlight pulsante).
  - Si no estoy autenticado: redirigir a `/login?next=/sessions/{id}`.
- Si count = 0: "Sin mensajes aún — apúntate para participar".

### Estado 3 — Sesión cerrada o cancelada

`chatMessageCount === null` → el componente devuelve `null` (no renderiza).

### i18n nuevas

En `frontend/src/shared/i18n/locales/es.json` bajo `sessions.chat`:

```json
"totalMessages_one": "{{count}} mensaje",
"totalMessages_other": "{{count}} mensajes",
"outsiderNotice_zero": "Sin mensajes aún — apúntate para participar.",
"outsiderNotice_one": "{{count}} mensaje — apúntate para participar.",
"outsiderNotice_other": "{{count}} mensajes — apúntate para participar."
```

En `en.json`:

```json
"totalMessages_one": "{{count}} message",
"totalMessages_other": "{{count}} messages",
"outsiderNotice_zero": "No messages yet — sign up to join the chat.",
"outsiderNotice_one": "{{count}} message — sign up to join the chat.",
"outsiderNotice_other": "{{count}} messages — sign up to join the chat."
```

## Frontend — layout editorial

### `GameCover` + `GameCoverPlaceholder` (componentes nuevos)

`frontend/src/features/sessions/components/GameCover.tsx`:

```tsx
interface Props {
  thumbnailUrl: string | null
  name: string
  className?: string
}

export function GameCover({ thumbnailUrl, name, className }: Props) {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={name}
        className={cn(
          'aspect-[3/4] rounded-md border-2 border-yellow object-cover shadow-md',
          className,
        )}
      />
    )
  }
  return <GameCoverPlaceholder name={name} className={className} />
}
```

`GameCoverPlaceholder.tsx`:

```tsx
import { Dices } from 'lucide-react'

interface Props {
  name: string
  className?: string
}

export function GameCoverPlaceholder({ name, className }: Props) {
  return (
    <div
      className={cn(
        'flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-md border-2 border-yellow bg-gradient-to-br from-yellow-soft to-red/10 p-3 shadow-md',
        className,
      )}
    >
      <Dices size={36} aria-hidden="true" className="text-foreground/50" />
      <p className="line-clamp-2 text-center font-display text-xs font-bold leading-tight text-foreground/80">
        {name}
      </p>
    </div>
  )
}
```

Reutilizable: el mismo `GameCover` se puede usar en `SessionCard` o `CreatorActions` modal en el futuro si interesa, sin scope creep en este sprint.

### `SessionDetailPage` — reorganización del header

Antes:
- Status badges → título h1 → game name → "@creator"

Después (desktop ≥640px, 2-col):
- Status badges en su sitio actual (cabecera centrada o izquierda según convenga).
- Bloque `<header class="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 sm:gap-6">`:
  - Cover `<GameCover>` tamaño 160×213 (aspect 3:4).
  - Bloque derecho: badges + título font-display `text-2xl sm:text-3xl` + game name italic + "organiza @{creator}" + meta vertical.
- Meta como **lista vertical de iconos coloreados**, no card aparte:
  - 📅 azul · fecha
  - 📍 verde · ubicación
  - 👥 rojo · plazas (`X/Y · N en cola`)
- Separador horizontal entre meta y resto del contenido.

Mobile (< 640px):
- Stack vertical: badges → cover centrado max-width 160px → título centrado → game name → meta vertical → separador.
- Cover queda más pequeño en mobile (140px de ancho) para no comer pantalla.

### CTA "Unirme" prominente en mobile para no apuntados

Cuando `yourRole === null && status === 'OPEN' && registeredPlayers < maxPlayers && isAuthenticated` (es decir: puedo unirme):

- En mobile: justo después del header (antes de "Sobre el juego"), un botón `<button class="w-full bg-red text-white ...">Unirme a esta mesa</button>` full-width destacado.
- En desktop: el botón sigue donde está hoy (en el sidebar via `SessionActions`).
- En el bloque anónimo (no logueado): el CTA es "Inicia sesión para unirte" con redirect a login.

Esta CTA mobile se materializa en un componente `JoinCallToAction.tsx` nuevo en `frontend/src/features/sessions/components/` para mantener `SessionDetailPage` legible. Recibe `session: SessionDetail` y `isAuthenticated: boolean`, decide internamente si renderizar (devuelve null si no aplica) y qué texto/acción mostrar. Solo es visible en mobile (`sm:hidden`).

### Sidebar — cards independientes

Cada bloque del sidebar pasa a su propia mini-card:

```
┌─────────────────────────┐
│ APUNTADOS         2/3   │
│ ● @ana                  │
│ ● @cesarby              │
└─────────────────────────┘

┌─────────────────────────┐
│ LISTA DE ESPERA    0    │
└─────────────────────────┘

┌─────────────────────────┐
│ 💬 Chat            [3]  │   ← SessionChatButton
│    12 mensajes          │
└─────────────────────────┘

[Salir de la mesa]
```

- Cada card: `bg-card border border-border rounded p-4`.
- Avatar = círculo de color con la inicial del username en mayúsculas (NO foto real — fuera de scope).
- Color del círculo: hash determinístico del username → uno de 6 colores de la paleta del proyecto. Helper `frontend/src/shared/lib/avatarColor.ts` nuevo: `pickAvatarColor(username): string` devuelve una clase Tailwind (`bg-red`, `bg-yellow`, `bg-green`, `bg-blue`, `bg-foreground`, `bg-muted-foreground`). Implementación: `hash = sum(charCodes(username)) % 6` y mapea al índice. Determinístico (mismo username → mismo color).
- Lista de espera: si vacío, no muestra "—", la card simplemente queda con el header + contador 0.
- En mobile el sidebar pasa al **final del contenido** (después de Descripción), full-width. Las cards se apilan en columna única con `gap-3`.

### "Sobre el juego" — refresh mínimo

Ya tiene `border-l-4 border-yellow bg-yellow-soft/30`. Cambio cosmético: pasar el texto a italic (es texto editorial generado, encaja). Sin cambios estructurales.

### Expansiones — sin cambios

`SessionExpansionsBlock` se queda igual (accordion existente con thumbnails y summary lazy).

### Descripción — sin cambios

Heading + paragraph como ahora.

## Tests frontend

- `SessionChatButton.test.tsx`: ampliar con casos para estado outsider:
  - `chatUnreadCount: null, chatMessageCount: 5` → renderiza caja muted clicable con "5 mensajes — apúntate para participar".
  - `chatUnreadCount: null, chatMessageCount: 0` → caja con "Sin mensajes aún…".
  - `chatMessageCount: null` → no renderiza (sesión cerrada).
  - Click en caja outsider llama `onJoinPrompt` (pasarlo como spy en el test).
- `GameCover.test.tsx`: con `thumbnailUrl` → `<img>`; sin él → `GameCoverPlaceholder`.
- `GameCoverPlaceholder.test.tsx`: render con icono `Dices` visible (`aria-hidden`) + nombre.
- `SessionDetailPage.test.tsx`: añadir tests:
  - Mobile: viewport pequeño → CTA "Unirme" aparece bajo header cuando soy outsider con plaza libre.
  - Layout 2-col se aplica en `sm:` y stacked en mobile (probable test visual difícil de hacer; alternativa: probar que `GameCover` se renderiza siempre y que la estructura DOM es la esperada).

## Plan de entrega (orientativo, se cierra en writing-plans)

1. **BE** — repo method + DTO field + service compute + mapper signature + tests + fixtures.
2. **FE data** — type + fixture default.
3. **FE GameCover + Placeholder** — componentes aislados con sus tests.
4. **FE SessionChatButton** — ampliar a 3 estados, i18n nuevas, tests.
5. **FE SessionDetailPage editorial** — header 2-col, meta vertical, CTA mobile, sidebar mini-cards, avatares por inicial.
6. **FE avatarColor helper** — utility + tests.

## Out of scope (no construir ahora)

- Opciones A (hero immersivo) y C (color-blocked) — descartadas por el usuario.
- Avatares reales (fotos del user).
- Hover/preview del cover BGG en grande al click.
- Animación elaborada del scroll-to-join (basta con `scrollIntoView({behavior:'smooth'})` + un `ring-2 ring-red` animado 1s).

## Rechazado explícitamente

Nada nuevo en este spec (se hereda lo del chat: no typing indicators, no DMs, no moderación, no adjuntos).
