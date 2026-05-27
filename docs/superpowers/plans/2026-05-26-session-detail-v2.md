# Session Detail v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar la página de detalle de partida con 3 features: contador de apuntados con acompañantes, edición/cierre de mesa por el creador, y resumen del juego generado por Claude Haiku.

**Architecture:**
- F1 es solo frontend, reutiliza datos ya expuestos por `SessionDetailResponse`.
- F2 reutiliza el endpoint `PATCH /sessions/{id}` que ya existe; añade endpoint nuevo `POST /sessions/{id}/close` y 2 modales en frontend.
- F3 añade módulo `ai/` en backend con cliente Claude Haiku (con bean Noop si no hay API key), migración V10 para `description` + `summary_es` + `summary_en` en `games`, integración en `GameServiceImpl.findOrFetch`.

**Tech Stack:** Spring Boot 3 (Java 21), Flyway, React 18 + Vite + TanStack Query + Tailwind, react-day-picker, Claude API (Haiku 4.5).

**Spec de referencia:** [docs/superpowers/specs/2026-05-26-session-detail-v2-design.md](../specs/2026-05-26-session-detail-v2-design.md)

---

## File Structure

### Modificados (Frontend)
- `frontend/src/features/sessions/pages/SessionDetailPage.tsx` — contador + acompañantes + botones edit/close + bloque resumen juego
- `frontend/src/features/sessions/components/SessionPlayerRow.tsx` — nueva prop `guest?: boolean`
- `frontend/src/features/sessions/api/sessionsApi.ts` — añadir `close(id)`
- `frontend/src/features/sessions/hooks/useSessions.ts` — añadir `useCloseSessionMutation`
- `frontend/src/features/sessions/types/session.types.ts` — `SessionDetail.baseGameSummary?: string | null`
- `frontend/src/features/sessions/lib/errorMapping.ts` — mensajes nuevos
- `frontend/src/shared/i18n/locales/es.json` y `en.json` — nuevas claves

### Creados (Frontend)
- `frontend/src/features/sessions/components/EditSessionModal.tsx`
- `frontend/src/features/sessions/components/CloseSessionModal.tsx`
- `frontend/src/features/sessions/__tests__/EditSessionModal.test.tsx`
- `frontend/src/features/sessions/__tests__/CloseSessionModal.test.tsx`

### Modificados (Backend)
- `backend/src/main/java/com/matchplay/session/service/GameSessionService.java` — añadir método `close(Long id)`
- `backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java` — implementar `close`
- `backend/src/main/java/com/matchplay/session/controller/GameSessionController.java` — endpoint `POST /{id}/close`
- `backend/src/main/java/com/matchplay/game/entity/Game.java` — campos `description`, `summaryEs`, `summaryEn`
- `backend/src/main/java/com/matchplay/game/client/xml/BggThingResult.java` — añadir `description` al `Item`
- `backend/src/main/java/com/matchplay/game/mapper/BggGameMapper.java` — mapear description
- `backend/src/main/java/com/matchplay/game/service/GameServiceImpl.java` — llamar `AiSummaryClient`
- `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java` — añadir `String baseGameSummary`
- `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java` — selección de idioma
- `backend/src/main/resources/application.yml` — `anthropic.api-key: ${ANTHROPIC_API_KEY:}`
- `backend/.gitignore` (si no existe la entrada) — `.env.local`

### Creados (Backend)
- `backend/src/main/resources/db/migration/V10__games_description_and_summary.sql`
- `backend/src/main/java/com/matchplay/exception/SessionEmptyCannotCloseException.java`
- `backend/src/main/java/com/matchplay/ai/AiSummaryClient.java` (interface)
- `backend/src/main/java/com/matchplay/ai/ClaudeHaikuSummaryClient.java`
- `backend/src/main/java/com/matchplay/ai/NoopSummaryClient.java`
- `backend/src/main/java/com/matchplay/ai/GameSummary.java`
- `backend/src/main/java/com/matchplay/ai/AiConfig.java`
- `backend/src/test/java/com/matchplay/ai/ClaudeHaikuSummaryClientTest.java`

### Tests modificados
- `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx`
- `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java`
- `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java`
- `backend/src/test/java/com/matchplay/game/service/GameServiceImplTest.java` (si existe; si no, crear)

---

# Feature 1 — Apuntados con acompañantes

### Task 1: Contador + filas de acompañantes en sidebar

**Files:**
- Modify: `frontend/src/features/sessions/components/SessionPlayerRow.tsx`
- Modify: `frontend/src/features/sessions/pages/SessionDetailPage.tsx:178-200` (sección Players)
- Modify: `frontend/src/shared/i18n/locales/es.json`
- Modify: `frontend/src/shared/i18n/locales/en.json`
- Modify: `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx`

- [ ] **Step 1: Añadir prop `guest` al SessionPlayerRow**

Edita `SessionPlayerRow.tsx` reemplazando el contenido:

```tsx
import { useTranslation } from 'react-i18next'

import type { SessionPlayer } from '../types/session.types'

interface SessionPlayerRowProps {
  player: SessionPlayer
  /** Si true, prefija un "#N" con la posición en cola (solo WAITLIST). */
  showPosition?: boolean
  /** Si se pasa, esta fila representa un acompañante del creador (no es un usuario real). */
  guestOf?: string
}

/**
 * Fila de un jugador apuntado. Si `guestOf` está informado, la fila se renderiza
 * como acompañante (sin enlace a perfil, estilo muted).
 */
export function SessionPlayerRow({ player, showPosition = false, guestOf }: SessionPlayerRowProps) {
  const { t } = useTranslation()
  if (guestOf) {
    return (
      <li className="flex items-center justify-between gap-3 rounded border border-dashed border-border bg-muted/30 px-3 py-2">
        <p className="text-sm italic text-muted-foreground">
          {t('sessions.detail.guestOf', { username: guestOf })}
        </p>
      </li>
    )
  }
  return (
    <li className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        {showPosition && player.position != null && (
          <span
            aria-label={`Posición ${player.position}`}
            className="inline-flex size-7 items-center justify-center rounded-full bg-yellow-soft text-xs font-bold text-foreground"
          >
            {player.position}
          </span>
        )}
        <p className="text-sm font-medium text-foreground">@{player.username}</p>
      </div>
    </li>
  )
}
```

Nota: cuando `guestOf` está informado, el `player` recibido puede ser un mock — solo lo ignoramos. Para evitar warning, pasamos un objeto vacío al renderizar acompañantes (ver paso 3).

- [ ] **Step 2: Añadir claves i18n**

En `frontend/src/shared/i18n/locales/es.json`, dentro de `sessions.detail` añadir:
```json
"guestOf": "+1 acompañante de @{{username}}"
```

En `en.json`:
```json
"guestOf": "+1 guest of @{{username}}"
```

- [ ] **Step 3: Actualizar SessionDetailPage para mostrar guests**

En `SessionDetailPage.tsx`, sección Players (líneas ~181-200) reemplazar por:

```tsx
{/* Players */}
<section aria-labelledby="players-heading">
  <h2
    id="players-heading"
    className="mb-3 flex items-center justify-between font-display text-lg font-bold text-foreground"
  >
    <span>{t('sessions.detail.playersHeading')}</span>
    <span className="text-sm font-normal text-muted-foreground">
      {data.registeredPlayers}/{data.maxPlayers}
    </span>
  </h2>
  {players.length > 0 ? (
    <ul className="space-y-2">
      {players.map((p) => (
        <SessionPlayerRow key={p.userId} player={p} />
      ))}
      {data.creatorGuests > 0 &&
        data.creatorUsername &&
        Array.from({ length: data.creatorGuests }).map((_, idx) => (
          <SessionPlayerRow
            key={`guest-${idx}`}
            player={{ userId: -1, username: '', role: 'PLAYER', position: null, joinedAt: '' }}
            guestOf={data.creatorUsername!}
          />
        ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">—</p>
  )}
</section>
```

- [ ] **Step 4: Escribir test que falla**

Abrir `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx` y añadir el siguiente `it` dentro del `describe` existente:

```tsx
it('muestra el contador como registeredPlayers/maxPlayers e incluye filas de acompañantes', async () => {
  server.use(
    rest.get('*/sessions/2', (_req, res, ctx) =>
      res(
        ctx.json({
          ...baseDetail,
          id: 2,
          maxPlayers: 4,
          registeredPlayers: 3, // creador (1) + 2 guests
          creatorGuests: 2,
          creatorUsername: 'cesarby',
          players: [
            {
              userId: 1,
              username: 'cesarby',
              role: 'PLAYER',
              position: null,
              joinedAt: '2026-05-25T10:00:00Z',
            },
          ],
        }),
      ),
    ),
  )
  renderWithProviders(<SessionDetailPage />, { route: '/sessions/2' })
  expect(await screen.findByText('3/4')).toBeInTheDocument()
  expect(screen.getAllByText(/acompañante de @cesarby/i)).toHaveLength(2)
})
```

(Si `baseDetail` no existe en ese fichero, créalo arriba como objeto reutilizable copiando los campos del fixture actual.)

- [ ] **Step 5: Ejecutar test y verificar que pasa**

Run: `cd frontend && npm test -- SessionDetailPage`
Expected: el test nuevo PASS, el resto siguen PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/sessions/components/SessionPlayerRow.tsx \
        frontend/src/features/sessions/pages/SessionDetailPage.tsx \
        frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "fix(sessions): contador y acompañantes coherentes en detail"
```

---

# Feature 2 — Editar y cerrar mesa (creador)

### Task 2: Backend — excepción nueva + método `close` en service

**Files:**
- Create: `backend/src/main/java/com/matchplay/exception/SessionEmptyCannotCloseException.java`
- Modify: `backend/src/main/java/com/matchplay/session/service/GameSessionService.java`
- Modify: `backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java`
- Modify: `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java`

- [ ] **Step 1: Crear excepción**

Crea `backend/src/main/java/com/matchplay/exception/SessionEmptyCannotCloseException.java`:

```java
package com.matchplay.exception;

/**
 * Lanzada al intentar cerrar una mesa donde solo está el creador (más sus
 * acompañantes). No hay terceros apuntados, así que "cerrar" no tiene
 * sentido — el creador debería cancelar la partida en su lugar.
 */
public class SessionEmptyCannotCloseException extends RuntimeException {
    public SessionEmptyCannotCloseException() {
        super("error.session.empty.cannot.close");
    }
}
```

- [ ] **Step 2: Mapear excepción en `GlobalExceptionHandler`**

Localiza el handler (típicamente `backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java`) y añade un `@ExceptionHandler(SessionEmptyCannotCloseException.class)` que devuelva HTTP 400 con `code = "SESSION_EMPTY_CANNOT_CLOSE"` y el mensaje resuelto por i18n a partir de `getMessage()`. Sigue el patrón ya usado por `SessionAlreadyJoinedException` o similar — copia su forma exacta.

- [ ] **Step 3: Añadir clave i18n del mensaje**

En `backend/src/main/resources/messages_es.properties`:
```
error.session.empty.cannot.close=No puedes cerrar una mesa vacía contigo mismo. Cancélala en su lugar.
```

En `messages_en.properties`:
```
error.session.empty.cannot.close=You cannot close an empty table with only yourself. Cancel it instead.
```

- [ ] **Step 4: Añadir método al interface del service**

En `GameSessionService.java` añadir junto a los demás métodos:

```java
/**
 * Cierra una mesa anticipadamente: baja {@code maxPlayers} a los actuales y
 * pone status FULL. Solo el creador, solo si OPEN, y debe haber al menos
 * un tercero apuntado (no cuentan los creatorGuests).
 */
SessionDetailResponse close(Long sessionId);
```

- [ ] **Step 5: Escribir tests del service que fallan**

En `GameSessionServiceImplTest.java`, añadir bloque de tests:

```java
@Nested
class CloseSession {

    @Test
    void close_ok_setsMaxToRegisteredAndStatusFull() {
        // arrange: partida OPEN, 4 max, creador + 1 player apuntado (registered=2)
        GameSession s = givenOpenSessionWithCreatorAnd(/*otherPlayers=*/1, /*max=*/4, /*guests=*/0);
        when(currentUserProvider.requireCurrentUserId()).thenReturn(s.getCreator().getId());
        when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
        when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
                .thenReturn(participantsOf(s));

        SessionDetailResponse out = service.close(s.getId());

        assertThat(out.maxPlayers()).isEqualTo(2);
        assertThat(out.status()).isEqualTo(SessionStatus.FULL);
    }

    @Test
    void close_emptyExceptCreator_throws() {
        GameSession s = givenOpenSessionWithCreatorAnd(0, 4, 0);
        when(currentUserProvider.requireCurrentUserId()).thenReturn(s.getCreator().getId());
        when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> service.close(s.getId()))
                .isInstanceOf(SessionEmptyCannotCloseException.class);
    }

    @Test
    void close_creatorGuestsDoNotCountAsThirdParty() {
        // creador + 2 guests, registered=3, pero 0 terceros
        GameSession s = givenOpenSessionWithCreatorAnd(0, 4, 2);
        when(currentUserProvider.requireCurrentUserId()).thenReturn(s.getCreator().getId());
        when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> service.close(s.getId()))
                .isInstanceOf(SessionEmptyCannotCloseException.class);
    }

    @Test
    void close_alreadyFull_throws() {
        GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
        s.setStatus(SessionStatus.FULL);
        when(currentUserProvider.requireCurrentUserId()).thenReturn(s.getCreator().getId());
        when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> service.close(s.getId()))
                .isInstanceOf(SessionStatusTransitionException.class);
    }

    @Test
    void close_notOwner_throws() {
        GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
        when(currentUserProvider.requireCurrentUserId()).thenReturn(999L);
        when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> service.close(s.getId()))
                .isInstanceOf(UnauthorizedActionException.class);
    }
}
```

Si no existe el helper `givenOpenSessionWithCreatorAnd`, añade uno arriba en la clase de test:

```java
/**
 * Crea una GameSession OPEN con un creador (id=1) y N otros usuarios apuntados
 * como PLAYER, más {@code guests} acompañantes del creador.
 */
private GameSession givenOpenSessionWithCreatorAnd(int otherPlayers, int max, int guests) {
    User creator = new User();
    creator.setId(1L);
    creator.setUsername("creator");

    GameSession s = new GameSession();
    s.setId(100L);
    s.setCreator(creator);
    s.setMaxPlayers(max);
    s.setCreatorGuests(guests);
    s.setRegisteredPlayers(1 + guests + otherPlayers);
    s.setStatus(SessionStatus.OPEN);
    // baseGame mínimo para que validateAgainstGameLimits no peté
    Game g = new Game();
    g.setBggId(42L);
    g.setName("test");
    s.setBaseGame(g);
    return s;
}

private List<SessionParticipant> participantsOf(GameSession s) {
    List<SessionParticipant> out = new ArrayList<>();
    SessionParticipant p = new SessionParticipant(s, s.getCreator());
    out.add(p);
    // Otros players (anónimos para el test): inferimos del registered - 1 - guests
    int others = s.getRegisteredPlayers() - 1 - s.getCreatorGuests();
    for (int i = 0; i < others; i++) {
        User u = new User();
        u.setId(1000L + i);
        u.setUsername("user" + i);
        out.add(new SessionParticipant(s, u));
    }
    return out;
}
```

- [ ] **Step 6: Ejecutar tests y verificar que fallan**

Run: `cd backend && ./mvnw test -Dtest=GameSessionServiceImplTest#CloseSession*`
(En Windows PowerShell: `cd backend; .\mvnw.cmd test "-Dtest=GameSessionServiceImplTest#CloseSession*"`)
Expected: FAIL — `close` no existe.

- [ ] **Step 7: Implementar el método `close` en `GameSessionServiceImpl`**

Añade al final de la clase (antes de los helpers):

```java
@Override
@Transactional
public SessionDetailResponse close(Long sessionId) {
    GameSession session = requireSession(sessionId);
    assertOwner(session);
    if (session.getStatus() != SessionStatus.OPEN) {
        throw new SessionStatusTransitionException(session.getStatus().name(), "CLOSE");
    }
    int realThirdParties = session.getRegisteredPlayers() - 1 - session.getCreatorGuests();
    if (realThirdParties < 1) {
        throw new SessionEmptyCannotCloseException();
    }
    session.setMaxPlayers(session.getRegisteredPlayers());
    session.setStatus(SessionStatus.FULL);
    sessionRepository.save(session);
    log.info("Session closed: id={} max set to {} (FULL)", sessionId, session.getMaxPlayers());
    return buildDetail(session);
}
```

Añade los imports necesarios (`SessionEmptyCannotCloseException`).

- [ ] **Step 8: Ejecutar tests del service**

Run: `cd backend && ./mvnw test -Dtest=GameSessionServiceImplTest`
Expected: PASS todos.

- [ ] **Step 9: No commit aún** — sigue con la Task 3 (controller + tests) para mantener el commit coherente "endpoint completo".

### Task 3: Backend — controller endpoint + tests

**Files:**
- Modify: `backend/src/main/java/com/matchplay/session/controller/GameSessionController.java`
- Modify: `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java`

- [ ] **Step 1: Escribir test del controller que falla**

En `GameSessionControllerTest.java`, añadir:

```java
@Test
@WithMockUser
void close_returns200WithUpdatedDetail() throws Exception {
    SessionDetailResponse resp = detail(/*id=*/1L, /*max=*/2, /*registered=*/2,
            SessionStatus.FULL);
    when(sessionService.close(1L)).thenReturn(resp);

    mockMvc.perform(post("/api/v1/sessions/1/close").with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("FULL"))
            .andExpect(jsonPath("$.maxPlayers").value(2));
}

@Test
@WithMockUser
void close_returns400WhenEmpty() throws Exception {
    when(sessionService.close(1L)).thenThrow(new SessionEmptyCannotCloseException());

    mockMvc.perform(post("/api/v1/sessions/1/close").with(csrf()))
            .andExpect(status().isBadRequest());
}
```

(Si no existe el helper `detail(...)`, sigue el patrón ya presente en ese archivo — debería haber un builder.)

- [ ] **Step 2: Ejecutar test y verificar que falla**

Run: `cd backend && ./mvnw test -Dtest=GameSessionControllerTest`
Expected: FAIL — endpoint no existe.

- [ ] **Step 3: Añadir endpoint en el controller**

En `GameSessionController.java`, después de `leave`:

```java
@PostMapping("/{id}/close")
@Operation(summary = "Cerrar mesa: baja maxPlayers a los actuales y status FULL (solo creador)")
public SessionDetailResponse close(@PathVariable Long id) {
    return sessionService.close(id);
}
```

- [ ] **Step 4: Ejecutar tests del controller**

Run: `cd backend && ./mvnw test -Dtest=GameSessionControllerTest`
Expected: PASS todos.

- [ ] **Step 5: Ejecutar suite backend completa**

Run: `cd backend && ./mvnw test`
Expected: todos PASS (119 → 124 aprox).

- [ ] **Step 6: Commit parcial backend**

```bash
git add backend/src/main/java/com/matchplay/exception/SessionEmptyCannotCloseException.java \
        backend/src/main/java/com/matchplay/session/service/GameSessionService.java \
        backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java \
        backend/src/main/java/com/matchplay/session/controller/GameSessionController.java \
        backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java \
        backend/src/main/resources/messages_es.properties \
        backend/src/main/resources/messages_en.properties \
        backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java \
        backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java
git commit -m "feat(sessions): endpoint POST /sessions/{id}/close para cerrar mesa"
```

### Task 4: Frontend — `sessionsApi.close` + hook

**Files:**
- Modify: `frontend/src/features/sessions/api/sessionsApi.ts`
- Modify: `frontend/src/features/sessions/hooks/useSessions.ts`

- [ ] **Step 1: Añadir método a `sessionsApi`**

En `sessionsApi.ts`, dentro del objeto exportado, después de `leave`:

```ts
close: (id: number): Promise<SessionDetail> =>
  httpClient.post<SessionDetail>(`${BASE}/${id}/close`).then((r) => r.data),
```

- [ ] **Step 2: Añadir hook**

En `useSessions.ts`, después de `useLeaveSessionMutation`:

```ts
export function useCloseSessionMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => sessionsApi.close(id),
    onSuccess: (detail) => syncCacheFromDetail(qc, detail),
  })
}
```

- [ ] **Step 3: Verificación rápida**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errores.

(No commit aún, va junto con los modales.)

### Task 5: Frontend — `CloseSessionModal`

**Files:**
- Create: `frontend/src/features/sessions/components/CloseSessionModal.tsx`
- Create: `frontend/src/features/sessions/__tests__/CloseSessionModal.test.tsx`
- Modify: `frontend/src/shared/i18n/locales/es.json` y `en.json`

- [ ] **Step 1: Añadir claves i18n**

En `es.json` bajo `sessions`:
```json
"close": {
  "title": "Cerrar mesa",
  "body": "Cerrarás esta mesa con {{count}} jugadores. Nadie nuevo podrá apuntarse.",
  "bodyWithWaitlist": "Cerrarás esta mesa con {{count}} jugadores. Nadie nuevo podrá apuntarse, pero si alguien cancela los {{waitlist}} en cola podrán entrar.",
  "confirm": "Cerrar mesa",
  "cancel": "Cancelar"
}
```

En `en.json`:
```json
"close": {
  "title": "Close table",
  "body": "You will close this table with {{count}} players. No new players will be able to join.",
  "bodyWithWaitlist": "You will close this table with {{count}} players. No new players will be able to join, but if someone cancels the {{waitlist}} in queue can enter.",
  "confirm": "Close table",
  "cancel": "Cancel"
}
```

- [ ] **Step 2: Escribir test del modal que falla**

Crea `frontend/src/features/sessions/__tests__/CloseSessionModal.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, userEvent } from '@/test/utils'

import { CloseSessionModal } from '../components/CloseSessionModal'

describe('CloseSessionModal', () => {
  it('muestra body sin waitlist y dispara onConfirm al confirmar', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(
      <CloseSessionModal
        open
        registeredPlayers={3}
        waitlistCount={0}
        onConfirm={onConfirm}
        onClose={onClose}
        isPending={false}
      />,
    )
    expect(screen.getByText(/3 jugadores/i)).toBeInTheDocument()
    expect(screen.queryByText(/en cola/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /cerrar mesa/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('muestra body con waitlist cuando hay gente en cola', () => {
    renderWithProviders(
      <CloseSessionModal
        open
        registeredPlayers={4}
        waitlistCount={2}
        onConfirm={() => {}}
        onClose={() => {}}
        isPending={false}
      />,
    )
    expect(screen.getByText(/2 en cola/i)).toBeInTheDocument()
  })
})
```

(Si `@/test/utils` no expone `userEvent`, sustituye por `import userEvent from '@testing-library/user-event'`.)

- [ ] **Step 3: Implementar el modal**

Crea `frontend/src/features/sessions/components/CloseSessionModal.tsx`:

```tsx
import { useTranslation } from 'react-i18next'

interface CloseSessionModalProps {
  open: boolean
  registeredPlayers: number
  waitlistCount: number
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}

export function CloseSessionModal({
  open,
  registeredPlayers,
  waitlistCount,
  onConfirm,
  onClose,
  isPending,
}: CloseSessionModalProps) {
  const { t } = useTranslation()
  if (!open) return null
  const body =
    waitlistCount > 0
      ? t('sessions.close.bodyWithWaitlist', {
          count: registeredPlayers,
          waitlist: waitlistCount,
        })
      : t('sessions.close.body', { count: registeredPlayers })
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
    >
      <div className="w-full max-w-md rounded-md border-2 border-border bg-card p-6 shadow-xl">
        <h2 id="close-modal-title" className="mb-3 font-display text-xl font-bold text-foreground">
          {t('sessions.close.title')}
        </h2>
        <p className="mb-6 text-sm text-foreground">{body}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border-2 border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {t('sessions.close.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('sessions.close.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar tests**

Run: `cd frontend && npm test -- CloseSessionModal`
Expected: PASS.

(No commit aún.)

### Task 6: Frontend — `EditSessionModal` (fecha + maxPlayers)

**Files:**
- Create: `frontend/src/features/sessions/components/EditSessionModal.tsx`
- Create: `frontend/src/features/sessions/__tests__/EditSessionModal.test.tsx`
- Modify: `frontend/src/shared/i18n/locales/es.json` y `en.json`
- Modify: `frontend/src/features/sessions/lib/errorMapping.ts` (añadir si faltan los códigos `SESSION_SCHEDULED_AT_IN_PAST`, `MAX_PLAYERS_BELOW_CURRENT`)

- [ ] **Step 1: Añadir claves i18n**

En `es.json` bajo `sessions`:
```json
"edit": {
  "title": "Editar partida",
  "scheduledAt": "Fecha y hora",
  "maxPlayers": "Plazas máximas",
  "maxPlayersHint": "Mínimo {{min}} (los ya apuntados).",
  "waitlistNote": "ℹ️ Hay {{count}} personas en cola — mantendrán su posición.",
  "submit": "Guardar cambios",
  "cancel": "Cancelar"
}
```

En `en.json` (traducir literalmente).

- [ ] **Step 2: Escribir test del modal**

Crea `frontend/src/features/sessions/__tests__/EditSessionModal.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, userEvent } from '@/test/utils'

import { EditSessionModal } from '../components/EditSessionModal'

describe('EditSessionModal', () => {
  it('llama onSubmit con los valores cambiados', async () => {
    const onSubmit = vi.fn()
    renderWithProviders(
      <EditSessionModal
        open
        initialScheduledAt="2026-06-01T20:00"
        initialMaxPlayers={4}
        registeredPlayers={2}
        waitlistCount={0}
        onSubmit={onSubmit}
        onClose={() => {}}
        isPending={false}
      />,
    )
    const input = screen.getByLabelText(/plazas máximas/i) as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, '6')
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ maxPlayers: 6, scheduledAt: '2026-06-01T20:00' }),
    )
  })

  it('valida que maxPlayers no baje de los apuntados', async () => {
    const onSubmit = vi.fn()
    renderWithProviders(
      <EditSessionModal
        open
        initialScheduledAt="2026-06-01T20:00"
        initialMaxPlayers={4}
        registeredPlayers={3}
        waitlistCount={0}
        onSubmit={onSubmit}
        onClose={() => {}}
        isPending={false}
      />,
    )
    const input = screen.getByLabelText(/plazas máximas/i) as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, '2')
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/mínimo/i)).toBeInTheDocument()
  })

  it('muestra nota de waitlist cuando hay gente en cola', () => {
    renderWithProviders(
      <EditSessionModal
        open
        initialScheduledAt="2026-06-01T20:00"
        initialMaxPlayers={4}
        registeredPlayers={4}
        waitlistCount={3}
        onSubmit={() => {}}
        onClose={() => {}}
        isPending={false}
      />,
    )
    expect(screen.getByText(/3 personas en cola/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Implementar el modal**

Crea `frontend/src/features/sessions/components/EditSessionModal.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SessionDateTimePicker } from './SessionDateTimePicker'

interface EditPayload {
  scheduledAt: string
  maxPlayers: number
}

interface EditSessionModalProps {
  open: boolean
  initialScheduledAt: string // datetime-local "YYYY-MM-DDTHH:mm"
  initialMaxPlayers: number
  registeredPlayers: number
  waitlistCount: number
  onSubmit: (payload: EditPayload) => void
  onClose: () => void
  isPending: boolean
}

export function EditSessionModal({
  open,
  initialScheduledAt,
  initialMaxPlayers,
  registeredPlayers,
  waitlistCount,
  onSubmit,
  onClose,
  isPending,
}: EditSessionModalProps) {
  const { t } = useTranslation()
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt)
  const [maxPlayers, setMaxPlayers] = useState(initialMaxPlayers)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const minMax = registeredPlayers

  function handleSubmit() {
    if (maxPlayers < minMax) {
      setError(t('sessions.edit.maxPlayersHint', { min: minMax }))
      return
    }
    setError(null)
    onSubmit({ scheduledAt, maxPlayers })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
    >
      <div className="w-full max-w-lg rounded-md border-2 border-border bg-card p-6 shadow-xl">
        <h2 id="edit-modal-title" className="mb-4 font-display text-xl font-bold text-foreground">
          {t('sessions.edit.title')}
        </h2>

        <div className="space-y-4">
          <SessionDateTimePicker
            label={t('sessions.edit.scheduledAt')}
            value={scheduledAt}
            onChange={setScheduledAt}
          />

          <div className="flex flex-col gap-1">
            <label
              htmlFor="edit-max-players"
              className="text-sm font-medium text-foreground"
            >
              {t('sessions.edit.maxPlayers')}
            </label>
            <input
              id="edit-max-players"
              type="number"
              min={minMax}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number.parseInt(e.target.value, 10) || 0)}
              className="w-32 rounded-sm border-2 border-border bg-card px-3 py-2 text-base outline-none focus:border-red focus:ring-2 focus:ring-yellow/30"
            />
            <p className="text-xs text-muted-foreground">
              {t('sessions.edit.maxPlayersHint', { min: minMax })}
            </p>
          </div>

          {waitlistCount > 0 && (
            <p className="rounded bg-yellow-soft/50 px-3 py-2 text-sm text-foreground">
              {t('sessions.edit.waitlistNote', { count: waitlistCount })}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border-2 border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            {t('sessions.edit.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-red px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {t('sessions.edit.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ejecutar tests**

Run: `cd frontend && npm test -- EditSessionModal`
Expected: PASS.

(No commit aún.)

### Task 7: Frontend — botones e integración en `SessionDetailPage`

**Files:**
- Modify: `frontend/src/features/sessions/pages/SessionDetailPage.tsx`
- Modify: `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx`
- Modify: `frontend/src/shared/i18n/locales/es.json` y `en.json`

- [ ] **Step 1: Claves i18n para los botones**

En `es.json` bajo `sessions.detail`:
```json
"editButton": "Editar",
"closeButton": "Cerrar mesa"
```

En `en.json`:
```json
"editButton": "Edit",
"closeButton": "Close table"
```

- [ ] **Step 2: Escribir test que falla**

En `SessionDetailPage.test.tsx`, añadir:

```tsx
it('como creador con status OPEN muestra botones editar y cerrar mesa', async () => {
  server.use(
    rest.get('*/sessions/3', (_req, res, ctx) =>
      res(
        ctx.json({
          ...baseDetail,
          id: 3,
          status: 'OPEN',
          creatorUsername: 'cesarby',
        }),
      ),
    ),
  )
  // mock current user = cesarby
  setCurrentUser({ id: 1, username: 'cesarby' })
  renderWithProviders(<SessionDetailPage />, { route: '/sessions/3' })
  expect(await screen.findByRole('button', { name: /editar/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /cerrar mesa/i })).toBeInTheDocument()
})

it('como creador con status FULL solo muestra editar', async () => {
  server.use(
    rest.get('*/sessions/4', (_req, res, ctx) =>
      res(
        ctx.json({
          ...baseDetail,
          id: 4,
          status: 'FULL',
          creatorUsername: 'cesarby',
        }),
      ),
    ),
  )
  setCurrentUser({ id: 1, username: 'cesarby' })
  renderWithProviders(<SessionDetailPage />, { route: '/sessions/4' })
  expect(await screen.findByRole('button', { name: /editar/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /cerrar mesa/i })).not.toBeInTheDocument()
})

it('como visitante no muestra botones de gestión', async () => {
  server.use(
    rest.get('*/sessions/5', (_req, res, ctx) =>
      res(ctx.json({ ...baseDetail, id: 5, status: 'OPEN', creatorUsername: 'otro' })),
    ),
  )
  setCurrentUser({ id: 99, username: 'visitante' })
  renderWithProviders(<SessionDetailPage />, { route: '/sessions/5' })
  await screen.findByRole('heading', { name: baseDetail.title })
  expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /cerrar mesa/i })).not.toBeInTheDocument()
})
```

Si no existe `setCurrentUser`, usa el patrón de hidratación de auth ya presente en otros tests (busca `useAuthStore` o similar mockeado en `frontend/src/test/`).

- [ ] **Step 3: Integrar en `SessionDetailPage`**

En `SessionDetailPage.tsx`:

1. Añadir imports al inicio:
```tsx
import { useState } from 'react'
import { Pencil, Lock } from 'lucide-react'

import { useAuthStore } from '@/features/auth/state/authStore' // ajusta el path real
import { EditSessionModal } from '../components/EditSessionModal'
import { CloseSessionModal } from '../components/CloseSessionModal'
import { useUpdateSessionMutation, useCloseSessionMutation } from '../hooks/useSessions'
```

2. Dentro del componente, tras obtener `data`:
```tsx
const currentUser = useAuthStore((s) => s.user)
const isCreator = !!currentUser && currentUser.username === data.creatorUsername
const canEdit = isCreator && (data.status === 'OPEN' || data.status === 'FULL')
const canClose = isCreator && data.status === 'OPEN'

const [editOpen, setEditOpen] = useState(false)
const [closeOpen, setCloseOpen] = useState(false)

const updateMut = useUpdateSessionMutation(data.id)
const closeMut = useCloseSessionMutation(data.id)
```

3. En la sección Meta (dentro del `<section aria-label="Información de la partida"...>`), tras la `<ul>` añadir:

```tsx
{(canEdit || canClose) && (
  <div className="mt-4 flex gap-2 border-t border-border pt-3">
    {canEdit && (
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted"
      >
        <Pencil size={14} aria-hidden="true" />
        {t('sessions.detail.editButton')}
      </button>
    )}
    {canClose && (
      <button
        type="button"
        onClick={() => setCloseOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red/40 bg-card px-3 py-1.5 text-sm font-semibold text-red hover:bg-red/10"
      >
        <Lock size={14} aria-hidden="true" />
        {t('sessions.detail.closeButton')}
      </button>
    )}
  </div>
)}
```

4. Antes del `</div>` final del componente, renderiza los modales:

```tsx
<EditSessionModal
  open={editOpen}
  initialScheduledAt={toLocalDatetimeInput(data.scheduledAt)}
  initialMaxPlayers={data.maxPlayers}
  registeredPlayers={data.registeredPlayers}
  waitlistCount={data.waitlistCount}
  isPending={updateMut.isPending}
  onClose={() => setEditOpen(false)}
  onSubmit={(payload) => {
    updateMut.mutate(
      {
        scheduledAt: new Date(payload.scheduledAt).toISOString(),
        maxPlayers: payload.maxPlayers,
      },
      { onSuccess: () => setEditOpen(false) },
    )
  }}
/>
<CloseSessionModal
  open={closeOpen}
  registeredPlayers={data.registeredPlayers}
  waitlistCount={data.waitlistCount}
  isPending={closeMut.isPending}
  onClose={() => setCloseOpen(false)}
  onConfirm={() =>
    closeMut.mutate(undefined, { onSuccess: () => setCloseOpen(false) })
  }
/>
```

5. Añadir el helper `toLocalDatetimeInput` al final del archivo:

```tsx
function toLocalDatetimeInput(iso: string): string {
  // ISO Instant ("...Z") → "YYYY-MM-DDTHH:mm" en zona local del navegador
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}
```

- [ ] **Step 4: Ejecutar tests**

Run: `cd frontend && npm test`
Expected: todos PASS.

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 6: Commit Feature 2 frontend**

```bash
git add frontend/src/features/sessions/api/sessionsApi.ts \
        frontend/src/features/sessions/hooks/useSessions.ts \
        frontend/src/features/sessions/components/EditSessionModal.tsx \
        frontend/src/features/sessions/components/CloseSessionModal.tsx \
        frontend/src/features/sessions/__tests__/EditSessionModal.test.tsx \
        frontend/src/features/sessions/__tests__/CloseSessionModal.test.tsx \
        frontend/src/features/sessions/pages/SessionDetailPage.tsx \
        frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "feat(sessions): edición y cierre de mesa para el creador"
```

---

# Feature 3 — Resumen del juego con Claude Haiku

> **⚠️ STOP — antes de empezar F3, configurar `ANTHROPIC_API_KEY` con el usuario.**
>
> El usuario va a la consola de Anthropic, genera la key, añade ≥$5 de crédito,
> y guarda la key en `backend/.env.local` como `ANTHROPIC_API_KEY=sk-ant-...`.
> Verifica que `.env.local` está en `.gitignore`. Luego sigue con la Task 8.

### Task 8: Backend — migración V10 + Game entity + BGG mapper

**Files:**
- Create: `backend/src/main/resources/db/migration/V10__games_description_and_summary.sql`
- Modify: `backend/src/main/java/com/matchplay/game/entity/Game.java`
- Modify: `backend/src/main/java/com/matchplay/game/client/xml/BggThingResult.java`
- Modify: `backend/src/main/java/com/matchplay/game/mapper/BggGameMapper.java`

- [ ] **Step 1: Migración V10**

Crea `backend/src/main/resources/db/migration/V10__games_description_and_summary.sql`:

```sql
ALTER TABLE games
  ADD COLUMN description TEXT NULL,
  ADD COLUMN summary_es VARCHAR(700) NULL,
  ADD COLUMN summary_en VARCHAR(700) NULL;
```

- [ ] **Step 2: Añadir campos al entity**

En `Game.java`, dentro de la clase, añadir:

```java
@Column(name = "description", columnDefinition = "TEXT")
private String description;

@Column(name = "summary_es", length = 700)
private String summaryEs;

@Column(name = "summary_en", length = 700)
private String summaryEn;
```

- [ ] **Step 3: Añadir `description` al BggThingResult.Item**

En `BggThingResult.java`, ampliar el record `Item` añadiendo el campo (en cualquier posición; respeta el orden del XML de BGG que es alfabético):

```java
@JsonProperty("description") String description,
```

(Inserción típica: justo después de `image`. Recuerda añadir la coma tras el campo previo.)

- [ ] **Step 4: Mapear description en BggGameMapper**

En `BggGameMapper.toEntity`, antes del return, añadir:

```java
entity.setDescription(item.description());
```

Si el mapper usa MapStruct con sintaxis declarativa, añade el mapping correspondiente.

- [ ] **Step 5: Compilar para verificar**

Run: `cd backend && ./mvnw compile`
Expected: BUILD SUCCESS.

(No commit aún — va con la integración LLM en una sola unidad.)

### Task 9: Backend — módulo `ai/` (interface + Noop + config)

**Files:**
- Create: `backend/src/main/java/com/matchplay/ai/GameSummary.java`
- Create: `backend/src/main/java/com/matchplay/ai/AiSummaryClient.java`
- Create: `backend/src/main/java/com/matchplay/ai/NoopSummaryClient.java`
- Create: `backend/src/main/java/com/matchplay/ai/AiConfig.java`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Record de resultado**

Crea `backend/src/main/java/com/matchplay/ai/GameSummary.java`:

```java
package com.matchplay.ai;

/**
 * Resumen del juego en los idiomas soportados. Cualquier campo puede ser null
 * si el LLM falló o no había key configurada.
 */
public record GameSummary(String es, String en) {
    public static GameSummary empty() {
        return new GameSummary(null, null);
    }
}
```

- [ ] **Step 2: Interface**

Crea `backend/src/main/java/com/matchplay/ai/AiSummaryClient.java`:

```java
package com.matchplay.ai;

public interface AiSummaryClient {
    /**
     * Resume el texto dado en español e inglés.
     * Implementaciones deben ser tolerantes a fallos: nunca lanzar excepciones,
     * devolver {@link GameSummary#empty()} en su lugar.
     */
    GameSummary summarize(String text);
}
```

- [ ] **Step 3: Noop impl**

Crea `backend/src/main/java/com/matchplay/ai/NoopSummaryClient.java`:

```java
package com.matchplay.ai;

import lombok.extern.slf4j.Slf4j;

/**
 * Implementación por defecto cuando no hay API key configurada. No genera
 * resúmenes; el sistema sigue funcionando sin ellos.
 */
@Slf4j
public class NoopSummaryClient implements AiSummaryClient {
    @Override
    public GameSummary summarize(String text) {
        log.debug("AI summary skipped (Noop client active)");
        return GameSummary.empty();
    }
}
```

- [ ] **Step 4: Config con bean selection**

Crea `backend/src/main/java/com/matchplay/ai/AiConfig.java`:

```java
package com.matchplay.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Bean
    public AiSummaryClient aiSummaryClient(
            @Value("${anthropic.api-key:}") String apiKey
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            return new NoopSummaryClient();
        }
        return new ClaudeHaikuSummaryClient(apiKey);
    }
}
```

(La clase `ClaudeHaikuSummaryClient` se crea en Task 10 — esto compilará entonces.)

- [ ] **Step 5: Añadir property a application.yml**

En `backend/src/main/resources/application.yml`, en la raíz:

```yaml
anthropic:
  api-key: ${ANTHROPIC_API_KEY:}
```

- [ ] **Step 6: Verificar .env.local en .gitignore**

Asegura que `backend/.gitignore` contiene `.env.local` (añadir línea si falta).

(No commit aún — el módulo no compila hasta Task 10.)

### Task 10: Backend — `ClaudeHaikuSummaryClient` + tests con WireMock

**Files:**
- Create: `backend/src/main/java/com/matchplay/ai/ClaudeHaikuSummaryClient.java`
- Create: `backend/src/test/java/com/matchplay/ai/ClaudeHaikuSummaryClientTest.java`
- Modify: `backend/pom.xml` — añadir dependencia `wiremock` si no está ya

- [ ] **Step 1: Verificar dependencia WireMock**

Run: `cd backend; Select-String -Path pom.xml -Pattern "wiremock"` (PowerShell) o `grep wiremock backend/pom.xml`
Si no existe, añadir al `pom.xml` dentro de `<dependencies>`:

```xml
<dependency>
    <groupId>org.wiremock</groupId>
    <artifactId>wiremock-standalone</artifactId>
    <version>3.3.1</version>
    <scope>test</scope>
</dependency>
```

- [ ] **Step 2: Escribir tests que fallan**

Crea `backend/src/test/java/com/matchplay/ai/ClaudeHaikuSummaryClientTest.java`:

```java
package com.matchplay.ai;

import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

class ClaudeHaikuSummaryClientTest {

    private WireMockServer wm;
    private ClaudeHaikuSummaryClient client;

    @BeforeEach
    void setUp() {
        wm = new WireMockServer(0);
        wm.start();
        client = new ClaudeHaikuSummaryClient("test-key", "http://localhost:" + wm.port());
    }

    @AfterEach
    void tearDown() {
        wm.stop();
    }

    @Test
    void returnsBothLanguagesWhenApiSucceeds() {
        wm.stubFor(post(urlEqualTo("/v1/messages"))
                .willReturn(okJson("""
                    {"content":[{"type":"text","text":"Resumen ES de prueba."}]}
                    """)));

        GameSummary out = client.summarize("Texto largo de BGG...");

        assertThat(out.es()).contains("Resumen ES");
        assertThat(out.en()).contains("Resumen ES"); // mismo stub responde a ambas calls
    }

    @Test
    void returnsEmptyOnServerError() {
        wm.stubFor(post(urlEqualTo("/v1/messages"))
                .willReturn(serverError()));

        GameSummary out = client.summarize("Texto largo de BGG...");

        assertThat(out.es()).isNull();
        assertThat(out.en()).isNull();
    }

    @Test
    void returnsEmptyOnBlankInput() {
        GameSummary out = client.summarize("   ");
        assertThat(out).isEqualTo(GameSummary.empty());
        wm.verify(0, postRequestedFor(urlEqualTo("/v1/messages")));
    }
}
```

- [ ] **Step 3: Ejecutar tests y verificar que fallan**

Run: `cd backend && ./mvnw test -Dtest=ClaudeHaikuSummaryClientTest`
Expected: FAIL — clase no existe.

- [ ] **Step 4: Implementar el cliente real**

Crea `backend/src/main/java/com/matchplay/ai/ClaudeHaikuSummaryClient.java`:

```java
package com.matchplay.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Cliente HTTP de la API de Anthropic Messages para generar resúmenes con
 * Claude Haiku 4.5. Hace una llamada por idioma (ES y EN). Tolerante a fallos:
 * cualquier error de red, HTTP o parseo se traduce a {@link GameSummary#empty()}.
 */
@Slf4j
public class ClaudeHaikuSummaryClient implements AiSummaryClient {

    private static final String MODEL = "claude-haiku-4-5-20251001";
    private static final int MAX_TOKENS = 400;
    private static final String DEFAULT_BASE_URL = "https://api.anthropic.com";

    private final String apiKey;
    private final RestClient http;
    private final ObjectMapper mapper = new ObjectMapper();

    public ClaudeHaikuSummaryClient(String apiKey) {
        this(apiKey, DEFAULT_BASE_URL);
    }

    /** Constructor para tests (permite redirigir a WireMock). */
    public ClaudeHaikuSummaryClient(String apiKey, String baseUrl) {
        this.apiKey = apiKey;
        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader("content-type", "application/json")
                .build();
    }

    @Override
    public GameSummary summarize(String text) {
        if (text == null || text.isBlank()) {
            return GameSummary.empty();
        }
        String es = callOnce(text, "español");
        String en = callOnce(text, "English");
        return new GameSummary(es, en);
    }

    private String callOnce(String text, String language) {
        String prompt = """
                Eres un experto en juegos de mesa. Resume el siguiente texto en %s en un
                párrafo de ~500 caracteres con tono editorial. Menciona qué haces, la mecánica
                principal y a qué tipo de jugador le gusta. Sin saludos, sin meta-comentarios,
                sin Markdown.

                Texto:
                %s
                """.formatted(language, text);

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", MAX_TOKENS,
                "temperature", 0.4,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        try {
            String raw = http.post()
                    .uri("/v1/messages")
                    .body(body)
                    .retrieve()
                    .body(String.class);
            if (raw == null) return null;
            JsonNode root = mapper.readTree(raw);
            JsonNode content = root.path("content");
            if (content.isArray() && content.size() > 0) {
                String txt = content.get(0).path("text").asText(null);
                if (txt != null && !txt.isBlank()) return txt.trim();
            }
            log.warn("Anthropic response had no usable content: {}", raw);
            return null;
        } catch (Exception e) {
            log.warn("Anthropic call failed ({}): {}", language, e.getMessage());
            return null;
        }
    }
}
```

- [ ] **Step 5: Ejecutar tests**

Run: `cd backend && ./mvnw test -Dtest=ClaudeHaikuSummaryClientTest`
Expected: PASS los 3.

(No commit aún — sigue con la integración.)

### Task 11: Backend — integrar `AiSummaryClient` en `GameServiceImpl.findOrFetch`

**Files:**
- Modify: `backend/src/main/java/com/matchplay/game/service/GameServiceImpl.java`
- Modify: tests existentes de `GameService` (si no hay archivo, crear uno mínimo)

- [ ] **Step 1: Localizar/crear el test de GameServiceImpl**

Run: `cd backend; Get-ChildItem -Recurse -Filter "GameServiceImplTest*" src/test`
Si no existe, crea `backend/src/test/java/com/matchplay/game/service/GameServiceImplTest.java`:

```java
package com.matchplay.game.service;

import com.matchplay.ai.AiSummaryClient;
import com.matchplay.ai.GameSummary;
import com.matchplay.game.client.BggClient;
import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.entity.Game;
import com.matchplay.game.mapper.BggGameMapper;
import com.matchplay.game.repository.GameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GameServiceImplTest {

    @Mock GameRepository gameRepository;
    @Mock BggClient bggClient;
    @Mock BggGameMapper bggGameMapper;
    @Mock AiSummaryClient aiSummaryClient;

    @InjectMocks GameServiceImpl service;

    @BeforeEach
    void wireAi() {
        // si InjectMocks no resuelve el campo (porque es nuevo), instanciar manual
    }

    @Test
    void findOrFetch_savesGameWithSummary_whenAiReturnsContent() {
        when(gameRepository.findById(42L)).thenReturn(Optional.empty());
        BggThingResult.Item item = mock(BggThingResult.Item.class);
        when(item.description()).thenReturn("Long BGG description...");
        when(bggClient.getThing(42L)).thenReturn(Optional.of(item));
        Game entity = new Game();
        entity.setBggId(42L);
        entity.setDescription("Long BGG description...");
        when(bggGameMapper.toEntity(item)).thenReturn(entity);
        when(aiSummaryClient.summarize("Long BGG description..."))
                .thenReturn(new GameSummary("Resumen ES", "Summary EN"));
        when(gameRepository.save(any(Game.class))).thenAnswer(inv -> inv.getArgument(0));

        Game out = service.findOrFetch(42L);

        assertThat(out.getSummaryEs()).isEqualTo("Resumen ES");
        assertThat(out.getSummaryEn()).isEqualTo("Summary EN");
    }

    @Test
    void findOrFetch_savesGameWithoutSummary_whenAiReturnsEmpty() {
        when(gameRepository.findById(42L)).thenReturn(Optional.empty());
        BggThingResult.Item item = mock(BggThingResult.Item.class);
        when(item.description()).thenReturn("Desc...");
        when(bggClient.getThing(42L)).thenReturn(Optional.of(item));
        Game entity = new Game();
        entity.setBggId(42L);
        entity.setDescription("Desc...");
        when(bggGameMapper.toEntity(item)).thenReturn(entity);
        when(aiSummaryClient.summarize("Desc...")).thenReturn(GameSummary.empty());
        when(gameRepository.save(any(Game.class))).thenAnswer(inv -> inv.getArgument(0));

        Game out = service.findOrFetch(42L);

        assertThat(out.getSummaryEs()).isNull();
        assertThat(out.getSummaryEn()).isNull();
    }
}
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

Run: `cd backend && ./mvnw test -Dtest=GameServiceImplTest`
Expected: FAIL — `aiSummaryClient` no se inyecta aún.

- [ ] **Step 3: Inyectar `AiSummaryClient` en `GameServiceImpl`**

En `GameServiceImpl.java`:

1. Añadir import: `import com.matchplay.ai.AiSummaryClient;` y `import com.matchplay.ai.GameSummary;`
2. Añadir el campo (la clase ya tiene `@RequiredArgsConstructor`):

```java
private final AiSummaryClient aiSummaryClient;
```

3. En `findOrFetch`, tras `Game entity = bggGameMapper.toEntity(item);` y antes de `gameRepository.save(entity)`:

```java
if (entity.getDescription() != null && !entity.getDescription().isBlank()) {
    GameSummary summary = aiSummaryClient.summarize(entity.getDescription());
    entity.setSummaryEs(summary.es());
    entity.setSummaryEn(summary.en());
}
```

- [ ] **Step 4: Ejecutar tests**

Run: `cd backend && ./mvnw test -Dtest=GameServiceImplTest`
Expected: PASS.

(No commit — añade exposición en DTO + FE primero.)

### Task 12: Backend — exponer `baseGameSummary` en SessionDetailResponse

**Files:**
- Modify: `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java`
- Modify: `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java`
- Modify: `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java`

- [ ] **Step 1: Añadir campo al record**

En `SessionDetailResponse.java`, ampliar el record añadiendo `String baseGameSummary` tras `baseGameThumbnailUrl`. Recuerda que **records Java son posicionales** — esto rompe constructores en tests. Actualiza el helper `detail(...)` en `GameSessionServiceImplTest` y todos sus llamadores para incluir `null` en esa posición.

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
        // ... resto igual
) {}
```

- [ ] **Step 2: Selección de idioma en el mapper**

En `SessionMapper.toDetail`, antes de construir el `SessionDetailResponse`:

```java
String lang = org.springframework.context.i18n.LocaleContextHolder
        .getLocale().getLanguage();
String baseGameSummary = null;
if (session.getBaseGame() != null) {
    baseGameSummary = "en".equals(lang)
            ? session.getBaseGame().getSummaryEn()
            : session.getBaseGame().getSummaryEs();
}
```

Y pásalo al constructor del response en la posición correcta.

- [ ] **Step 3: Test del mapper / service**

En `GameSessionServiceImplTest`, añadir:

```java
@Test
void getDetail_includesGameSummaryInSpanishByDefault() {
    GameSession s = givenOpenSessionWithCreatorAnd(0, 4, 0);
    s.getBaseGame().setSummaryEs("Resumen ES");
    s.getBaseGame().setSummaryEn("Summary EN");
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.baseGameSummary()).isEqualTo("Resumen ES");
}
```

- [ ] **Step 4: Grep de constructores rotos**

Run en PowerShell:
```powershell
Select-String -Path "backend/src/test/**/*.java" -Pattern "new SessionDetailResponse\("
```

Para cada match: añadir `null` en la posición de `baseGameSummary` (tras `baseGameThumbnailUrl`). Aplica también a `SessionMapper.toDetail` si construye el response posicional.

- [ ] **Step 5: Ejecutar suite backend completa**

Run: `cd backend && ./mvnw test`
Expected: todos PASS.

- [ ] **Step 6: Commit backend F3**

```bash
git add backend/src/main/resources/db/migration/V10__games_description_and_summary.sql \
        backend/src/main/java/com/matchplay/game/entity/Game.java \
        backend/src/main/java/com/matchplay/game/client/xml/BggThingResult.java \
        backend/src/main/java/com/matchplay/game/mapper/BggGameMapper.java \
        backend/src/main/java/com/matchplay/game/service/GameServiceImpl.java \
        backend/src/main/java/com/matchplay/ai/ \
        backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java \
        backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java \
        backend/src/main/resources/application.yml \
        backend/.gitignore \
        backend/pom.xml \
        backend/src/test/java/com/matchplay/game/service/GameServiceImplTest.java \
        backend/src/test/java/com/matchplay/ai/ \
        backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java
git commit -m "feat(games): resumen LLM con Claude Haiku al cachear desde BGG"
```

### Task 13: Frontend — exponer y renderizar resumen del juego

**Files:**
- Modify: `frontend/src/features/sessions/types/session.types.ts`
- Modify: `frontend/src/features/sessions/pages/SessionDetailPage.tsx`
- Modify: `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx`
- Modify: `frontend/src/shared/i18n/locales/es.json` y `en.json`

- [ ] **Step 1: Añadir campo al type**

En `session.types.ts`, dentro de `SessionDetail`:

```ts
/** Resumen editorial del juego base generado por LLM. Null si no se ha generado todavía. */
baseGameSummary: string | null
```

(Si rompe fixtures de tests, añadir `baseGameSummary: null` en cada uno — grep por `SessionDetail` en tests.)

- [ ] **Step 2: Claves i18n**

En `es.json` bajo `sessions.detail`:
```json
"aboutGameHeading": "Sobre {{game}}"
```

En `en.json`:
```json
"aboutGameHeading": "About {{game}}"
```

- [ ] **Step 3: Test que falla**

En `SessionDetailPage.test.tsx`:

```tsx
it('renderiza el bloque "Sobre el juego" cuando hay baseGameSummary', async () => {
  server.use(
    rest.get('*/sessions/6', (_req, res, ctx) =>
      res(
        ctx.json({
          ...baseDetail,
          id: 6,
          baseGameName: 'Ark Nova',
          baseGameSummary: 'Construye un zoo moderno enfocado en conservación...',
        }),
      ),
    ),
  )
  renderWithProviders(<SessionDetailPage />, { route: '/sessions/6' })
  expect(await screen.findByText(/sobre ark nova/i)).toBeInTheDocument()
  expect(screen.getByText(/construye un zoo/i)).toBeInTheDocument()
})

it('omite el bloque cuando baseGameSummary es null', async () => {
  server.use(
    rest.get('*/sessions/7', (_req, res, ctx) =>
      res(ctx.json({ ...baseDetail, id: 7, baseGameSummary: null })),
    ),
  )
  renderWithProviders(<SessionDetailPage />, { route: '/sessions/7' })
  await screen.findByRole('heading', { name: baseDetail.title })
  expect(screen.queryByText(/sobre /i)).not.toBeInTheDocument()
})
```

- [ ] **Step 4: Renderizar el bloque**

En `SessionDetailPage.tsx`, en la columna principal (encima de la sección Descripción de la sesión), añadir:

```tsx
{data.baseGameSummary && data.baseGameName && (
  <section
    aria-labelledby="game-summary-heading"
    className="mb-2 rounded border-l-4 border-yellow bg-yellow-soft/30 p-4"
  >
    <h2
      id="game-summary-heading"
      className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"
    >
      {t('sessions.detail.aboutGameHeading', { game: data.baseGameName })}
    </h2>
    <p className="text-sm italic leading-relaxed text-foreground">
      {data.baseGameSummary}
    </p>
  </section>
)}
```

- [ ] **Step 5: Ejecutar tests**

Run: `cd frontend && npm test`
Expected: todos PASS.

- [ ] **Step 6: Commit FE F3**

```bash
git add frontend/src/features/sessions/types/session.types.ts \
        frontend/src/features/sessions/pages/SessionDetailPage.tsx \
        frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "feat(sessions): bloque 'Sobre el juego' con resumen LLM en detail"
```

---

## Cierre de sesión

Al terminar las 3 features, **no pushear hasta que el usuario lo indique**.

Sigue el flujo de cierre de [CLAUDE.md](../../../CLAUDE.md):

1. Actualizar specs:
   - `docs/backend/modules/sessions-spec.md` — añadir endpoint `POST /sessions/{id}/close`.
   - `docs/backend/modules/games-spec.md` — añadir módulo `ai/`, migración V10, integración en findOrFetch.
   - `docs/frontend/modules/sessions-spec.md` — añadir EditSessionModal, CloseSessionModal, bloque resumen.
   - `docs/frontend/spec.md` — si hay cambios estructurales relevantes.
2. Si hay regla nueva del proyecto que merezca documentar, actualizar `CLAUDE.md`.
3. Commit con los docs.
4. `git push origin master` cuando el usuario confirme.
