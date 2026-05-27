# Session Detail v3 — Editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh visual de `SessionDetailPage` con dirección editorial (cover del juego destacado, meta vertical con iconos, sidebar mini-cards, mobile stacked con CTA "Unirme" prominente) + chat visible para cualquier visitante con contador total + bloque outsider clicable que lleva a la acción de unirse.

**Architecture:** Backend añade 1 campo `chatMessageCount` a `SessionDetailResponse` y 1 método al repo. Frontend introduce 3 componentes nuevos (`GameCover`, `GameCoverPlaceholder`, `JoinCallToAction`) + 1 helper (`avatarColor`), amplía `SessionChatButton` a 3 estados y reestructura el layout de `SessionDetailPage` (header 2-col con cover, meta vertical, sidebar como mini-cards independientes, mobile stacked).

**Tech Stack:** Spring Boot 3 (Java 21), Flyway, JPA. React 18 + Vite + TS + Tailwind + TanStack Query + i18next + Vitest + MSW + lucide-react.

**Spec de referencia:** [docs/superpowers/specs/2026-05-27-session-detail-v3-editorial-design.md](../specs/2026-05-27-session-detail-v3-editorial-design.md)

---

## File Structure

### Backend — Modificados
- `backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java` — añade `countBySessionId`
- `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java` — añade `chatMessageCount`
- `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java` — 5º parámetro al `toDetail`
- `backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java` — computar y pasar el nuevo valor
- `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java` — fixtures posicionales + tests nuevos
- `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java` — fixtures posicionales
- `backend/src/test/java/com/matchplay/session/mapper/SessionMapperTest.java` — fixtures posicionales

### Frontend — Creados
- `frontend/src/features/sessions/components/GameCover.tsx`
- `frontend/src/features/sessions/components/GameCoverPlaceholder.tsx`
- `frontend/src/features/sessions/components/JoinCallToAction.tsx`
- `frontend/src/shared/lib/avatarColor.ts`
- `frontend/src/features/sessions/__tests__/GameCover.test.tsx`
- `frontend/src/features/sessions/__tests__/GameCoverPlaceholder.test.tsx`
- `frontend/src/features/sessions/__tests__/JoinCallToAction.test.tsx`
- `frontend/src/shared/lib/__tests__/avatarColor.test.ts`

### Frontend — Modificados
- `frontend/src/features/sessions/types/session.types.ts` — añade `chatMessageCount`
- `frontend/src/features/sessions/components/SessionChatButton.tsx` — 3 estados + nueva prop `onJoinPrompt`
- `frontend/src/features/sessions/components/SessionPlayerRow.tsx` — añade círculo de avatar coloreado
- `frontend/src/features/sessions/pages/SessionDetailPage.tsx` — layout editorial completo
- `frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx` — tests del estado outsider
- `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx` — fixture default + tests del nuevo layout
- `frontend/src/shared/i18n/locales/es.json` — claves nuevas (chat outsider, total messages, join CTA)
- `frontend/src/shared/i18n/locales/en.json` — mismas claves

### Convenciones del repo a respetar
- Trabajamos directo sobre `master`. Sin feature branches.
- Pre-commit hook (husky + lint-staged) corre prettier+eslint automáticamente. Déjalo.
- Push solo al cierre de sesión cuando el usuario lo pide.
- **CLAUDE.md**: al añadir campo a record Java posicional, grep `new SessionDetailResponse(` en `**/test/**` y actualiza cada fixture.

---

## Task 1: BE — `chatMessageCount` en SessionDetailResponse + borrado lifecycle ya cubierto

**Files:**
- Modify: `backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java`
- Modify: `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java`
- Modify: `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java`
- Modify: `backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java`
- Modify: `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java`
- Modify: `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java`
- Modify: `backend/src/test/java/com/matchplay/session/mapper/SessionMapperTest.java`

- [ ] **Step 1: Añadir `countBySessionId` al repository**

Edita `SessionMessageRepository.java`. Después de la firma `findBySessionIdAndCreatedAtAfterOrderByCreatedAtAsc(...)` añade:

```java
/** Total de mensajes en una sesión. Usado para {@code chatMessageCount} público. */
long countBySessionId(Long sessionId);
```

Es un método derivado de Spring Data, no necesita `@Query`.

- [ ] **Step 2: Añadir `chatMessageCount` al record**

Edita `SessionDetailResponse.java`. Añade `Integer chatMessageCount` entre `chatUnreadCount` y `players` (orden posicional):

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

- [ ] **Step 3: Actualizar firma de `SessionMapper.toDetail`**

Edita `SessionMapper.java`. Cambia la firma:

```java
public SessionDetailResponse toDetail(GameSession session,
                                      List<SessionParticipant> participants,
                                      ParticipantRole yourRole,
                                      Integer chatUnreadCount,
                                      Integer chatMessageCount) {
```

Y pasa `chatMessageCount` al constructor del response en la posición correcta (entre `chatUnreadCount` y `players`).

- [ ] **Step 4: Computar `chatMessageCount` en `GameSessionServiceImpl.buildDetail`**

Edita `GameSessionServiceImpl.java`. En `buildDetail`, después de calcular `chatUnreadCount` y antes de llamar al mapper, añade:

```java
Integer chatMessageCount = computeChatMessageCount(session);
return mapper.toDetail(session, participants, yourRole, chatUnreadCount, chatMessageCount);
```

Y añade el helper al final de la clase (junto a `computeChatUnreadCount`):

```java
/**
 * Total de mensajes en el chat de la sesión, visible para CUALQUIER visitante
 * (incluso anónimo). Devuelve null si la sesión es terminal — los mensajes
 * ya fueron borrados y el bloque del chat no aplica.
 */
private Integer computeChatMessageCount(GameSession session) {
    if (session.getStatus() == SessionStatus.COMPLETED
            || session.getStatus() == SessionStatus.CANCELLED) {
        return null;
    }
    return (int) messageRepository.countBySessionId(session.getId());
}
```

- [ ] **Step 5: Actualizar TODOS los constructores posicionales en tests**

Run en PowerShell:

```powershell
Select-String -Path "backend/src/test/**/*.java" -Pattern "new SessionDetailResponse\(" -List
```

O en Bash:

```bash
grep -rln "new SessionDetailResponse(" backend/src/test/
```

Para cada match, abre el fichero y añade `null,` (o un valor `int` si es un test específico) en la posición del nuevo `chatMessageCount` (entre `chatUnreadCount` y `players`). Locales conocidos:

- `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java` — helpers `detail()` y `detailWithUnread()` (si existe ese segundo).
- `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java` — fixtures inline.
- `backend/src/test/java/com/matchplay/session/mapper/SessionMapperTest.java` — actualiza las llamadas a `mapper.toDetail(...)` añadiendo el 5º arg `null`.

Si TSC/maven se queja de alguno olvidado, añádelo. Hasta que `./mvnw compile` dé BUILD SUCCESS.

- [ ] **Step 6: Tests para `countBySessionId` + `chatMessageCount` en service**

En `GameSessionServiceImplTest.java`, junto a los tests existentes de `chatUnreadCount`, añade:

```java
@Test
void getDetail_chatMessageCount_returnsTotalCount_forActiveSession() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    when(currentUserProvider.getCurrentUserId()).thenReturn(Optional.empty());
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));
    when(messageRepository.countBySessionId(s.getId())).thenReturn(7L);

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.chatMessageCount()).isEqualTo(7);
}

@Test
void getDetail_chatMessageCount_isNullWhenCompleted() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    s.setStatus(SessionStatus.COMPLETED);
    when(currentUserProvider.getCurrentUserId()).thenReturn(Optional.empty());
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.chatMessageCount()).isNull();
    verify(messageRepository, never()).countBySessionId(any());
}

@Test
void getDetail_chatMessageCount_isNullWhenCancelled() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    s.setStatus(SessionStatus.CANCELLED);
    when(currentUserProvider.getCurrentUserId()).thenReturn(Optional.empty());
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.chatMessageCount()).isNull();
    verify(messageRepository, never()).countBySessionId(any());
}
```

- [ ] **Step 7: Ejecutar suite completa**

Run: `cd backend && ./mvnw test`
Expected: baseline (~174) + 3 nuevos = ~177 PASS. Si algún test rompe por fixture sin actualizar, vuelve al Step 5 y arregla.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java \
        backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java \
        backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java \
        backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java \
        backend/src/test/java/com/matchplay/session/
git commit -m "feat(sessions): chatMessageCount público en SessionDetailResponse"
```

---

## Task 2: FE — añadir `chatMessageCount` al type + fixture default

**Files:**
- Modify: `frontend/src/features/sessions/types/session.types.ts`
- Modify: `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx`

- [ ] **Step 1: Añadir campo al type**

En `session.types.ts`, dentro de `SessionDetail` (cerca de `chatUnreadCount`):

```ts
/**
 * Total de mensajes en el chat de esta partida, visible a cualquier visitante.
 * null si la sesión es terminal (CANCELLED/COMPLETED) — bloque del chat no aplica.
 */
chatMessageCount: number | null
```

- [ ] **Step 2: Añadir al fixture default**

En `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx`, dentro del helper `detail()`, añade junto a `chatUnreadCount: null`:

```ts
chatMessageCount: 0,
```

- [ ] **Step 3: Verificar TSC**

Run: `cd frontend && npx tsc --noEmit`

Si rompe en otros sitios (por ejemplo `SessionChatDrawer.test.tsx` con su propio `baseSession`), añade `chatMessageCount: 0` ahí también. Repetir hasta 0 errores.

- [ ] **Step 4: Tests passing**

Run: `cd frontend && npm test`
Expected: 119/119 (sin cambios funcionales todavía).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/sessions/types/session.types.ts \
        frontend/src/features/sessions/__tests__/
git commit -m "feat(sessions): chatMessageCount en SessionDetail type"
```

---

## Task 3: FE — `GameCover` + `GameCoverPlaceholder`

**Files:**
- Create: `frontend/src/features/sessions/components/GameCoverPlaceholder.tsx`
- Create: `frontend/src/features/sessions/components/GameCover.tsx`
- Create: `frontend/src/features/sessions/__tests__/GameCoverPlaceholder.test.tsx`
- Create: `frontend/src/features/sessions/__tests__/GameCover.test.tsx`

- [ ] **Step 1: Test del placeholder (TDD)**

Crea `GameCoverPlaceholder.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GameCoverPlaceholder } from '../components/GameCoverPlaceholder'

describe('GameCoverPlaceholder', () => {
  it('renderiza el nombre del juego', () => {
    render(<GameCoverPlaceholder name="Ark Nova" />)
    expect(screen.getByText('Ark Nova')).toBeInTheDocument()
  })

  it('renderiza un icono decorativo accesible (aria-hidden)', () => {
    const { container } = render(<GameCoverPlaceholder name="Catan" />)
    // El SVG de lucide tiene aria-hidden cuando se le pasa la prop
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('aplica className extra cuando se pasa', () => {
    const { container } = render(<GameCoverPlaceholder name="Catan" className="extra" />)
    expect(container.firstChild).toHaveClass('extra')
  })
})
```

Run: `cd frontend && npm test -- GameCoverPlaceholder`
Expected: FAIL — el componente no existe.

- [ ] **Step 2: Implementar `GameCoverPlaceholder`**

Crea `GameCoverPlaceholder.tsx`:

```tsx
import { Dices } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

interface GameCoverPlaceholderProps {
  name: string
  className?: string
}

/**
 * Placeholder visual para el cover de un juego cuando no hay thumbnail BGG.
 * Mantiene el ratio 3:4 del cover real y conserva la identidad editorial
 * (borde amarillo, gradiente suave, icono de dado + nombre).
 */
export function GameCoverPlaceholder({ name, className }: GameCoverPlaceholderProps) {
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

Run: `cd frontend && npm test -- GameCoverPlaceholder`
Expected: 3/3 PASS.

- [ ] **Step 3: Test de `GameCover` (TDD)**

Crea `GameCover.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GameCover } from '../components/GameCover'

describe('GameCover', () => {
  it('renderiza img cuando hay thumbnailUrl', () => {
    render(<GameCover thumbnailUrl="https://example.com/cover.jpg" name="Catan" />)
    const img = screen.getByRole('img', { name: 'Catan' })
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
  })

  it('renderiza placeholder cuando thumbnailUrl es null', () => {
    render(<GameCover thumbnailUrl={null} name="Catan" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Catan')).toBeInTheDocument()
  })
})
```

Run: `cd frontend && npm test -- GameCover`
Expected: FAIL.

- [ ] **Step 4: Implementar `GameCover`**

Crea `GameCover.tsx`:

```tsx
import { cn } from '@/shared/lib/cn'

import { GameCoverPlaceholder } from './GameCoverPlaceholder'

interface GameCoverProps {
  thumbnailUrl: string | null
  name: string
  className?: string
}

/**
 * Renderiza el cover del juego: la imagen real de BGG si está disponible,
 * o el {@link GameCoverPlaceholder} si no. Tamaño definido por el padre
 * via className (e.g. {@code w-40} fuerza ancho; ratio 3:4 lo cuida el componente).
 */
export function GameCover({ thumbnailUrl, name, className }: GameCoverProps) {
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

Run: `cd frontend && npm test -- GameCover`
Expected: ambos PASS.

- [ ] **Step 5: TSC + suite completa**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: 119 + 5 = 124 PASS, 0 TSC errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/sessions/components/GameCover.tsx \
        frontend/src/features/sessions/components/GameCoverPlaceholder.tsx \
        frontend/src/features/sessions/__tests__/GameCover.test.tsx \
        frontend/src/features/sessions/__tests__/GameCoverPlaceholder.test.tsx
git commit -m "feat(sessions): GameCover y GameCoverPlaceholder con icono Dices"
```

---

## Task 4: FE — `avatarColor` helper + aplicar en `SessionPlayerRow`

**Files:**
- Create: `frontend/src/shared/lib/avatarColor.ts`
- Create: `frontend/src/shared/lib/__tests__/avatarColor.test.ts`
- Modify: `frontend/src/features/sessions/components/SessionPlayerRow.tsx`

- [ ] **Step 1: Test del helper (TDD)**

Crea `frontend/src/shared/lib/__tests__/avatarColor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { pickAvatarColor } from '../avatarColor'

describe('pickAvatarColor', () => {
  it('devuelve siempre el mismo color para el mismo username (determinístico)', () => {
    expect(pickAvatarColor('alice')).toBe(pickAvatarColor('alice'))
    expect(pickAvatarColor('bob')).toBe(pickAvatarColor('bob'))
  })

  it('devuelve una clase Tailwind válida de la paleta del proyecto', () => {
    const palette = [
      'bg-red',
      'bg-yellow',
      'bg-green',
      'bg-blue',
      'bg-foreground',
      'bg-muted-foreground',
    ]
    for (const name of ['alice', 'bob', 'cesarby', 'ana', 'pepe', 'x', 'zz']) {
      expect(palette).toContain(pickAvatarColor(name))
    }
  })

  it('devuelve un color por defecto para strings vacíos', () => {
    expect(pickAvatarColor('')).toMatch(/^bg-/)
  })

  it('distribuye razonablemente entre la paleta (no todos al mismo color)', () => {
    const colors = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map((n) =>
        pickAvatarColor(n),
      ),
    )
    // No esperamos cobertura perfecta pero debería tocar > 1 color
    expect(colors.size).toBeGreaterThan(1)
  })
})
```

Run: `cd frontend && npm test -- avatarColor`
Expected: FAIL.

- [ ] **Step 2: Implementar el helper**

Crea `frontend/src/shared/lib/avatarColor.ts`:

```ts
const PALETTE = [
  'bg-red',
  'bg-yellow',
  'bg-green',
  'bg-blue',
  'bg-foreground',
  'bg-muted-foreground',
] as const

type AvatarBg = (typeof PALETTE)[number]

/**
 * Devuelve una clase Tailwind de fondo determinística para el username.
 * Mismo username → mismo color (sin estado, basta el username como input).
 *
 * Implementación: suma simple de char codes módulo el tamaño de la paleta.
 * No es criptográfico — solo necesitamos consistencia visual.
 */
export function pickAvatarColor(username: string): AvatarBg {
  if (!username) return PALETTE[0]
  let sum = 0
  for (let i = 0; i < username.length; i++) {
    sum += username.charCodeAt(i)
  }
  return PALETTE[sum % PALETTE.length]
}
```

Run: `cd frontend && npm test -- avatarColor`
Expected: 4/4 PASS.

- [ ] **Step 3: Tests para `SessionPlayerRow` con avatar (TDD)**

Lee primero `frontend/src/features/sessions/__tests__/SessionPlayerRow.test.tsx` si existe. Si no existe, crea uno nuevo. Si ya existe, añade tests dentro de su describe.

Si no existe, crea:

```tsx
// frontend/src/features/sessions/__tests__/SessionPlayerRow.test.tsx
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import i18n from '@/shared/i18n'

import { SessionPlayerRow } from '../components/SessionPlayerRow'
import type { SessionPlayer } from '../types/session.types'

const player: SessionPlayer = {
  userId: 7,
  username: 'alice',
  role: 'PLAYER',
  position: null,
  joinedAt: '2026-01-01T10:00:00Z',
}

function renderRow(node: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>)
}

describe('SessionPlayerRow', () => {
  it('renderiza el username del jugador', () => {
    renderRow(
      <ul>
        <SessionPlayerRow player={player} />
      </ul>,
    )
    expect(screen.getByText('@alice')).toBeInTheDocument()
  })

  it('renderiza un círculo de avatar con la inicial mayúscula del username', () => {
    renderRow(
      <ul>
        <SessionPlayerRow player={player} />
      </ul>,
    )
    expect(screen.getByText('A', { selector: '[aria-hidden="true"]' })).toBeInTheDocument()
  })

  it('variante guest no renderiza avatar (solo texto)', () => {
    renderRow(
      <ul>
        <SessionPlayerRow guestOf="cesarby" />
      </ul>,
    )
    expect(screen.queryByText('A', { selector: '[aria-hidden="true"]' })).not.toBeInTheDocument()
    expect(screen.getByText(/cesarby/i)).toBeInTheDocument()
  })
})
```

Run: `cd frontend && npm test -- SessionPlayerRow`
Expected: PASS los 2 primeros (ya pasan hoy si SessionPlayerRow existe sin avatar) — FAIL el segundo del avatar.

Si el archivo existe y los tests anteriores ya están, solo añade los 2 nuevos (avatar render + guest sin avatar).

- [ ] **Step 4: Añadir avatar a `SessionPlayerRow`**

Lee el componente actual y modifica solo la rama PLAYER (no la guest). Cerca del `<p className="text-sm font-medium text-foreground">@{player.username}</p>`, antes del `<p>`, añade el círculo del avatar:

```tsx
import { cn } from '@/shared/lib/cn'
import { pickAvatarColor } from '@/shared/lib/avatarColor'
// ... resto
```

Y dentro del render del jugador (no del guest), reemplaza el div interior por:

```tsx
<div className="flex items-center gap-3">
  {showPosition && player.position != null && (
    <span
      aria-label={`Posición ${player.position}`}
      className="inline-flex size-7 items-center justify-center rounded-full bg-yellow-soft text-xs font-bold text-foreground"
    >
      {player.position}
    </span>
  )}
  <span
    aria-hidden="true"
    className={cn(
      'inline-flex size-7 items-center justify-center rounded-full text-xs font-bold text-white',
      pickAvatarColor(player.username),
    )}
  >
    {player.username.charAt(0).toUpperCase()}
  </span>
  <p className="text-sm font-medium text-foreground">@{player.username}</p>
</div>
```

(Conserva el `showPosition` para waitlist; el avatar se añade DESPUÉS del badge de posición.)

Run: `cd frontend && npm test -- SessionPlayerRow`
Expected: todos PASS.

- [ ] **Step 5: TSC + suite completa**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: TSC clean. Tests: 124 + 5-7 nuevos. Todos PASS.

Si algún test de `SessionDetailPage` busca por texto `@username` sin esperar el círculo, sigue pasando (el círculo añade un nodo hermano, no cambia el `@username`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/lib/avatarColor.ts \
        frontend/src/shared/lib/__tests__/avatarColor.test.ts \
        frontend/src/features/sessions/components/SessionPlayerRow.tsx \
        frontend/src/features/sessions/__tests__/SessionPlayerRow.test.tsx
git commit -m "feat(sessions): avatar coloreado por inicial en SessionPlayerRow"
```

---

## Task 5: FE — `SessionChatButton` con 3 estados

**Files:**
- Modify: `frontend/src/features/sessions/components/SessionChatButton.tsx`
- Modify: `frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx`
- Modify: `frontend/src/shared/i18n/locales/es.json`
- Modify: `frontend/src/shared/i18n/locales/en.json`

- [ ] **Step 1: Añadir claves i18n nuevas**

En `frontend/src/shared/i18n/locales/es.json`, dentro del bloque `sessions.chat` (junto a las claves existentes):

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

(Las claves `_zero`, `_one`, `_other` son del API de i18next v23+. El proyecto ya las usa, ver `expansionsHeading_one` para confirmar el patrón.)

- [ ] **Step 2: Tests del estado outsider (TDD)**

En `frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx`, añade nuevos tests al describe existente (mantén los 3 actuales: null, 0 unread, N unread). Añade:

```tsx
it('outsider con chatMessageCount > 0 renderiza caja muted clicable', async () => {
  const onJoinPrompt = vi.fn()
  renderButton(baseSession({ chatUnreadCount: null, chatMessageCount: 7 }), { onJoinPrompt })
  expect(screen.getByText(/7 mensajes — apúntate/i)).toBeInTheDocument()
  // No tiene badge unread
  expect(screen.queryByText('7', { selector: 'span[aria-label]' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button'))
  expect(onJoinPrompt).toHaveBeenCalledTimes(1)
})

it('outsider con chatMessageCount = 0 muestra mensaje sin mensajes', () => {
  renderButton(baseSession({ chatUnreadCount: null, chatMessageCount: 0 }))
  expect(screen.getByText(/sin mensajes aún/i)).toBeInTheDocument()
})

it('no renderiza nada cuando chatMessageCount es null (sesión cerrada)', () => {
  const { container } = renderButton(
    baseSession({ chatUnreadCount: null, chatMessageCount: null }),
  )
  expect(container).toBeEmptyDOMElement()
})

it('participante con chatMessageCount muestra el contador total', () => {
  renderButton(baseSession({ chatUnreadCount: 2, chatMessageCount: 12 }))
  expect(screen.getByText(/12 mensajes/i)).toBeInTheDocument()
})
```

Ajusta el helper `renderButton` para aceptar una segunda prop `{ onJoinPrompt }` opcional:

```tsx
function renderButton(s: SessionDetail, props: { onJoinPrompt?: () => void } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <SessionChatButton session={s} onJoinPrompt={props.onJoinPrompt} />
      </QueryClientProvider>
    </HelmetProvider>,
  )
}
```

Asegúrate de importar `vi` y `userEvent`:

```tsx
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
```

Run: `cd frontend && npm test -- SessionChatButton`
Expected: FAIL — el componente actual no maneja el estado outsider.

- [ ] **Step 3: Implementar los 3 estados en `SessionChatButton`**

Reemplaza el componente `SessionChatButton.tsx` por:

```tsx
import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import type { SessionDetail } from '../types/session.types'

import { SessionChatDrawer } from './SessionChatDrawer'

interface SessionChatButtonProps {
  session: SessionDetail
  /**
   * Callback opcional para el estado outsider: cuando un no participante hace
   * click en la caja informativa del chat, se le redirige al CTA "Unirme" o
   * a login según el caso. Lo decide el padre (SessionDetailPage).
   */
  onJoinPrompt?: () => void
}

/**
 * Bloque del chat en la sidebar de la detail page. Tres estados exclusivos:
 *
 * 1. **Participante** (chatUnreadCount !== null): card-banner clicable con borde
 *    rojo, contador total + badge de no leídos. Click abre el drawer.
 * 2. **Outsider con sesión activa** (chatUnreadCount === null && chatMessageCount !== null):
 *    caja muted con borde dashed, clicable. Click llama a {@code onJoinPrompt}.
 * 3. **Sesión cerrada** (chatMessageCount === null): no renderiza nada.
 */
export function SessionChatButton({ session, onJoinPrompt }: SessionChatButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // Estado 3: sesión cerrada / cancelada → no aplica el chat
  if (session.chatMessageCount === null) return null

  // Estado 2: outsider — caja informativa clicable
  if (session.chatUnreadCount === null) {
    return (
      <button
        type="button"
        onClick={() => onJoinPrompt?.()}
        className="flex w-full items-center gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4 text-left transition hover:bg-muted/50"
      >
        <MessageSquare size={20} aria-hidden="true" className="text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t('sessions.chat.totalMessages', { count: session.chatMessageCount })}
          </p>
          <p className="text-xs italic text-muted-foreground">
            {t('sessions.chat.outsiderNotice', { count: session.chatMessageCount })}
          </p>
        </div>
      </button>
    )
  }

  // Estado 1: participante — card-banner clicable
  const unread = session.chatUnreadCount
  const total = session.chatMessageCount

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded border border-border bg-muted/20 p-4',
          'text-left transition hover:bg-muted/40',
        )}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} aria-hidden="true" className="text-muted-foreground" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('sessions.chat.title')}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('sessions.chat.totalMessages', { count: total })}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <span
            aria-label={t('sessions.chat.unreadBadge', { count: unread })}
            className="inline-flex min-w-6 items-center justify-center rounded-full bg-red px-2 py-0.5 text-xs font-bold text-white"
          >
            {unread}
          </span>
        )}
      </button>

      <SessionChatDrawer session={session} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

**Nota**: el código de arriba usa los DOS textos (`totalMessages` arriba en negrita y `outsiderNotice` debajo en italic). La línea de arriba (`{count} mensajes`) actúa como título destacado del bloque; la línea de abajo da el CTA. Es jerarquía visual deliberada — NO consolidar en un solo `<p>` aunque haya redundancia en el count.

Run: `cd frontend && npm test -- SessionChatButton`
Expected: 7/7 PASS (3 existentes + 4 nuevos).

- [ ] **Step 4: TSC + suite completa**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: TSC clean. Conteo: anterior + 4 nuevos. Si algún test viejo del page rompe porque el estado outsider antes ocultaba el botón y ahora lo muestra, **espera** — eso se arregla en Task 7 (page refactor). Si es muy ruidoso, anota como concern en el report.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/sessions/components/SessionChatButton.tsx \
        frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "feat(chat): SessionChatButton 3 estados (participante/outsider/cerrado)"
```

---

## Task 6: FE — `JoinCallToAction` (CTA mobile prominente)

**Files:**
- Create: `frontend/src/features/sessions/components/JoinCallToAction.tsx`
- Create: `frontend/src/features/sessions/__tests__/JoinCallToAction.test.tsx`

- [ ] **Step 1: Tests (TDD)**

Crea `JoinCallToAction.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { JoinCallToAction } from '../components/JoinCallToAction'
import type { SessionDetail } from '../types/session.types'

function baseSession(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    id: 7,
    title: 'Catan Night',
    description: null,
    baseGameId: 13,
    baseGameName: 'Catan',
    baseGameThumbnailUrl: null,
    baseGameSummary: null,
    expansions: [],
    creatorGuests: 0,
    cityCode: 'MAD01',
    cityName: 'Madrid',
    areaCode: null,
    areaName: null,
    scheduledAt: '2030-01-15T20:00:00Z',
    maxPlayers: 4,
    registeredPlayers: 2,
    waitlistCount: 0,
    status: 'OPEN',
    creatorId: 1,
    creatorUsername: 'alice',
    chatUnreadCount: null,
    chatMessageCount: 0,
    players: [],
    yourRole: null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderCta(s: SessionDetail, isAuthenticated: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <JoinCallToAction session={s} isAuthenticated={isAuthenticated} />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('JoinCallToAction', () => {
  it('no renderiza nada si la sesión está cerrada', () => {
    const { container } = renderCta(baseSession({ status: 'COMPLETED' }), true)
    expect(container).toBeEmptyDOMElement()
  })

  it('no renderiza si soy participante (yourRole != null)', () => {
    const { container } = renderCta(baseSession({ yourRole: 'PLAYER' }), true)
    expect(container).toBeEmptyDOMElement()
  })

  it('no renderiza si no hay plazas libres (registered == max)', () => {
    const { container } = renderCta(
      baseSession({ registeredPlayers: 4, maxPlayers: 4 }),
      true,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza CTA "Unirme" cuando autenticado y hay plaza', () => {
    renderCta(baseSession({ registeredPlayers: 2, maxPlayers: 4 }), true)
    expect(screen.getByRole('button', { name: /unirme/i })).toBeInTheDocument()
  })

  it('renderiza CTA "Inicia sesión" cuando anónimo y hay plaza', () => {
    renderCta(baseSession({ registeredPlayers: 2, maxPlayers: 4 }), false)
    expect(screen.getByRole('link', { name: /inicia sesión/i })).toBeInTheDocument()
  })
})
```

Run: `cd frontend && npm test -- JoinCallToAction`
Expected: FAIL.

- [ ] **Step 2: Implementar `JoinCallToAction`**

Crea `JoinCallToAction.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useJoinSessionMutation } from '../hooks/useSessions'
import type { SessionDetail } from '../types/session.types'

interface JoinCallToActionProps {
  session: SessionDetail
  isAuthenticated: boolean
}

/**
 * CTA destacado de "Unirme" para no apuntados, visible solo en mobile.
 * Se renderiza bajo el header de la detail page como contrapeso al sidebar
 * que pasa al final del scroll en mobile.
 *
 * Devuelve null si la acción no aplica: sesión terminal, ya soy participante,
 * o no quedan plazas.
 */
export function JoinCallToAction({ session, isAuthenticated }: JoinCallToActionProps) {
  const { t } = useTranslation()
  const join = useJoinSessionMutation(session.id)

  const canJoinAtAll =
    session.status !== 'COMPLETED' &&
    session.status !== 'CANCELLED' &&
    session.yourRole === null &&
    session.registeredPlayers < session.maxPlayers

  if (!canJoinAtAll) return null

  if (!isAuthenticated) {
    return (
      <div className="mb-6 sm:hidden">
        <Link
          to={`/login?next=/sessions/${session.id}`}
          className="block w-full rounded-md bg-red px-4 py-3 text-center text-base font-bold text-white shadow-md transition hover:opacity-90"
        >
          {t('sessions.detail.joinLoginCta')}
        </Link>
      </div>
    )
  }

  return (
    <div id="join-cta" className="mb-6 sm:hidden">
      <button
        type="button"
        onClick={() => join.mutate()}
        disabled={join.isPending}
        className="w-full rounded-md bg-red px-4 py-3 text-base font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
      >
        {t('sessions.detail.joinCta')}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Añadir claves i18n**

En `frontend/src/shared/i18n/locales/es.json` bajo `sessions.detail`:

```json
"joinCta": "Unirme a esta mesa",
"joinLoginCta": "Inicia sesión para unirte"
```

En `en.json`:

```json
"joinCta": "Join this table",
"joinLoginCta": "Sign in to join"
```

Run: `cd frontend && npm test -- JoinCallToAction`
Expected: 5/5 PASS.

- [ ] **Step 4: TSC + suite completa**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: TSC clean, todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/sessions/components/JoinCallToAction.tsx \
        frontend/src/features/sessions/__tests__/JoinCallToAction.test.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "feat(sessions): JoinCallToAction mobile CTA para no apuntados"
```

---

## Task 7: FE — Refactor de `SessionDetailPage` al layout editorial

**Files:**
- Modify: `frontend/src/features/sessions/pages/SessionDetailPage.tsx`
- Modify: `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx`

- [ ] **Step 1: Reemplazar `SessionDetailPage.tsx`**

Reemplaza el archivo `frontend/src/features/sessions/pages/SessionDetailPage.tsx` completo por:

```tsx
import { Calendar, MapPin, Users } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { SeoHead } from '@/shared/components/SeoHead'
import { SessionStatusBadge } from '@/shared/components/SessionStatusBadge'

import { CreatorActions } from '../components/CreatorActions'
import { GameCover } from '../components/GameCover'
import { JoinCallToAction } from '../components/JoinCallToAction'
import { SessionActions } from '../components/SessionActions'
import { SessionChatButton } from '../components/SessionChatButton'
import { SessionExpansionsBlock } from '../components/SessionExpansionsBlock'
import { SessionPlayerRow } from '../components/SessionPlayerRow'
import { useSessionDetailQuery } from '../hooks/useSessions'

/**
 * Página `/sessions/:id` — detalle público de una partida (layout editorial v3).
 *
 * Estructura:
 * - Header 2-col (≥sm): GameCover izq + título/badges/meta dcha. Mobile: stacked.
 * - CTA "Unirme" prominente bajo header (solo mobile, solo cuando aplica).
 * - Cuerpo: "Sobre el juego" → Expansiones → Descripción → (mobile: sidebar abajo).
 * - Sidebar (sm+): Apuntados, Lista de espera, Chat, Acciones — cada uno mini-card.
 *
 * El `joinCtaRef` permite que `SessionChatButton` en estado outsider haga
 * scroll al CTA al click.
 */
export default function SessionDetailPage() {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const { id } = useParams<{ id: string }>()
  const sessionId = id ? Number.parseInt(id, 10) : Number.NaN
  const joinCtaRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError, error } = useSessionDetailQuery(
    Number.isFinite(sessionId) ? sessionId : undefined,
  )

  if (!Number.isFinite(sessionId)) {
    return <Navigate to="/sessions" replace />
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    const status = (error as { status?: number } | null)?.status
    if (status === 404) {
      return (
        <div className="container py-12 text-center">
          <SeoHead title="Match&Play" description={t('sessions.errors.notFound')} noindex />
          <p className="text-muted-foreground">{t('sessions.errors.notFound')}</p>
        </div>
      )
    }
    return (
      <div className="container py-12 text-center" role="alert">
        <p className="text-muted-foreground">{t('common.error')}</p>
      </div>
    )
  }

  const isCreator = !!user && user.username === data.creatorUsername
  const canEdit = isCreator && (data.status === 'OPEN' || data.status === 'FULL')

  const creatorUsername = data.creatorUsername
  const players = data.players.filter((p) => p.role === 'PLAYER')
  const waitlist = data.players
    .filter((p) => p.role === 'WAITLIST')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'full',
    timeStyle: 'short',
  })
  const scheduled = dateFormatter.format(new Date(data.scheduledAt))
  const location = [data.cityName, data.areaName].filter(Boolean).join(' · ') || '—'

  const youBadge =
    data.yourRole === 'PLAYER'
      ? { text: t('sessions.card.youArePlayer'), className: 'bg-green-soft' }
      : data.yourRole === 'WAITLIST'
        ? {
            text: t('sessions.card.youAreWaitlist', {
              position:
                data.players.find((p) => p.role === 'WAITLIST' && data.yourRole === 'WAITLIST')
                  ?.position ?? '?',
            }),
            className: 'bg-yellow-soft',
          }
        : null

  function scrollToJoinCta() {
    joinCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // pequeño flash visual con ring (clase añadida y quitada)
    const el = joinCtaRef.current
    if (el) {
      el.classList.add('ring-2', 'ring-red', 'ring-offset-2')
      setTimeout(() => el.classList.remove('ring-2', 'ring-red', 'ring-offset-2'), 1500)
    }
  }

  return (
    <div className="container py-8">
      <SeoHead
        title={`${data.title} | Match&Play`}
        description={data.description ?? data.title}
        canonical={`/sessions/${data.id}`}
      />

      {/* Header 2-col en sm+: cover izq + meta dcha. Mobile: stacked centrado. */}
      <header className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr] sm:gap-6">
        <div className="mx-auto w-36 sm:mx-0 sm:w-40">
          <GameCover thumbnailUrl={data.baseGameThumbnailUrl} name={data.baseGameName ?? ''} />
        </div>

        <div className="flex flex-col gap-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <SessionStatusBadge status={data.status} />
            {youBadge && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-foreground ${youBadge.className}`}
              >
                {youBadge.text}
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {data.title}
          </h1>
          {data.baseGameName && (
            <p className="text-sm italic text-muted-foreground">{data.baseGameName}</p>
          )}
          {data.creatorUsername && (
            <p className="text-xs text-muted-foreground">
              {t('sessions.card.byCreator', { username: data.creatorUsername })}
            </p>
          )}

          {/* Meta vertical con iconos coloreados */}
          <ul className="mt-2 space-y-2 border-t border-border pt-3 text-sm sm:text-left">
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <Calendar size={16} aria-hidden="true" className="shrink-0 text-blue" />
              <time dateTime={data.scheduledAt}>{scheduled}</time>
            </li>
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <MapPin size={16} aria-hidden="true" className="shrink-0 text-green" />
              <span>{location}</span>
            </li>
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <Users size={16} aria-hidden="true" className="shrink-0 text-red" />
              <span>
                {t('sessions.card.spots', {
                  registered: data.registeredPlayers,
                  max: data.maxPlayers,
                })}
              </span>
              {data.waitlistCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  · {t('sessions.card.waitlist', { count: data.waitlistCount })}
                </span>
              )}
            </li>
          </ul>

          {canEdit && <CreatorActions session={data} />}
        </div>
      </header>

      {/* CTA mobile prominente — solo si aplica */}
      <div ref={joinCtaRef}>
        <JoinCallToAction session={data} isAuthenticated={isAuthenticated} />
      </div>

      {/* Cuerpo 2-col en lg+, single col en mobile/tablet */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          {/* Sobre el juego */}
          {data.baseGameSummary?.trim() && data.baseGameName && (
            <section
              aria-labelledby="game-summary-heading"
              className="rounded border-l-4 border-yellow bg-yellow-soft/30 p-4"
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

          <SessionExpansionsBlock expansions={data.expansions} />

          {/* Descripción */}
          <section aria-labelledby="desc-heading">
            <h2 id="desc-heading" className="mb-2 font-display text-lg font-bold text-foreground">
              {t('sessions.detail.descriptionHeading')}
            </h2>
            {data.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {data.description}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                {t('sessions.detail.noDescription')}
              </p>
            )}
          </section>
        </div>

        {/* Sidebar: cada bloque en su propia mini-card */}
        <aside className="space-y-3">
          <section
            aria-labelledby="players-heading"
            className="rounded border border-border bg-card p-4"
          >
            <h2
              id="players-heading"
              className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              <span>{t('sessions.detail.playersHeading')}</span>
              <span className="font-normal">
                {data.registeredPlayers}/{data.maxPlayers}
              </span>
            </h2>
            {players.length > 0 || data.creatorGuests > 0 ? (
              <ul className="space-y-2">
                {players.map((p) => (
                  <SessionPlayerRow key={p.userId} player={p} />
                ))}
                {data.creatorGuests > 0 &&
                  creatorUsername &&
                  Array.from({ length: data.creatorGuests }).map((_, idx) => (
                    <SessionPlayerRow key={`guest-${idx}`} guestOf={creatorUsername} />
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </section>

          <section
            aria-labelledby="waitlist-heading"
            className="rounded border border-border bg-card p-4"
          >
            <h2
              id="waitlist-heading"
              className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              <span>{t('sessions.detail.waitlistHeading')}</span>
              <span className="font-normal">{waitlist.length}</span>
            </h2>
            {waitlist.length > 0 ? (
              <ul className="space-y-2">
                {waitlist.map((p) => (
                  <SessionPlayerRow key={p.userId} player={p} showPosition />
                ))}
              </ul>
            ) : null}
          </section>

          <SessionChatButton session={data} onJoinPrompt={scrollToJoinCta} />

          <div className="border-t border-border pt-4">
            <SessionActions session={data} />
          </div>
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Actualizar tests del page para reflejar el nuevo layout**

El test `muestra la lista de espera con contador 0 cuando no hay nadie en cola` actualmente espera "—" en la sección waitlist; el nuevo layout NO renderiza el "—" para waitlist (la card queda con header + contador 0 solamente). Adapta el test:

```tsx
it('muestra la lista de espera con contador 0 cuando no hay nadie en cola', async () => {
  mockUseAuth.mockReturnValue({ status: 'anonymous', user: null, isAuthenticated: false })
  renderDetail()
  expect(await screen.findByText(/lista de espera/i)).toBeInTheDocument()
  const heading = screen.getByRole('heading', { name: /lista de espera/i })
  expect(heading).toHaveTextContent('0')
})
```

(Quítale la aserción del "—" si estaba.)

Añade un nuevo test para el cover placeholder cuando no hay thumbnail:

```tsx
it('renderiza GameCoverPlaceholder con el nombre del juego cuando baseGameThumbnailUrl es null', async () => {
  mockUseAuth.mockReturnValue({ status: 'anonymous', user: null, isAuthenticated: false })
  renderDetail()
  // El placeholder renderiza el nombre del juego DOS veces (cover + título)
  const occurrences = await screen.findAllByText(/Catan/i)
  expect(occurrences.length).toBeGreaterThanOrEqual(2)
})
```

Si algún test viejo se rompe específicamente por el cambio estructural del header (e.g. buscaba el title con `<h1>` en un contenedor concreto), adáptalo a la nueva estructura.

Run: `cd frontend && npm test -- SessionDetailPage`
Expected: todos los tests del page PASS.

- [ ] **Step 3: TSC + suite completa**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: TSC clean. Suite completa PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/sessions/pages/SessionDetailPage.tsx \
        frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx
git commit -m "feat(sessions): layout editorial v3 con GameCover y sidebar mini-cards"
```

---

## Cierre de sesión (al terminar las 7 tasks)

NO pushear hasta que el usuario lo pida. Cuando lo indique:

1. Actualizar specs (`docs/backend/modules/sessions-spec.md`, `docs/frontend/modules/sessions-spec.md`) — añadir `chatMessageCount`, `GameCover`, `JoinCallToAction`, `avatarColor`, layout editorial.
2. Si alguna regla nueva del proyecto merece quedar, añadir a `CLAUDE.md` (probable: nada nuevo).
3. Commit con los docs.
4. `git push origin master` cuando el usuario confirme.
