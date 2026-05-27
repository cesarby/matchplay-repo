# Session Chat (MVP) — Design

**Fecha**: 2026-05-27
**Estado**: Borrador para aprobación
**Ámbito**: chat de coordinación atado a cada `GameSession`, accesible desde la session detail page

## Contexto

La detail page ya muestra un placeholder `<SessionChatPlaceholder>` en la sidebar (commit `c76ed28`) anticipando una feature de mensajería entre jugadores apuntados. Este documento define la primera implementación funcional.

El chat es una herramienta de **coordinación práctica** antes de la partida: confirmar asistencia, avisar de retrasos, decir qué expansión llevar, cómo llegar al sitio. No es una red social. Cuando la partida termina (`COMPLETED`) o se cancela (`CANCELLED`) el chat muere — los mensajes se borran y el bloque desaparece de la UI.

## Reglas de producto

- **Un hilo por `GameSession`**. No hay multi-canal ni sub-hilos.
- **Audiencia**:
  - Creador y participantes con rol `PLAYER`: leen y escriben.
  - Participantes con rol `WAITLIST`: solo leen, con aviso en la UI ("Entrarás al chat al apuntarte").
  - Usuarios anónimos o no participantes: no ven el chat (el botón está oculto).
- **Ciclo de vida**:
  - Crear partida → hilo vacío implícitamente disponible.
  - Status `OPEN`, `FULL` o `IN_PROGRESS`: hilo activo.
  - Status pasa a `COMPLETED` o `CANCELLED`: hard delete inmediato de todos los `session_messages` y `last_chat_read_at` del hilo. La eliminación va dentro del mismo `@Transactional` que cambia el status para garantizar consistencia.
- **Sin edición ni borrado** de mensajes propios. Una vez enviado, está. Si te equivocas, escribes otro corrigiendo.
- **Sin moderación** del creador. La audiencia cerrada (apuntados) hace que el riesgo de abuso sea bajo. Si hay abuso real lo abordamos como excepción puntual, no como feature.

## Modelo de datos (Migración V11)

```sql
CREATE TABLE session_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_msg_session FOREIGN KEY (session_id)
        REFERENCES game_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_msg_user FOREIGN KEY (user_id)
        REFERENCES users(id),
    INDEX idx_session_messages_session_created (session_id, created_at)
);

ALTER TABLE session_participants
    ADD COLUMN last_chat_read_at TIMESTAMP NULL;
```

Razones de diseño:

- `content VARCHAR(1000)`: suficiente para un párrafo de coordinación. Cualquier mensaje más largo es señal de que el chat se está usando mal y conviene cortarlo en varios envíos.
- `ON DELETE CASCADE` en `session_id`: cuando se borre una `game_sessions` (hoy nunca, pero por consistencia futura), los mensajes desaparecen con ella.
- `INDEX (session_id, created_at)`: el query dominante es "dame los N mensajes más recientes de esta sesión" o "dame los posteriores a X" — este índice cubre ambos.
- `last_chat_read_at` vive en `session_participants` (no en una tabla aparte) porque ya está keyed por `(session_id, user_id)` y la cardinalidad es la misma. Una tabla adicional sería duplicación.

## Backend — API

| Método | Path | Autorización | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/sessions/{id}/messages` | Participante (PLAYER, WAITLIST) o creador | Devuelve mensajes ordenados ASC por `created_at`. Query param opcional `since=<ISO>` para polling delta (devuelve solo mensajes con `created_at > since`). |
| `POST` | `/api/v1/sessions/{id}/messages` | PLAYER o creador (NO waitlist) | Crea mensaje. Body `{content: string}`. Devuelve el mensaje creado. |
| `POST` | `/api/v1/sessions/{id}/messages/mark-read` | Cualquier participante | Actualiza `last_chat_read_at = NOW()` para el caller. Idempotente, sin body. Devuelve 204. |

DTOs:

```java
public record SessionMessageResponse(
    Long id,
    Long userId,
    String username,
    String content,
    Instant createdAt
) {}

public record CreateMessageRequest(
    @NotBlank @Size(max = 1000) String content
) {}
```

Errores nuevos:

- `SessionChatForbiddenException` (HTTP 403, code `error.session.chat.forbidden`): caller no es participante de la sesión.
- `SessionChatWriteForbiddenException` (HTTP 403, code `error.session.chat.write.forbidden`): caller es WAITLIST e intenta postear.
- `SessionChatClosedException` (HTTP 409, code `error.session.chat.closed`): status es `COMPLETED` o `CANCELLED` (escritura bloqueada como salvaguarda incluso si el botón ya no aparece).

`SessionDetailResponse` añade un campo nuevo `Integer chatUnreadCount`:

- `null` si el caller es anónimo o no participante.
- `0` si está al día.
- `N > 0` con el número de mensajes posteriores a `last_chat_read_at` que no son del propio caller.

El cálculo se hace en el mismo build del detail (un `COUNT` adicional indexado, no es caro).

**Borrado al cerrar/cancelar**: en `GameSessionServiceImpl.changeStatus` y `close`, si el nuevo status es `COMPLETED` o `CANCELLED`, se ejecuta `DELETE FROM session_messages WHERE session_id = ?` dentro de la misma transacción. El `last_chat_read_at` se queda en la tabla `session_participants` con NULL (o se resetea, da igual — ya no se consulta). Si el participante se sale del chat por completo, su fila se borra (comportamiento ya existente de `leave`).

## Frontend — componentes e interacción

Renombrar `SessionChatPlaceholder.tsx` → `SessionChatButton.tsx`:

- Si `data.chatUnreadCount === null` → no renderizar (anónimo / no participante).
- Si visible: card pequeña en la sidebar (misma ubicación actual del placeholder) con:
  - Icono `MessageSquare`.
  - Texto "Chat" + badge rojo con `N` si `chatUnreadCount > 0`.
  - Toda la card es clicable → abre el drawer.

Nuevo `SessionChatDrawer.tsx`:

- **Desktop**: panel deslizante derecho, ~420px ancho, full-height, sombra y backdrop semi-transparente. Cerrable con click fuera, tecla Escape o botón X.
- **Mobile (< 640px)**: full-screen modal. Mismo backdrop.
- Estructura:
  - Header: título "Chat — {titulo de partida}" + botón cerrar.
  - Body scrollable: lista de mensajes. Cada mensaje renderiza username + timestamp relativo + content. Mensajes propios alineados a la derecha con color de acento; ajenos a la izquierda. Auto-scroll al fondo al abrir y al recibir nuevos.
  - Footer:
    - Si soy PLAYER o creador: `<textarea>` autoresize (1-5 líneas), placeholder "Escribe un mensaje…", contador `X/1000`, botón Enviar. Enter envía, Shift+Enter newline. Botón disabled si content vacío o > 1000.
    - Si soy WAITLIST: textarea deshabilitado con placeholder "Entrarás al chat al apuntarte como jugador".

Comportamiento:

- **Al abrir**: dispara `useMarkChatReadMutation` (no espera respuesta para cerrar el badge — optimistic). Pone `chatUnreadCount = 0` localmente en la cache de TanStack Query.
- **Polling**: `useChatMessagesQuery` con `enabled: drawerOpen`, `refetchInterval: 10_000`. Al cerrar el drawer, polling se detiene automáticamente.
- **Al enviar**: optimistic update — insertar el mensaje localmente con un id temporal y `pending: true` antes de la respuesta. Si el POST devuelve OK, reemplazar el temporal por el real. Si falla, rollback (quitar el temporal) y mostrar toast/error inline "No se ha podido enviar".

Archivos nuevos:

- `frontend/src/features/sessions/api/messagesApi.ts` con `list(sessionId, since?)`, `send(sessionId, content)`, `markRead(sessionId)`.
- `frontend/src/features/sessions/hooks/useChatMessages.ts` con `useChatMessagesQuery`, `useSendMessageMutation`, `useMarkChatReadMutation`.
- `frontend/src/features/sessions/components/SessionChatDrawer.tsx`.
- `frontend/src/features/sessions/components/ChatMessageRow.tsx` (componente fila reutilizable).
- Renombrar `SessionChatPlaceholder.tsx` → `SessionChatButton.tsx`.

Tipos en `session.types.ts`:

```ts
export interface SessionMessage {
  id: number
  userId: number
  username: string
  content: string
  createdAt: string // ISO Instant
}

// SessionDetail añade:
chatUnreadCount: number | null
```

i18n nuevas claves bajo `sessions.chat`:

- `title` "Chat"
- `headerTitle` "Chat — {{session}}"
- `inputPlaceholder` "Escribe un mensaje…"
- `inputPlaceholderWaitlist` "Entrarás al chat al apuntarte como jugador."
- `send` "Enviar"
- `empty` "Sé el primero en escribir."
- `loadError` "No se han podido cargar los mensajes."
- `sendError` "No se ha podido enviar tu mensaje."

## Polling y badge

- **Drawer abierto**: `useChatMessagesQuery` corre cada 10s. Latencia visible 0-10s entre envío y recepción para los demás.
- **Drawer cerrado**: el badge se actualiza cuando `useSessionDetailQuery` refetchea. TanStack Query refetchea cuando el query está stale (más de 30s desde el último fetch) Y ocurre un trigger: navegación que remonta el componente, o foco de ventana (`refetchOnWindowFocus`, activado por defecto). No hay polling activo de fondo. En la práctica: al volver a la pestaña tras un rato, el badge se actualiza. Suficiente para coordinación.
- Si en el futuro necesitamos badge en tiempo real (no es prioritario), añadir un endpoint ligero `GET /api/v1/sessions/{id}/messages/unread-count` polleable independientemente. Para MVP no.

## Tests

**Backend** (~10 nuevos):

- Servicio:
  - `list_returnsMessagesAsc`, `list_filtersBySince`
  - `send_ok_asPlayer`, `send_ok_asCreator`
  - `send_throws_asWaitlist`, `send_throws_asAnonymous`, `send_throws_whenCompleted`, `send_throws_whenContentExceedsMax`
  - `markRead_setsLastChatReadAt`
  - `closeSession_deletesAllMessages`, `cancelSession_deletesAllMessages`
  - `getDetail_chatUnreadCount_isNullForAnonymous`
  - `getDetail_chatUnreadCount_counts_onlyOthersMessages_afterLastRead`
- Controller:
  - 200/403/409 por endpoint, autorización por rol.

**Frontend** (~8 nuevos):

- `SessionChatButton`: badge oculto si count 0, visible si > 0, oculto si null.
- `SessionChatDrawer`:
  - Cierra con Escape, click fuera, botón X.
  - Send: optimistic insert, rollback on error.
  - Enter envía, Shift+Enter newline.
  - WAITLIST: input disabled con mensaje correcto.
  - Al abrir: dispara markRead.
- Polling se activa solo cuando el drawer está abierto.

## Plan de entrega (orientativo, se afina en writing-plans)

1. **BE Migración + Modelo** — V11, entity `SessionMessage`, repository.
2. **BE Endpoints + autorización** — service + controller + tests.
3. **BE Hook al lifecycle** — borrado al `changeStatus` / `close`, augmentar `SessionDetailResponse`.
4. **FE API + hooks + types** — capa de datos.
5. **FE Botón con badge** — reemplaza el placeholder.
6. **FE Drawer + mensajes + send** — el grueso visual.
7. **FE Polling + markRead** — comportamiento dinámico.

## Out of scope futuro (puede que sí)

- Notificaciones email / push al recibir mensaje.
- Reacciones / threads / replies sobre un mensaje.
- Rate limiting (añadir solo si vemos abuso real).
- Búsqueda dentro del historial.

## Rechazado explícitamente (no construir)

Las siguientes ideas se han evaluado y descartado para mantener el chat enfocado en su rol de herramienta de coordinación práctica. **No proponer en sesiones futuras**:

- Typing indicators / presencia online.
- DMs entre usuarios fuera del contexto de una partida.
- Moderación del creador (borrar mensajes ajenos, expulsar usuarios del chat).
- Adjuntar imágenes, archivos o enlaces ricos (cards de previsualización).
