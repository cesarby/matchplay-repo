# Módulo Partidas (sessions) — Spec

> Gestión de partidas de juegos de mesa: listado público, detalle, creación,
> participación con lista de espera infinita, transiciones de estado y chat por partida.

Referencia capa: [../spec.md](../spec.md) · Global: [../../spec.md](../../spec.md)

---

## Propósito

Cubre el ciclo de vida completo de una partida desde la perspectiva del backend:

1. **Discovery público** — listado paginado con filtros y detalle accesible sin autenticación.
2. **CRUD del creador** — crear, actualizar parcial, cambiar estado.
3. **Participación** — unirse, salirse, autopromoción de waitlist a plaza.
4. **Validación de reglas de negocio** — fechas futuras, plazas dentro de los límites del juego BGG, transiciones de estado válidas.
5. **Chat por partida** — mensajería entre participantes (jugadores y creador) mientras la partida está activa.

Lo que está **fuera de scope** en esta fase (deferred):

- `/sessions/mine` con scopes (Fase 2).
- Ratings post-evento (Fase 3).
- Notificaciones cuando se promociona a alguien desde waitlist (Fase 2 con módulo de notificaciones).

---

## Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| URL base | `/api/v1/sessions` | Versionado en URL como el resto del backend. |
| Naming query params | `camelCase` | `provinceCode`, `scheduledFrom`. Consistencia con resto de la API. |
| Actualizaciones | `PATCH` parcial | Nunca `PUT`. Solo se envían los campos a modificar. |
| Cambio de estado | `PATCH /{id}/status` con body `{ status: ENUM }` | Sin verbos en URL (`/close-registrations` proscrito). |
| Paginación | `PageResponse<T>` propio (`com.matchplay.common.dto`) | Forma estable, sin `pageable` interno de Spring Data. |
| Default page size | 20 | Máximo 50. |
| Ordenación | `scheduledAt ASC` | Las próximas primero. |
| Filtros | `SessionSearchCriteria` record con specs dinámicas | Provincia, ciudad, área, juego, rango de fechas, status. |
| Waitlist | **Sin límite** | Si la partida está llena, todos los nuevos joins entran como WAITLIST. |
| Orden waitlist | FIFO por columna `position` (no se reordena al borrar) | Posiciones monotónicamente crecientes. |
| Auto-promote | Al salir un PLAYER, primer WAITLIST → PLAYER con `promoted_at = now` | Si subes `maxPlayers`, se promociona en cascada hasta llenar. |
| Validación BGG | `maxPlayers ≤ game.maxPlayers` y `≥ game.minPlayers` si BGG los aporta | Si BGG devuelve `null` (juegos cooperativos), se salta la validación. |
| `yourRole` en detail | Calculado en service por current user (null si anónimo o no apuntado) | Lo expone el DTO de detalle para que el frontend muestre el banner. |
| `waitlistCount` | Calculado al vuelo (no cacheado en la fila) | Coste despreciable con índice (`session_id, role, position`). |
| Idempotencia de `changeStatus` | Sí | Pedir el estado actual devuelve detalle sin persistir. |
| Estados terminales | `COMPLETED`, `CANCELLED` | No admiten más transiciones ni participación. |
| `IN_PROGRESS` / `COMPLETED` | `IN_PROGRESS → COMPLETED` está habilitada; el resto requiere job programado (deferred) | `IN_PROGRESS → COMPLETED` se añadió con el módulo de chat para el lifecycle de mensajes. |

---

## Schema (Flyway)

### `V2__game_sessions.sql`

```sql
CREATE TABLE game_sessions (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    title              VARCHAR(150) NOT NULL,
    description        TEXT         NULL,
    creator_id         BIGINT       NOT NULL,
    base_game_id       BIGINT       NOT NULL,
    city_code          VARCHAR(8)   NOT NULL,
    area_code          VARCHAR(16)  NULL,
    scheduled_at       DATETIME     NOT NULL,
    max_players        INT          NOT NULL,
    registered_players INT          NOT NULL DEFAULT 0,
    status             VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_session_creator   FOREIGN KEY (creator_id)   REFERENCES users(id),
    CONSTRAINT fk_session_base_game FOREIGN KEY (base_game_id) REFERENCES games(bgg_id),
    CONSTRAINT fk_session_city      FOREIGN KEY (city_code)    REFERENCES cities(code),
    CONSTRAINT fk_session_area      FOREIGN KEY (area_code)    REFERENCES areas(code),
    INDEX idx_session_status_scheduled (status, scheduled_at),
    INDEX idx_session_city             (city_code),
    INDEX idx_session_creator          (creator_id)
);
```

`registered_players` cacheado en la fila para evitar `COUNT(*)` en listados.

### `V4__session_participants.sql`

```sql
CREATE TABLE session_participants (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    session_id BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    joined_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role       VARCHAR(16) NOT NULL DEFAULT 'PLAYER',
    PRIMARY KEY (id),
    CONSTRAINT fk_session_participant_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_participant_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    UNIQUE KEY uq_session_participants_session_user (session_id, user_id),
    INDEX idx_session_participants_session (session_id),
    INDEX idx_session_participants_user    (user_id)
);
```

`UNIQUE(session_id, user_id)` es el seguro real contra doble-join (la lógica de aplicación también lo valida).

### `V5__session_participants_waitlist.sql`

```sql
ALTER TABLE session_participants
    ADD COLUMN position    INT      NULL,
    ADD COLUMN promoted_at DATETIME NULL;

CREATE INDEX idx_session_participants_role_position
    ON session_participants (session_id, role, position);
```

- `position` se usa solo cuando `role = WAITLIST`. Es el orden FIFO de promoción.
- `promoted_at` registra cuándo un WAITLIST se convirtió en PLAYER. Auditable y base para notificaciones futuras.

---

## Entidades JPA

### `GameSession`

`com.matchplay.session.entity.GameSession`. Campos relevantes:

- `creator: User` (`@ManyToOne`)
- `baseGame: Game` (`@ManyToOne`, ref `bgg_id`)
- `city: City`, `area: Area` (`@ManyToOne`)
- `scheduledAt: Instant`
- `maxPlayers: int`, `registeredPlayers: int`
- `status: SessionStatus` (`@Enumerated(STRING)`)
- `createdAt` / `updatedAt` con `@CreationTimestamp` / `@UpdateTimestamp`

### `SessionStatus`

```java
public enum SessionStatus { OPEN, FULL, IN_PROGRESS, COMPLETED, CANCELLED }
```

### `SessionParticipant`

- `session: GameSession`, `user: User` (`@ManyToOne`)
- `joinedAt: Instant`
- `role: ParticipantRole` (`PLAYER` | `WAITLIST`)
- `position: Integer` (nullable; solo para `WAITLIST`)
- `promotedAt: Instant` (nullable; auditoría)

### `ParticipantRole`

```java
public enum ParticipantRole { PLAYER, WAITLIST }
```

---

## Endpoints

### Lectura — públicos

| Método | URL | Resumen |
|--------|-----|---------|
| `GET` | `/api/v1/sessions` | Listado paginado y filtrado |
| `GET` | `/api/v1/sessions/{id}` | Detalle con participantes |
| `GET` | `/api/v1/sessions/{id}/players` | Solo lista de apuntados |

### Escritura — autenticados

| Método | URL | Resumen | Permiso |
|--------|-----|---------|---------|
| `POST` | `/api/v1/sessions` | Crear | autenticado |
| `PATCH` | `/api/v1/sessions/{id}` | Actualizar campos | solo creador |
| `PATCH` | `/api/v1/sessions/{id}/status` | Cambiar estado | solo creador |
| `POST` | `/api/v1/sessions/{id}/close` | Cerrar mesa (ajusta maxPlayers al actual) | solo creador |
| `POST` | `/api/v1/sessions/{id}/join` | Unirse (PLAYER o WAITLIST) | autenticado, no creador |
| `DELETE` | `/api/v1/sessions/{id}/join` | Salirse | autenticado, participante |

### `GET /api/v1/sessions`

**Auth:** público.

Query params (todos opcionales):

| Param | Tipo | Descripción |
|-------|------|-------------|
| `provinceCode` | `String` | Filtra por provincia (a través de `city.province.code`). |
| `cityCode` | `String` | Filtra por ciudad exacta. |
| `areaCode` | `String` | Filtra por zona exacta. |
| `gameId` | `Long` | `bggId` del juego base. |
| `scheduledFrom` | `Instant` ISO-8601 | Fecha mínima. |
| `scheduledTo` | `Instant` ISO-8601 | Fecha máxima. |
| `status` | `SessionStatus` | Filtra por estado exacto. **Si se omite**, el listado devuelve por defecto solo `OPEN` y `FULL` (estados accionables para un usuario público: apuntarse o entrar a waitlist). Excluye `IN_PROGRESS`/`COMPLETED`/`CANCELLED`. Para ver explícitamente alguno de los terminales, hay que pedirlo. |
| `page` | `int ≥ 0` | Default 0. |
| `size` | `int 1..50` | Default 20. |

Respuesta `200`:

```json
{
  "content": [SessionSummaryResponse, ...],
  "page": 0,
  "size": 20,
  "totalElements": 142,
  "totalPages": 8,
  "last": false
}
```

### `SessionSummaryResponse`

```json
{
  "id": 42,
  "title": "Noche de Catan",
  "baseGameId": 13,
  "baseGameName": "Catan",
  "baseGameThumbnailUrl": "https://cf.geekdo-images.com/...",
  "cityCode": "MAD01",
  "cityName": "Madrid",
  "areaCode": null,
  "areaName": null,
  "scheduledAt": "2030-01-15T20:00:00Z",
  "maxPlayers": 4,
  "registeredPlayers": 3,
  "waitlistCount": 0,
  "status": "OPEN",
  "creatorId": 1,
  "creatorUsername": "alice"
}
```

### `GET /api/v1/sessions/{id}` — `SessionDetailResponse`

```json
{
  "id": 42,
  "title": "Noche de Catan",
  "description": "Mesa nocturna…",
  "baseGameId": 13,
  "baseGameName": "Catan",
  "baseGameThumbnailUrl": "https://cf.geekdo-images.com/...",
  "baseGameSummary": "Catan es un juego de colocación…",
  "cityCode": "MAD01",
  "cityName": "Madrid",
  "areaCode": null,
  "areaName": null,
  "scheduledAt": "2030-01-15T20:00:00Z",
  "maxPlayers": 4,
  "registeredPlayers": 3,
  "waitlistCount": 2,
  "creatorGuests": 0,
  "status": "OPEN",
  "creatorId": 1,
  "creatorUsername": "alice",
  "chatUnreadCount": 2,
  "chatMessageCount": 5,
  "players": [SessionPlayerResponse, ...],
  "yourRole": "PLAYER",
  "createdAt": "2026-01-01T10:00:00Z",
  "updatedAt": "2026-01-01T10:00:00Z"
}
```

- `yourRole`: `PLAYER` | `WAITLIST` | `null`. Null si la petición es anónima o el usuario autenticado no está apuntado.
- `players` incluye **PLAYER y WAITLIST** ordenados por `joinedAt asc`.
- `baseGameSummary`: resumen generado por LLM (Claude Haiku) del juego base, en el idioma del `Accept-Language` de la petición. `null` si no hay resumen cacheado o el juego no tiene descripción en BGG.
- `creatorGuests`: número de acompañantes del creador (no usuarios registrados). Incluido en `registeredPlayers`.
- `chatUnreadCount`: mensajes del chat no leídos por el caller.
  - `null` si el caller es anónimo o no es participante ni creador.
  - `0` si el caller es el creador (siempre al día) o si la sesión está en estado terminal (`COMPLETED`/`CANCELLED`).
  - `N > 0` si el caller es participante con N mensajes posteriores a su `last_chat_read_at` (excluyendo los propios).
- `chatMessageCount`: total de mensajes en el chat, visible para cualquier visitante incluyendo anónimos.
  - `null` si la sesión es `COMPLETED` o `CANCELLED` (chat no aplica, mensajes borrados).
  - `0` o `N` si la sesión está activa.
- **Serialización importante**: `SessionDetailResponse` está anotado con `@JsonInclude(JsonInclude.Include.ALWAYS)` para que Jackson serialice los campos `null` de chat explícitamente. Sin esto, el frontend recibiría `undefined` en lugar de `null` y no podría distinguir "anónimo/cerrado" de "al día". El test `getDetail_serializesNullChatFieldsExplicitly` lo blinda.
- **En `create`**: el service pasa `chatUnreadCount = 0` y `chatMessageCount = 0` directamente (creador, partida recién creada sin mensajes). En `update` y las demás operaciones se construye el detalle con `buildDetail` que calcula ambos campos.

### `SessionPlayerResponse`

```json
{
  "userId": 2,
  "username": "bob",
  "name": "Bob",
  "role": "PLAYER",
  "position": null,
  "joinedAt": "2026-01-01T11:00:00Z"
}
```

`position` solo se rellena cuando `role = WAITLIST` (FIFO de la cola).

### `POST /api/v1/sessions`

**Auth:** JWT requerido.

Body (`CreateSessionRequest`):

```json
{
  "title": "Noche de Catan",
  "description": "Mesa nocturna…",
  "baseGameId": 13,
  "cityCode": "MAD01",
  "areaCode": null,
  "scheduledAt": "2030-01-15T20:00:00Z",
  "maxPlayers": 4
}
```

Validaciones Bean Validation:

- `title`: `@NotBlank`, `@Size(max = 150)`.
- `description`: `@Size(max = 5000)`, opcional.
- `baseGameId`: `@NotNull`. Debe existir en la tabla `games` (cacheada desde BGG).
- `cityCode`: `@NotBlank`, `@Size(max = 8)`. Debe existir en `cities`.
- `areaCode`: `@Size(max = 16)`, opcional. Si se aporta, debe existir.
- `scheduledAt`: `@NotNull`. Debe ser futuro (validación en service).
- `maxPlayers`: `@NotNull`, `@Min(2)`, `@Max(20)`. Además dentro de los límites BGG si están informados.

Respuesta `201 Created` con `Location: /api/v1/sessions/{id}` y body `SessionDetailResponse`.

**Regla de producto**: el creador queda automáticamente apuntado como `PLAYER`
en su propia partida (`registered_players = 1` al crear, una fila en
`session_participants` con `role = PLAYER`). El response incluye `yourRole = PLAYER`.
Implicaciones:

- `POST /sessions/{id}/join` por el creador sigue lanzando `409 error.session.join.own`.
- `DELETE /sessions/{id}/join` por el creador lanza `403 error.session.creator.cannot.leave` — para "irse" debe cancelar la partida vía `PATCH /status`.

**Acompañantes del creador (`creatorGuests`, v1.3)**: el creador puede declarar
en el body cuántas personas adicionales vienen con él (familiares/amigos que no
son usuarios del sistema). Esos huecos quedan reservados desde la creación:

- Validación: `0 ≤ creatorGuests` **y** `1 + creatorGuests < maxPlayers` (regla
  estricta: siempre debe quedar al menos 1 plaza libre para que otro usuario
  pueda apuntarse). Si no, `400 error.session.guests.exceed.max`.
- `registered_players = 1 + creatorGuests` al persistir. La partida arranca
  siempre en `OPEN` (la regla garantiza ≥1 plaza libre).
- Persistido en `game_sessions.creator_guests` (V9, `INT NOT NULL DEFAULT 0`)
  y expuesto en `SessionDetailResponse.creatorGuests`. No se incluye en
  `SessionSummaryResponse` (el conteo ya va en `registered_players`).
- `creatorGuests` es **inmutable** tras crear (no se admite en
  `UpdateSessionRequest` v1; si en el futuro se quiere editar, hay que
  recalcular capacidad y promocionar/demover waitlist).

### `PATCH /api/v1/sessions/{id}`

**Auth:** JWT requerido. **Solo el creador.**

Body (`UpdateSessionRequest`). Todos los campos opcionales (null = no se toca):

```json
{
  "title": "Catan + Marineros",
  "description": "…",
  "areaCode": null,
  "scheduledAt": "2030-02-01T20:00:00Z",
  "maxPlayers": 6
}
```

Restricciones que no se pueden modificar (regla de producto, evita confundir apuntados): `baseGameId`, `cityCode`, `creator`.

Reglas extra:

- Si `scheduledAt` se cambia, debe seguir siendo futura.
- Si `maxPlayers` se reduce, no puede quedar por debajo de los apuntados actuales.
- Si `maxPlayers` se aumenta, se promociona waitlist en cascada hasta llenar.
- Si la partida está en estado terminal (`COMPLETED`, `CANCELLED`), no admite update.

Respuesta `200` con `SessionDetailResponse` actualizado.

### `POST /api/v1/sessions/{id}/close`

**Auth:** JWT requerido. **Solo el creador.** Solo si status `OPEN`.

Sin body. Efecto:

- `maxPlayers := registeredPlayers` (ajusta el aforo al número actual de apuntados).
- `status := FULL`.
- La waitlist se mantiene intacta.

Requisito: al menos 1 apuntado que no sea el creador ni sus acompañantes, es decir
`registeredPlayers - 1 - creatorGuests >= 1`. Si no, `400 error.session.empty.cannot.close`.

- Si `status != OPEN` → `409 SessionStatusTransitionException`.
- Si no es el creador → `403 UnauthorizedActionException`.

Respuesta `200` con `SessionDetailResponse`.

### `PATCH /api/v1/sessions/{id}/status`

**Auth:** JWT requerido. **Solo el creador.**

Body (`ChangeStatusRequest`):

```json
{ "status": "CANCELLED" }
```

Transiciones permitidas:

| De → A | OPEN | FULL | IN_PROGRESS | COMPLETED | CANCELLED |
|--------|------|------|-------------|-----------|-----------|
| `OPEN` | — | ✅ | ❌ | ❌ | ✅ |
| `FULL` | ✅ | — | ❌ | ❌ | ✅ |
| `IN_PROGRESS` | ❌ | ❌ | — | ✅ | ✅ |
| `COMPLETED` | ❌ | ❌ | ❌ | — | ❌ |
| `CANCELLED` | ❌ | ❌ | ❌ | ❌ | — |

`IN_PROGRESS → COMPLETED` se habilitó con el módulo de chat: es también lo natural en el ciclo de vida de una partida.

Estado pedido == estado actual → **idempotente**, no falla.

Cualquier otra transición → `409` `error.session.status.invalid.transition`.

### `POST /api/v1/sessions/{id}/join`

**Auth:** JWT requerido.

Sin body. Decide internamente si entra como PLAYER (hay plaza) o WAITLIST (partida llena).

Reglas:

- Creador no puede unirse a su propia partida → `409` `error.session.join.own`.
- Si ya está apuntado (PLAYER o WAITLIST) → `409` `error.session.already.joined`.
- Si la partida está `CANCELLED`/`COMPLETED`/`IN_PROGRESS` → `409` `error.session.status.invalid.transition`.
- Si hay plaza confirmada: `role = PLAYER`, `registered_players++`, transición `OPEN → FULL` si se llena.
- Si está llena: `role = WAITLIST`, `position = max(position) + 1`. **Sin límite de cola.**

Respuesta `200` con `SessionDetailResponse` (incluye el `yourRole` del solicitante).

### `DELETE /api/v1/sessions/{id}/join`

**Auth:** JWT requerido.

- Si el usuario no está apuntado → `403` `error.session.not.participant`.
- Si era `PLAYER`:
  - Se borra su registro y `registered_players--`.
  - Se promociona el primer `WAITLIST` (orden `position ASC`) → `role = PLAYER`, `position = null`, `promoted_at = now`. `registered_players++`.
  - Estado pasa a `OPEN` si estaba `FULL` y queda hueco.
- Si era `WAITLIST`: solo se borra. Sin renumeración (los demás conservan sus positions; el ordering sigue funcionando).

Respuesta `200` con `SessionDetailResponse`.

---

## Códigos de error (i18n)

Todas las claves residen en `messages_es.properties` y `messages_en.properties`.

| Clave | HTTP | Cuándo |
|-------|------|--------|
| `error.session.not.found` | 404 | `findById`/`patch`/`changeStatus`/`join`/`leave` sobre id inexistente |
| `error.session.scheduled.in.past` | 400 | `scheduledAt` ≤ ahora |
| `error.session.max.players.above.game` | 400 | `maxPlayers > game.maxPlayers` |
| `error.session.max.players.below.game.min` | 400 | `maxPlayers < game.minPlayers` |
| `error.session.max.players.below.current` | 409 | `update` reduce `maxPlayers` por debajo de `registeredPlayers` |
| `error.session.full` | 409 | (reservado — no se lanza en join por waitlist sin límite, sí en `changeStatus` cuando la regla lo requiera) |
| `error.session.already.joined` | 409 | `join` con usuario ya apuntado |
| `error.session.join.own` | 409 | `join` del propio creador |
| `error.session.not.owner` | 403 | `patch`/`changeStatus` por no-creador |
| `error.session.not.participant` | 403 | `leave` de usuario no apuntado |
| `error.session.creator.cannot.leave` | 403 | `leave` invocado por el creador. Para irse debe cancelar la partida. |
| `error.session.guests.exceed.max` | 400 | `creatorGuests` declarados superan la capacidad: `1 + creatorGuests > maxPlayers`. |
| `error.session.empty.cannot.close` | 400 | `close` cuando no hay terceros apuntados (`registeredPlayers - 1 - creatorGuests < 1`). |
| `error.session.status.invalid.transition` | 409 | Transición no permitida (incluye `join` en estado terminal) |
| `error.session.chat.forbidden` | 403 | Acceder al chat siendo outsider (no participante ni creador). `SessionChatForbiddenException`. |
| `error.session.chat.write.forbidden` | 403 | Intentar enviar un mensaje siendo WAITLIST. `SessionChatWriteForbiddenException`. |
| `error.session.chat.closed` | 409 | Intentar enviar un mensaje en sesión COMPLETED o CANCELLED. `SessionChatClosedException`. |

---

## Seguridad

```java
.requestMatchers(HttpMethod.GET, "/api/v1/sessions").permitAll()
.requestMatchers(HttpMethod.GET, "/api/v1/sessions/*").permitAll()
.requestMatchers(HttpMethod.GET, "/api/v1/sessions/*/players").permitAll()
// POST /sessions/{id}/close, PATCH /sessions/{id}, chat, etc. → .anyRequest().authenticated()
// GET /sessions/{id}/messages requiere auth; la autorización granular (participante/creador) la aplica SessionChatService
```

`creator` se resuelve siempre del `CurrentUserProvider` (no se manda en el body de `POST`).

---

## Arquitectura

```
session/
├── controller/
│   ├── GameSessionController.java     (REST endpoints + OpenAPI)
│   └── SessionChatController.java     (endpoints /sessions/{id}/messages)
├── service/
│   ├── GameSessionService.java        (interfaz)
│   ├── GameSessionServiceImpl.java    (reglas, transacciones, promotion logic)
│   ├── SessionChatService.java        (interfaz)
│   └── SessionChatServiceImpl.java    (list, send, markRead)
├── repository/
│   ├── GameSessionRepository.java     (JpaSpecificationExecutor + counts del trust strip)
│   ├── GameSessionSpecifications.java (predicates dinámicos para search)
│   ├── SessionParticipantRepository.java
│   └── SessionMessageRepository.java  (chat: list, count, deleteBySessionId)
├── entity/
│   ├── GameSession.java
│   ├── SessionStatus.java
│   ├── SessionParticipant.java
│   ├── ParticipantRole.java
│   └── SessionMessage.java            (id, session, user, content, createdAt; LAZY associations)
├── dto/
│   ├── SessionSearchCriteria.java     (record con filtros)
│   ├── SessionSummaryResponse.java
│   ├── SessionDetailResponse.java     (@JsonInclude ALWAYS para serializar nulls de chat)
│   ├── SessionPlayerResponse.java
│   ├── CreateSessionRequest.java
│   ├── UpdateSessionRequest.java
│   ├── ChangeStatusRequest.java
│   ├── SessionMessageResponse.java    (id, userId, username, content, createdAt)
│   └── CreateMessageRequest.java      (@NotBlank @Size(max=500) content)
└── mapper/
    └── SessionMapper.java             (entity → DTOs)
```

- `GameSessionService` está marcado `@Transactional` por método (escrituras) y `@Transactional(readOnly = true)` en los reads.
- `SessionMapper` es puro: el service le pasa `yourRole` y la lista de participantes calculada.
- Las specifications viven en su propio fichero, no en el repository, para mantenerlo limpio.

---

## Testing

| Capa | Tests | Cobertura |
|------|-------|-----------|
| `GameSessionServiceImplTest` | 23 unit tests (Mockito): create con/sin futuro, validación límites BGG, find missing, join happy/own/already/full→waitlist, leave + auto-promote, changeStatus transitions, idempotente, owner check | Reglas de negocio |
| `GameSessionControllerTest` | 6 MockMvc: search 200, find 404, create 400 inválido, create 201, join 200, leave 200 | Contrato HTTP + serialización |

Total backend tras Fase 1.1: **101/101 ✅**.

---

## Expansiones de partida (Fase 1.2) ✅ implementada

> Soporte para asociar **N expansiones** de BGG a una partida, además de su juego base.
> Reusa el mismo cacheado de `games` que el base, ahora con lazy-load via
> {@code GameService.findOrFetch}.

### Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| Modelo | Tabla M:N `game_session_expansions` | FK a `games.bgg_id`, no JSON column. Permite indexar y aplicar FK reales. |
| Orden | Columna `position INT` | Preserva orden de inserción (`@OrderColumn` en JPA). |
| Cardinalidad por partida | `0..20` | Bean Validation `@Size(max = 20)`. |
| Pertenencia | Cada expansión debe tener `games.base_game_bgg_id == session.base_game_id` | Si no, `400 error.session.expansion.wrong.base`. |
| `isExpansion` | Cada id debe corresponder a un juego con `games.is_expansion = TRUE` | Si no, `400 error.session.expansion.not.expansion`. |
| Cacheado | `gameService.findOrFetch(bggId)` por cada id (base + expansiones). | Lazy-load: si no está en local, se trae de BGG y se persiste con `is_expansion`/`base_game_bgg_id` rellenos. |
| Duplicados en request | **Dedupe silencioso** | El service usa `LinkedHashSet` preservando orden. |
| Listados | `SessionSummaryResponse.expansionCount: int` | Solo el conteo, no la lista. Mantiene payload ligero. |
| Detalle | `SessionDetailResponse.expansions: List<ExpansionSummary>` | `{ bggId, name, thumbnailUrl }` en orden. |
| Filtrado por expansión | **Deferred** | `SessionSearchCriteria` no añade `expansionBggId` en v1. |
| Update | `UpdateSessionRequest.expansionBggIds` opcional | PATCH semantics: `null` = no se toca, `[]` = vacía, `[...]` = reemplaza la lista entera. |
| Restricción de cambio | `baseGameId` **sigue inmutable** | Cambiar expansiones sí está permitido al creador. |

### Schema — `V7__game_metadata_and_session_expansions.sql`

```sql
ALTER TABLE games
    ADD COLUMN is_expansion     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN base_game_bgg_id BIGINT  NULL;

CREATE INDEX idx_games_base_game_bgg_id ON games (base_game_bgg_id);

CREATE TABLE game_session_expansions (
    session_id   BIGINT NOT NULL,
    expansion_id BIGINT NOT NULL,
    position     INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, expansion_id),
    CONSTRAINT fk_gse_session   FOREIGN KEY (session_id)   REFERENCES game_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_gse_expansion FOREIGN KEY (expansion_id) REFERENCES games(bgg_id),
    INDEX idx_gse_session   (session_id),
    INDEX idx_gse_expansion (expansion_id)
);
```

Notas:

- `games.is_expansion` / `games.base_game_bgg_id` se rellenan al persistir lazy desde BGG (`BggGameMapper.toEntity`).
- `base_game_bgg_id` **sin FK formal** para evitar problemas de orden de inserción cuando se cachean lazy (la expansión se inserta antes que su base en algunos flujos).
- `ON DELETE CASCADE` sobre `session_id` limpia al borrar la sesión; sin cascada sobre `expansion_id` (el catálogo `games` no se borra).

### Entity — `GameSession`

```java
@ManyToMany(fetch = FetchType.LAZY)
@JoinTable(
    name = "game_session_expansions",
    joinColumns = @JoinColumn(name = "session_id"),
    inverseJoinColumns = @JoinColumn(name = "expansion_id", referencedColumnName = "bgg_id")
)
@OrderColumn(name = "position")
private List<Game> expansions = new ArrayList<>();
```

### DTOs

**`CreateSessionRequest`** — campo nuevo opcional:

```java
@Size(max = 20)
List<@NotNull Long> expansionBggIds   // null o vacío = sin expansiones
```

**`UpdateSessionRequest`** — añade el mismo campo con la regla PATCH: `null` = no se toca; `[]` = vacía la lista; lista no vacía = reemplaza.

**`SessionDetailResponse`** — añade:

```java
List<ExpansionSummary> expansions   // record { Long bggId; String name; String thumbnailUrl; }
```

**`SessionSummaryResponse`** — añade:

```java
int expansionCount
```

Nuevo record:

```java
public record ExpansionSummary(Long bggId, String name, String thumbnailUrl) {}
```

### Validaciones en `GameSessionService` (create / update)

1. `gameService.findOrFetch(baseGameId)` — lazy-load del base. Si BGG no lo conoce, `404 error.games.base.not.found`.
2. Para cada `expansionBggId`:
   1. `gameService.findOrFetch(bggId)` — lazy-load. Mismo error si BGG no lo conoce.
   2. `expansion.isExpansion() == true` — si no, `400 error.session.expansion.not.expansion`.
   3. `expansion.baseGameBggId == session.baseGame.bggId` — si no, `400 error.session.expansion.wrong.base`.
3. Dedupe preservando orden (`LinkedHashSet`).
4. Persistir en `game_session_expansions` con `position = índice` (vía `@OrderColumn` al guardar la sesión). La relación base ↔ expansión queda implícita en `games.base_game_bgg_id`, sin tabla join auxiliar.

### Códigos de error nuevos (i18n)

| Clave | HTTP | Cuándo |
|-------|------|--------|
| `error.session.expansion.not.expansion` | 400 | El id apunta a un juego con `is_expansion=false` |
| `error.session.expansion.wrong.base`    | 400 | La expansión no pertenece al juego base de la partida |
| `error.games.base.not.found`            | 404 | BGG no conoce el `bggId` (reusada para base y expansiones) |

> `>20` expansiones se rechaza con `error.validation` (Bean Validation `@Size(max=20)`).
> No hay clave dedicada `expansions.too.many` — se trata como validación de campo.

### Tests añadidos (✅ todos pasando — 115/115)

**`GameSessionServiceImplTest`** (+6):

- `create_withValidExpansions_persistsThemInOrderWithoutDuplicates`
- `create_withExpansionOfDifferentBase_throws`
- `create_withBaseGameInExpansionList_throws`
- `update_withNullExpansions_keepsExistingList`
- `update_withEmptyExpansionsList_clearsThem`
- `update_withNewExpansionsList_replacesEntirely`

**`GameSessionControllerTest`** (+2):

- `create_withExpansions_returns201_andResponseIncludesThem`
- `create_with21Expansions_returns400`

**`GameServiceImplTest`** (nuevo, +4) — cubre el lazy-load:

- `findOrFetch_whenCachedLocally_returnsWithoutHittingBgg`
- `findOrFetch_whenNotCached_fetchesFromBggAndPersists`
- `findOrFetch_whenBggDoesNotKnowId_throws`
- `findOrFetch_withNullId_throws`

### Cambios colaterales

- `GameSessionServiceImpl` ya no inyecta `GameRepository` directamente; usa `GameService.findOrFetch` para resolver base + expansiones de forma uniforme. Esto **también** corrige el bug pre-existente de que `create` esperaba juegos pre-seedeados.
- `BggGameMapper.toEntity(BggThingResult.Item)` nuevo método para mapear a `Game` con flags poblados (antes solo existía `toResponse` para el DTO de búsqueda).

---

## Chat por partida (Fase 2) ✅ implementado

> Mensajería entre participantes mientras la partida está activa. Solo PLAYER y creador pueden escribir; WAITLIST puede leer. Al pasar a COMPLETED o CANCELLED, los mensajes se borran.

### Schema — `V11__session_messages_and_chat_read.sql`

```sql
CREATE TABLE session_messages (
    id         BIGINT        NOT NULL AUTO_INCREMENT,
    session_id BIGINT        NOT NULL,
    user_id    BIGINT        NOT NULL,
    content    VARCHAR(500)  NOT NULL,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_sm_session FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sm_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    INDEX idx_sm_session_created (session_id, created_at)
);

ALTER TABLE session_participants
    ADD COLUMN last_chat_read_at DATETIME NULL;
```

- `ON DELETE CASCADE` en `session_id` como red de seguridad; el borrado explícito se hace en el lifecycle hook (ver más abajo).
- `last_chat_read_at` base del cálculo de `chatUnreadCount` en `SessionDetailResponse`.

### Entidad — `SessionMessage`

`com.matchplay.session.entity.SessionMessage`. Campos:

- `session: GameSession` (`@ManyToOne(fetch = LAZY)`)
- `user: User` (`@ManyToOne(fetch = LAZY)`)
- `content: String`
- `createdAt: Instant` (`@CreationTimestamp`)

### Repository — `SessionMessageRepository`

| Método | Propósito |
|--------|-----------|
| `findBySessionIdOrderByCreatedAtAsc(id)` | Lista todos los mensajes ASC (con `JOIN FETCH m.user` para evitar N+1) |
| `findBySessionIdAndCreatedAtAfterOrderByCreatedAtAsc(id, since)` | Lista mensajes desde `since` ASC (idem JOIN FETCH) |
| `countUnread(sessionId, excludeUserId, since)` | Cuenta mensajes del session posteriores a `since` que no son del propio caller |
| `countBySessionId(sessionId)` | Cuenta total de mensajes (base del `chatMessageCount` público) |
| `deleteBySessionId(sessionId)` | `@Modifying @Transactional` — limpieza en lifecycle hook |

### Service — `SessionChatService(Impl)`

Tres métodos con autorización propia:

**`list(sessionId, since?)`**

- Autorización: participante (PLAYER o WAITLIST) o creador. Si no, `SessionChatForbiddenException` (403).
- Si `since` presente, usa `findBySessionIdAndCreatedAtAfter`; si no, `findBySessionIdOrderByCreatedAtAsc`.
- Devuelve `List<SessionMessageResponse>` ordenada ASC.

**`send(sessionId, request)`**

- Autorización en orden (evita state leakage):
  1. `assertParticipantOrCreator` → 403 `SessionChatForbiddenException` si outsider.
  2. Status check → 409 `SessionChatClosedException` si `COMPLETED` o `CANCELLED`.
  3. Role check → 403 `SessionChatWriteForbiddenException` si `WAITLIST`.
- Persiste `SessionMessage`. Devuelve `SessionMessageResponse` con **HTTP 201**.

**`markRead(sessionId)`**

- Actualiza `last_chat_read_at = now()` en el `SessionParticipant` del caller.
- No-op para el creador (no tiene fila en `session_participants`).
- 403 si outsider.
- Devuelve 204 No Content.

### Excepciones nuevas

Todas en `com.matchplay.exception`, extienden `MatchplayException`:

| Clase | HTTP | Clave i18n |
|-------|------|------------|
| `SessionChatForbiddenException` | 403 | `error.session.chat.forbidden` |
| `SessionChatWriteForbiddenException` | 403 | `error.session.chat.write.forbidden` |
| `SessionChatClosedException` | 409 | `error.session.chat.closed` |

### Endpoints REST

Base: `/api/v1/sessions/{id}/messages`. Todos requieren JWT.

| Método | Path | Auth granular | Descripción | HTTP |
|--------|------|---------------|-------------|------|
| `GET` | `/sessions/{id}/messages` | Participante o creador | Lista mensajes ASC. `?since=ISO` opcional | 200 |
| `POST` | `/sessions/{id}/messages` | PLAYER o creador | Crea mensaje | 201 |
| `POST` | `/sessions/{id}/messages/mark-read` | Cualquier participante | Actualiza `last_chat_read_at` | 204 |

### `SessionDetailResponse` — campos de chat

Ambos campos están presentes siempre en el JSON (anotación `@JsonInclude(ALWAYS)` en el record):

| Campo | Tipo Java | Semántica |
|-------|-----------|-----------|
| `chatUnreadCount` | `Integer` | `null` si caller anónimo o outsider; `0` si creador o sesión terminal; `N` si hay N mensajes sin leer |
| `chatMessageCount` | `Integer` | `null` si sesión `COMPLETED` o `CANCELLED`; `0` o `N` total de mensajes en sesión activa |

`chatUnreadCount` va justo después de `creatorUsername`; `chatMessageCount` va después de `chatUnreadCount`.

### Lifecycle hook en `changeStatus`

Cuando el nuevo status es `COMPLETED` o `CANCELLED`, `GameSessionServiceImpl.changeStatus` llama a `messageRepository.deleteBySessionId(sessionId)` dentro de la misma transacción, antes de persistir el cambio de estado. El `last_chat_read_at` de los participantes queda en `NULL` (no se vuelve a consultar).

---

## Pendientes / siguiente fase

### Fase 2 (engagement)

- `GET /api/v1/sessions/mine?scope=ORGANIZING|JOINED|UPCOMING|PAST` paginado.
- Notificación cuando un WAITLIST se promociona a PLAYER (depende de módulo de notificaciones).
- Rate limit en `POST /sessions` y `POST .../messages` (Bucket4j por usuario).
- Job programado para transiciones `OPEN/FULL → IN_PROGRESS → COMPLETED` por fecha.

### Fase 3 (trust loop)

- Ratings post-evento (`/sessions/{id}/ratings/pending`, `/ratings`).
- `GET /sessions/history` con DTO enriquecido (sesiones + ratings dados/recibidos).

### Mantenimiento técnico

- Cuando todas las migraciones legacy queden libres de uso, `V_X__drop_legacy_events.sql` para eliminar `events`, `event_*`.
