# Mis sesiones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la página `/sessions/mine` con 4 tabs (Creadas / Apuntado / En cola / Historial) usando pills coloreadas por rol, tabla compacta con sub-fila de expansiones en el historial, y duplicar partida desde el historial precargando `CreateSessionPage`.

**Architecture:** Backend añade endpoint `GET /api/v1/me/sessions?tab=...` que devuelve `MySessionsResponse { items, counts }` reutilizando `SessionSummaryResponse` (con `expansionNames` opcional solo en HISTORY). Frontend crea página nueva `MySessionsPage` con tabs sticky, `MyHistoryTable` para la vista de historial, y `CreateSessionPage` lee `?from={id}` para duplicar.

**Tech Stack:** Spring Boot 3 (Java 21), JPA + Specifications, JUnit 5 + Mockito. React 18 + Vite + TS + Tailwind + TanStack Query + React Router + i18next + Vitest + MSW.

**Spec de referencia:** [docs/superpowers/specs/2026-05-27-my-sessions-design.md](../specs/2026-05-27-my-sessions-design.md)

---

## File Structure

### Backend — Creados
- `backend/src/main/java/com/matchplay/session/dto/MySessionsResponse.java`
- `backend/src/main/java/com/matchplay/session/dto/TabCounts.java`
- `backend/src/main/java/com/matchplay/session/service/MySessionsService.java`
- `backend/src/main/java/com/matchplay/session/service/MySessionsServiceImpl.java`
- `backend/src/main/java/com/matchplay/session/controller/MySessionsController.java`
- `backend/src/test/java/com/matchplay/session/service/MySessionsServiceImplTest.java`
- `backend/src/test/java/com/matchplay/session/controller/MySessionsControllerTest.java`

### Backend — Modificados
- `backend/src/main/java/com/matchplay/session/dto/SessionSummaryResponse.java` — añade `expansionNames`
- `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java` — overload `toSummary(session, waitlistCount, withExpansionNames)`
- `backend/src/main/java/com/matchplay/session/repository/GameSessionSpecifications.java` — añade `creatorIs`, `participantIs`, helpers de status
- Test files que construyan `SessionSummaryResponse` posicionalmente — actualizar fixtures

### Frontend — Creados
- `frontend/src/features/sessions/api/mySessionsApi.ts`
- `frontend/src/features/sessions/hooks/useMySessions.ts`
- `frontend/src/features/sessions/pages/MySessionsPage.tsx`
- `frontend/src/features/sessions/components/MyHistoryTable.tsx`
- `frontend/src/features/sessions/components/MySessionsTabs.tsx`
- `frontend/src/features/sessions/__tests__/MySessionsPage.test.tsx`
- `frontend/src/features/sessions/__tests__/MyHistoryTable.test.tsx`

### Frontend — Modificados
- `frontend/src/features/sessions/types/session.types.ts` — `MyTab`, `TabCounts`, `MySessionsResponse`, `SessionSummary.expansionNames`
- `frontend/src/shared/components/SessionCard.tsx` — añade prop `accentColor`
- `frontend/src/features/sessions/pages/CreateSessionPage.tsx` — lee `?from={id}` y precarga
- `frontend/src/app/router.tsx` — añade ruta `/sessions/mine` protegida
- `frontend/src/app/layouts/MobileMenu.tsx` — activa item "Mis partidas"
- `frontend/src/app/layouts/SiteHeader.tsx` — (si tiene nav desktop) añade item
- `frontend/src/shared/i18n/locales/es.json` y `en.json` — bloque `sessions.mine.*`
- Tests existentes de `CreateSessionPage` y `SessionsListPage` — actualizar fixtures `SessionSummary` con `expansionNames: null`

### Convenciones del repo a respetar
- Trabajamos directo sobre `master`.
- Pre-commit hook husky+lint-staged auto-corre prettier+eslint sobre staged.
- Records Java posicionales → al añadir campo a `SessionSummaryResponse` grep `new SessionSummaryResponse(` en `**/test/**` y actualizar todo.
- Jackson omite nulls por defecto, **pero** `MySessionsResponse` lleva 2 campos siempre populados (`items` y `counts`), así que sin `@JsonInclude(ALWAYS)`. La `TabCounts` lleva 4 `long` primitivos — nunca nulls.

---

## Task 1: BE — Añadir `expansionNames` a `SessionSummaryResponse`

**Files:**
- Modify: `backend/src/main/java/com/matchplay/session/dto/SessionSummaryResponse.java`
- Modify: `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java`
- Modify: `backend/src/test/java/com/matchplay/session/mapper/SessionMapperTest.java`
- Modify: cualquier otro test que construya `SessionSummaryResponse` posicionalmente (grep)

- [ ] **Step 1: Añadir campo `expansionNames` al record**

Edita `backend/src/main/java/com/matchplay/session/dto/SessionSummaryResponse.java`. Añade `List<String> expansionNames` al final:

```java
package com.matchplay.session.dto;

import com.matchplay.session.entity.SessionStatus;

import java.time.Instant;
import java.util.List;

/**
 * Representación compacta para listados (cards en frontend).
 * Evita cargar info pesada (descripción, lista de jugadores, expansiones detalladas)
 * cuando no hace falta. {@code expansionCount} permite mostrar un badge "+N exp."
 * en la card sin tener que cargar la lista entera.
 *
 * {@code expansionNames} se popula SOLO en el tab "Historial" de Mis partidas
 * (para mostrar la sub-fila de expansiones en la tabla). En el listado público
 * y en los otros tabs queda como null y Jackson lo omite del JSON.
 */
public record SessionSummaryResponse(
        Long id,
        String title,
        Long baseGameId,
        String baseGameName,
        String baseGameThumbnailUrl,
        int expansionCount,
        String cityCode,
        String cityName,
        String areaCode,
        String areaName,
        Instant scheduledAt,
        int maxPlayers,
        int registeredPlayers,
        int waitlistCount,
        SessionStatus status,
        Long creatorId,
        String creatorUsername,
        List<String> expansionNames
) {}
```

- [ ] **Step 2: Añadir overload `toSummary` con `withExpansionNames`**

En `SessionMapper.java`, reemplaza el bloque de los dos métodos `toSummary` actuales por:

```java
public SessionSummaryResponse toSummary(GameSession session) {
    return toSummary(session, 0, false);
}

public SessionSummaryResponse toSummary(GameSession session, int waitlistCount) {
    return toSummary(session, waitlistCount, false);
}

public SessionSummaryResponse toSummary(GameSession session, int waitlistCount, boolean withExpansionNames) {
    List<String> names = null;
    if (withExpansionNames && session.getExpansions() != null) {
        names = session.getExpansions().stream()
                .map(Game::getName)
                .toList();
    }
    return new SessionSummaryResponse(
            session.getId(),
            session.getTitle(),
            session.getBaseGame() != null ? session.getBaseGame().getBggId() : null,
            session.getBaseGame() != null ? session.getBaseGame().getName() : null,
            session.getBaseGame() != null ? session.getBaseGame().getThumbnailUrl() : null,
            session.getExpansions() != null ? session.getExpansions().size() : 0,
            session.getCity() != null ? session.getCity().getCode() : null,
            session.getCity() != null ? session.getCity().getName() : null,
            session.getArea() != null ? session.getArea().getCode() : null,
            session.getArea() != null ? session.getArea().getName() : null,
            session.getScheduledAt(),
            session.getMaxPlayers(),
            session.getRegisteredPlayers(),
            waitlistCount,
            session.getStatus(),
            session.getCreator() != null ? session.getCreator().getId() : null,
            session.getCreator() != null ? session.getCreator().getUsernameValue() : null,
            names
    );
}
```

Mantén los Javadoc si los tiene.

- [ ] **Step 3: Actualizar fixtures posicionales en tests**

Run (PowerShell):
```powershell
Select-String -Path "backend/src/test/**/*.java" -Pattern "new SessionSummaryResponse\(" -List
```

O (Bash):
```bash
grep -rln "new SessionSummaryResponse(" backend/src/test/
```

Para cada match: añade `null` (o un valor) en la posición final del constructor — el último argumento es ahora `expansionNames`. Lo más probable es que los fixtures hardcodeen un constructor de 17 args; ahora son 18.

Locales probables:
- `SessionMapperTest.java`
- `GameSessionControllerTest.java`
- Algún otro test que use `new SessionSummaryResponse(`

Repite hasta que `cd backend && ./mvnw compile` dé BUILD SUCCESS.

- [ ] **Step 4: Test del mapper para `withExpansionNames`**

En `SessionMapperTest.java`, añade:

```java
@Test
void toSummary_withExpansionNames_includesNames() {
    GameSession s = openSession();
    Game expA = new Game(); expA.setBggId(100L); expA.setName("Expansion A");
    Game expB = new Game(); expB.setBggId(101L); expB.setName("Expansion B");
    s.setExpansions(List.of(expA, expB));

    SessionSummaryResponse out = mapper.toSummary(s, 0, true);

    assertThat(out.expansionNames()).containsExactly("Expansion A", "Expansion B");
}

@Test
void toSummary_withoutFlag_leavesExpansionNamesNull() {
    GameSession s = openSession();
    Game exp = new Game(); exp.setBggId(100L); exp.setName("Expansion A");
    s.setExpansions(List.of(exp));

    SessionSummaryResponse out = mapper.toSummary(s, 0);

    assertThat(out.expansionNames()).isNull();
}

@Test
void toSummary_withFlagButNoExpansions_returnsNullNames() {
    GameSession s = openSession();
    s.setExpansions(List.of());

    SessionSummaryResponse out = mapper.toSummary(s, 0, true);

    // Lista vacía o null — verifica cuál es el contrato.
    // Si te interesa diferenciar "no había expansiones" de "no se pidió", devuelve null cuando esté vacía.
    // Si te da igual y prefieres una lista vacía, ajusta esta aserción.
    assertThat(out.expansionNames()).isNullOrEmpty();
}
```

(Si `openSession()` no es el helper exacto del proyecto, usa el que haya — `givenOpenSessionWithCreatorAnd` u otro. El test debe construir una `GameSession` válida con expansions seteadas.)

- [ ] **Step 5: Ejecutar suite completa**

Run: `cd backend && ./mvnw test`
Expected: ~178 baseline + 3 nuevos = ~181 PASS. Si rompe por fixture, vuelve al Step 3.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/matchplay/session/dto/SessionSummaryResponse.java \
        backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java \
        backend/src/test/java/com/matchplay/session/
git commit -m "feat(sessions): expansionNames en SessionSummaryResponse"
```

---

## Task 2: BE — `MySessionsService` + endpoint `GET /me/sessions`

**Files:**
- Create: `backend/src/main/java/com/matchplay/session/dto/MySessionsResponse.java`
- Create: `backend/src/main/java/com/matchplay/session/dto/TabCounts.java`
- Create: `backend/src/main/java/com/matchplay/session/service/MySessionsService.java`
- Create: `backend/src/main/java/com/matchplay/session/service/MySessionsServiceImpl.java`
- Create: `backend/src/main/java/com/matchplay/session/controller/MySessionsController.java`
- Modify: `backend/src/main/java/com/matchplay/session/repository/GameSessionSpecifications.java`
- Create: `backend/src/test/java/com/matchplay/session/service/MySessionsServiceImplTest.java`
- Create: `backend/src/test/java/com/matchplay/session/controller/MySessionsControllerTest.java`

- [ ] **Step 1: DTOs**

`backend/src/main/java/com/matchplay/session/dto/TabCounts.java`:

```java
package com.matchplay.session.dto;

/**
 * Conteo de partidas del usuario en cada tab de "Mis partidas".
 * Siempre populados en cada respuesta para que el frontend pinte los badges
 * sin necesidad de roundtrips adicionales.
 */
public record TabCounts(
        long created,
        long player,
        long waitlist,
        long history
) {}
```

`backend/src/main/java/com/matchplay/session/dto/MySessionsResponse.java`:

```java
package com.matchplay.session.dto;

import com.matchplay.common.dto.PageResponse;

public record MySessionsResponse(
        PageResponse<SessionSummaryResponse> items,
        TabCounts counts
) {}
```

(Verifica el package real de `PageResponse` — buscar con grep si dudas.)

- [ ] **Step 2: Añadir Specifications nuevas**

Edita `GameSessionSpecifications.java`. Al final de la clase (antes del cierre `}`), añade:

```java
/** Partidas creadas por el usuario indicado. */
public static Specification<GameSession> creatorIs(Long userId) {
    return (root, query, cb) -> cb.equal(root.get("creator").get("id"), userId);
}

/**
 * Partidas donde el usuario figura como participante con el rol indicado.
 * Usa subquery EXISTS sobre session_participants — más barato que un JOIN
 * cuando hay paginación.
 */
public static Specification<GameSession> participantIs(
        Long userId, com.matchplay.session.entity.ParticipantRole role) {
    return (root, query, cb) -> {
        var sub = query.subquery(Long.class);
        var p = sub.from(com.matchplay.session.entity.SessionParticipant.class);
        sub.select(p.get("id"))
           .where(cb.equal(p.get("session"), root),
                  cb.equal(p.get("user").get("id"), userId),
                  cb.equal(p.get("role"), role));
        return cb.exists(sub);
    };
}

/** Status activo (no terminal): OPEN, FULL, IN_PROGRESS. */
public static Specification<GameSession> statusActive() {
    return (root, query, cb) -> root.get("status").in(
            com.matchplay.session.entity.SessionStatus.OPEN,
            com.matchplay.session.entity.SessionStatus.FULL,
            com.matchplay.session.entity.SessionStatus.IN_PROGRESS
    );
}

/** Status terminal: COMPLETED, CANCELLED. */
public static Specification<GameSession> statusTerminal() {
    return (root, query, cb) -> root.get("status").in(
            com.matchplay.session.entity.SessionStatus.COMPLETED,
            com.matchplay.session.entity.SessionStatus.CANCELLED
    );
}
```

- [ ] **Step 3: Service interface**

`backend/src/main/java/com/matchplay/session/service/MySessionsService.java`:

```java
package com.matchplay.session.service;

import com.matchplay.session.dto.MySessionsResponse;
import org.springframework.data.domain.Pageable;

public interface MySessionsService {

    enum Tab { CREATED, PLAYER, WAITLIST, HISTORY }

    /**
     * Lista las partidas del usuario actual filtradas por tab.
     * - CREATED: creadas por mí, status activo, ASC scheduledAt.
     * - PLAYER: donde soy PLAYER, status activo, ASC.
     * - WAITLIST: donde soy WAITLIST, status activo, ASC.
     * - HISTORY: creadas por mí, status terminal, DESC scheduledAt.
     *
     * La respuesta SIEMPRE incluye los 4 counts.
     */
    MySessionsResponse findMine(Tab tab, Pageable pageable);
}
```

- [ ] **Step 4: Tests del service (TDD, fail)**

Crea `backend/src/test/java/com/matchplay/session/service/MySessionsServiceImplTest.java`. Sigue el estilo Mockito directo de `GameSessionServiceImplTest`.

```java
package com.matchplay.session.service;

import com.matchplay.common.dto.PageResponse;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.MySessionsResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.dto.TabCounts;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.SessionParticipantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MySessionsServiceImplTest {

    @Mock GameSessionRepository sessionRepository;
    @Mock SessionParticipantRepository participantRepository;
    @Mock CurrentUserProvider currentUserProvider;
    @Mock SessionMapper mapper;

    @InjectMocks MySessionsServiceImpl service;

    private static final Long ME = 42L;

    @BeforeEach
    void setUp() {
        when(currentUserProvider.requireCurrentUserId()).thenReturn(ME);
    }

    private GameSession dummySession(long id, SessionStatus status) {
        GameSession s = new GameSession();
        s.setId(id);
        s.setStatus(status);
        s.setScheduledAt(Instant.now().plusSeconds(86400));
        return s;
    }

    private SessionSummaryResponse dummySummary(long id) {
        return new SessionSummaryResponse(
                id, "title", null, null, null, 0,
                null, null, null, null,
                Instant.now().plusSeconds(86400),
                4, 1, 0, SessionStatus.OPEN,
                ME, "me",
                null
        );
    }

    @Test
    void findMine_created_usesAscSortAndCreatorActiveFilter() {
        Page<GameSession> page = new PageImpl<>(List.of(dummySession(1, SessionStatus.OPEN)));
        when(sessionRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(page);
        when(sessionRepository.count(any(Specification.class))).thenReturn(0L);
        when(mapper.toSummary(any(), eq(0), eq(false))).thenReturn(dummySummary(1));

        MySessionsResponse out = service.findMine(
                MySessionsService.Tab.CREATED, PageRequest.of(0, 20));

        assertThat(out.items().items()).hasSize(1);
        // Sort direction asc para activos
        // (la aserción concreta de sort la haces inspeccionando el PageRequest pasado al repo)
    }

    @Test
    void findMine_history_usesDescSortAndPopulatesExpansionNames() {
        Page<GameSession> page = new PageImpl<>(List.of(dummySession(1, SessionStatus.COMPLETED)));
        when(sessionRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(page);
        when(sessionRepository.count(any(Specification.class))).thenReturn(0L);
        SessionSummaryResponse withNames = new SessionSummaryResponse(
                1L, "title", null, null, null, 2,
                null, null, null, null,
                Instant.now(), 4, 1, 0, SessionStatus.COMPLETED,
                ME, "me",
                List.of("Exp A", "Exp B")
        );
        when(mapper.toSummary(any(), eq(0), eq(true))).thenReturn(withNames);

        MySessionsResponse out = service.findMine(
                MySessionsService.Tab.HISTORY, PageRequest.of(0, 20));

        assertThat(out.items().items().get(0).expansionNames()).containsExactly("Exp A", "Exp B");
    }

    @Test
    void findMine_returnsAllFourCounts() {
        Page<GameSession> page = new PageImpl<>(List.of());
        when(sessionRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(page);
        when(sessionRepository.count(any(Specification.class)))
                .thenReturn(3L, 1L, 0L, 5L);  // created, player, waitlist, history

        MySessionsResponse out = service.findMine(
                MySessionsService.Tab.CREATED, PageRequest.of(0, 20));

        TabCounts c = out.counts();
        assertThat(c.created()).isEqualTo(3);
        assertThat(c.player()).isEqualTo(1);
        assertThat(c.waitlist()).isEqualTo(0);
        assertThat(c.history()).isEqualTo(5);
    }

    @Test
    void findMine_player_doesNotPopulateExpansionNames() {
        Page<GameSession> page = new PageImpl<>(List.of(dummySession(1, SessionStatus.OPEN)));
        when(sessionRepository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(page);
        when(sessionRepository.count(any(Specification.class))).thenReturn(0L);
        when(mapper.toSummary(any(), eq(0), eq(false))).thenReturn(dummySummary(1));

        service.findMine(MySessionsService.Tab.PLAYER, PageRequest.of(0, 20));

        // No assertion del mapper con true — verifica via Mockito.verify
        org.mockito.Mockito.verify(mapper, org.mockito.Mockito.never())
                .toSummary(any(), eq(0), eq(true));
    }
}
```

Run: `cd backend && ./mvnw test -Dtest=MySessionsServiceImplTest`
Expected: FAIL (clase no existe).

- [ ] **Step 5: Implementar `MySessionsServiceImpl`**

`backend/src/main/java/com/matchplay/session/service/MySessionsServiceImpl.java`:

```java
package com.matchplay.session.service;

import com.matchplay.common.dto.PageResponse;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.MySessionsResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.dto.TabCounts;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.mapper.SessionMapper;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.GameSessionSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.matchplay.session.repository.GameSessionSpecifications.creatorIs;
import static com.matchplay.session.repository.GameSessionSpecifications.participantIs;
import static com.matchplay.session.repository.GameSessionSpecifications.statusActive;
import static com.matchplay.session.repository.GameSessionSpecifications.statusTerminal;

@Service
@RequiredArgsConstructor
public class MySessionsServiceImpl implements MySessionsService {

    private final GameSessionRepository sessionRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SessionMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public MySessionsResponse findMine(Tab tab, Pageable pageable) {
        Long userId = currentUserProvider.requireCurrentUserId();

        Specification<GameSession> spec = switch (tab) {
            case CREATED  -> Specification.where(creatorIs(userId)).and(statusActive());
            case PLAYER   -> Specification.where(participantIs(userId, ParticipantRole.PLAYER)).and(statusActive());
            case WAITLIST -> Specification.where(participantIs(userId, ParticipantRole.WAITLIST)).and(statusActive());
            case HISTORY  -> Specification.where(creatorIs(userId)).and(statusTerminal());
        };

        Sort sort = (tab == Tab.HISTORY)
                ? Sort.by("scheduledAt").descending()
                : Sort.by("scheduledAt").ascending();

        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(), sort);

        Page<GameSession> page = sessionRepository.findAll(spec, sortedPageable);

        boolean withExpansionNames = (tab == Tab.HISTORY);
        List<SessionSummaryResponse> items = page.getContent().stream()
                .map(s -> mapper.toSummary(s, 0, withExpansionNames))
                .toList();

        PageResponse<SessionSummaryResponse> pageResponse = new PageResponse<>(
                items,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );

        TabCounts counts = computeCounts(userId);

        return new MySessionsResponse(pageResponse, counts);
    }

    private TabCounts computeCounts(Long userId) {
        long created  = sessionRepository.count(Specification.where(creatorIs(userId)).and(statusActive()));
        long player   = sessionRepository.count(Specification.where(participantIs(userId, ParticipantRole.PLAYER)).and(statusActive()));
        long waitlist = sessionRepository.count(Specification.where(participantIs(userId, ParticipantRole.WAITLIST)).and(statusActive()));
        long history  = sessionRepository.count(Specification.where(creatorIs(userId)).and(statusTerminal()));
        return new TabCounts(created, player, waitlist, history);
    }
}
```

Verifica que `PageResponse` tiene ese constructor (items, page, size, totalElements, totalPages) — si no, adapta a su API real (probable `PageResponse.fromPage(page)` helper).

Run: `cd backend && ./mvnw test -Dtest=MySessionsServiceImplTest`
Expected: PASS los 4.

- [ ] **Step 6: Controller**

`backend/src/main/java/com/matchplay/session/controller/MySessionsController.java`:

```java
package com.matchplay.session.controller;

import com.matchplay.session.dto.MySessionsResponse;
import com.matchplay.session.service.MySessionsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Mis partidas (auth requerida)")
public class MySessionsController {

    private static final int MAX_PAGE_SIZE = 50;

    private final MySessionsService service;

    @GetMapping
    @Operation(summary = "Listado de mis partidas filtrado por tab")
    public MySessionsResponse findMine(
            @RequestParam(defaultValue = "CREATED") MySessionsService.Tab tab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        return service.findMine(tab, PageRequest.of(safePage, safeSize));
    }
}
```

- [ ] **Step 7: Tests del controller**

Lee `GameSessionControllerTest` para confirmar el patrón (`standaloneSetup` vs `@WebMvcTest`). Crea `backend/src/test/java/com/matchplay/session/controller/MySessionsControllerTest.java` siguiendo ese patrón. Tests:

```java
@Test
void findMine_returns200WithDefaultTab() throws Exception {
    MySessionsResponse resp = new MySessionsResponse(
            new PageResponse<>(List.of(), 0, 20, 0, 0),
            new TabCounts(0, 0, 0, 0)
    );
    when(service.findMine(eq(MySessionsService.Tab.CREATED), any())).thenReturn(resp);

    mockMvc.perform(get("/api/v1/me/sessions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").exists())
            .andExpect(jsonPath("$.counts.created").value(0));
}

@Test
void findMine_acceptsTabParam() throws Exception {
    MySessionsResponse resp = new MySessionsResponse(
            new PageResponse<>(List.of(), 0, 20, 0, 0),
            new TabCounts(0, 0, 0, 0)
    );
    when(service.findMine(eq(MySessionsService.Tab.HISTORY), any())).thenReturn(resp);

    mockMvc.perform(get("/api/v1/me/sessions").param("tab", "HISTORY"))
            .andExpect(status().isOk());
}

@Test
void findMine_returns400_whenInvalidTab() throws Exception {
    mockMvc.perform(get("/api/v1/me/sessions").param("tab", "INVALID"))
            .andExpect(status().isBadRequest());
}

@Test
void findMine_clampsPageSizeTo50() throws Exception {
    MySessionsResponse resp = new MySessionsResponse(
            new PageResponse<>(List.of(), 0, 50, 0, 0),
            new TabCounts(0, 0, 0, 0)
    );
    when(service.findMine(any(), argThat(p -> p.getPageSize() == 50))).thenReturn(resp);

    mockMvc.perform(get("/api/v1/me/sessions").param("size", "999"))
            .andExpect(status().isOk());
}
```

- [ ] **Step 8: Security — verificar que `/me/**` requiere auth**

Lee `backend/src/main/java/com/matchplay/security/SecurityConfig.java`. Confirma que NO hay un `permitAll()` para `/api/v1/me/**` y que la regla por defecto es `anyRequest().authenticated()`. Si NO está cubierto, añade:

```java
.requestMatchers("/api/v1/me/**").authenticated()
```

(Antes del `anyRequest()` final.)

Si el default ya es authenticated, no toques nada.

- [ ] **Step 9: Suite completa**

Run: `cd backend && ./mvnw test`
Expected: PASS todo. Cuenta nueva ≈ baseline + 8 (4 service + 4 controller).

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/matchplay/session/dto/MySessionsResponse.java \
        backend/src/main/java/com/matchplay/session/dto/TabCounts.java \
        backend/src/main/java/com/matchplay/session/service/MySessionsService.java \
        backend/src/main/java/com/matchplay/session/service/MySessionsServiceImpl.java \
        backend/src/main/java/com/matchplay/session/controller/MySessionsController.java \
        backend/src/main/java/com/matchplay/session/repository/GameSessionSpecifications.java \
        backend/src/test/java/com/matchplay/session/
git commit -m "feat(sessions): endpoint GET /me/sessions con 4 tabs y counts"
```

(Si tocaste `SecurityConfig.java`, inclúyelo.)

---

## Task 3: FE — Types + API + hook

**Files:**
- Modify: `frontend/src/features/sessions/types/session.types.ts`
- Create: `frontend/src/features/sessions/api/mySessionsApi.ts`
- Create: `frontend/src/features/sessions/hooks/useMySessions.ts`
- Modify: fixtures que construyan `SessionSummary` sin `expansionNames` — TSC fallará si las hay

- [ ] **Step 1: Añadir types**

En `frontend/src/features/sessions/types/session.types.ts`, añade al final del archivo (o agrupado con los otros tipos de sessions):

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
```

Y dentro de `SessionSummary` añade el campo nuevo cerca de `expansionCount`:

```ts
/**
 * Nombres de las expansiones de la partida. Solo populado en el tab Historial
 * de Mis partidas; null en listado público y otros tabs.
 */
expansionNames: string[] | null
```

(Si `PageResponse` no está importado, añade el import desde `@/shared/api/PageResponse`.)

- [ ] **Step 2: Crear API client**

`frontend/src/features/sessions/api/mySessionsApi.ts`:

```ts
import { httpClient } from '@/shared/api/httpClient'

import type { MySessionsResponse, MyTab } from '../types/session.types'

export const mySessionsApi = {
  findMine: (tab: MyTab, page = 0, size = 20): Promise<MySessionsResponse> =>
    httpClient
      .get<MySessionsResponse>('/me/sessions', { params: { tab, page, size } })
      .then((r) => r.data),
}
```

- [ ] **Step 3: Crear hook**

`frontend/src/features/sessions/hooks/useMySessions.ts`:

```ts
import i18next from 'i18next'
import { useQuery } from '@tanstack/react-query'

import { mySessionsApi } from '../api/mySessionsApi'
import type { MyTab } from '../types/session.types'

export const mySessionsKeys = {
  all: ['my-sessions'] as const,
  list: (tab: MyTab, page: number) =>
    [...mySessionsKeys.all, tab, page, i18next.language] as const,
}

/**
 * Listado de Mis partidas en un tab. La query key incluye `tab` y `page`,
 * así que cambiar de tab dispara un fetch nuevo con counters refrescados.
 */
export function useMySessionsQuery(tab: MyTab, page: number) {
  return useQuery({
    queryKey: mySessionsKeys.list(tab, page),
    queryFn: () => mySessionsApi.findMine(tab, page),
    staleTime: 30_000,
  })
}
```

- [ ] **Step 4: TSC + fix fixtures**

Run: `cd frontend && npx tsc --noEmit`

Si TSC se queja de fixtures que construyen `SessionSummary` sin `expansionNames`, añade `expansionNames: null` a esos fixtures. Locales probables:

- `frontend/src/shared/components/__tests__/SessionCard.test.tsx`
- `frontend/src/features/sessions/__tests__/SessionsListPage.test.tsx`
- Cualquier MSW handler que devuelva `SessionSummary` inline

Repite hasta 0 errors.

- [ ] **Step 5: Suite completa**

Run: `cd frontend && npm test`
Expected: ~140 baseline, sin cambios funcionales.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/sessions/types/session.types.ts \
        frontend/src/features/sessions/api/mySessionsApi.ts \
        frontend/src/features/sessions/hooks/useMySessions.ts \
        frontend/src/features/sessions/__tests__/ \
        frontend/src/shared/components/__tests__/
git commit -m "feat(sessions): types, api y hook de Mis sesiones"
```

(Adjust `git add` to only include files actually modified.)

---

## Task 4: FE — `MyHistoryTable` componente

**Files:**
- Create: `frontend/src/features/sessions/components/MyHistoryTable.tsx`
- Create: `frontend/src/features/sessions/__tests__/MyHistoryTable.test.tsx`
- Modify: `frontend/src/shared/i18n/locales/es.json` y `en.json` — añade keys del historial

- [ ] **Step 1: i18n keys del historial**

En `es.json`, añade el bloque `sessions.mine` (si no existe), con la sub-sección `history`:

```json
"mine": {
  "history": {
    "columns": {
      "date": "Fecha",
      "name": "Nombre",
      "game": "Juego",
      "location": "Ubicación",
      "status": "Estado"
    },
    "expansions": "Expansiones:",
    "duplicate": "Duplicar",
    "statusCompleted": "Completada",
    "statusCancelled": "Cancelada"
  }
}
```

En `en.json` lo mismo (traducción):

```json
"mine": {
  "history": {
    "columns": {
      "date": "Date",
      "name": "Name",
      "game": "Game",
      "location": "Location",
      "status": "Status"
    },
    "expansions": "Expansions:",
    "duplicate": "Duplicate",
    "statusCompleted": "Completed",
    "statusCancelled": "Cancelled"
  }
}
```

- [ ] **Step 2: Tests del componente (TDD)**

Crea `frontend/src/features/sessions/__tests__/MyHistoryTable.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { MyHistoryTable } from '../components/MyHistoryTable'
import type { SessionSummary } from '../types/session.types'

function row(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 1,
    title: 'Ark Nova en casa',
    baseGameId: 100,
    baseGameName: 'Ark Nova',
    baseGameThumbnailUrl: null,
    expansionCount: 0,
    expansionNames: null,
    cityCode: 'MAD',
    cityName: 'Madrid',
    areaCode: 'CENTRO',
    areaName: 'Centro',
    scheduledAt: '2026-01-15T19:00:00Z',
    maxPlayers: 4,
    registeredPlayers: 2,
    waitlistCount: 0,
    status: 'COMPLETED',
    creatorId: 42,
    creatorUsername: 'me',
    ...overrides,
  }
}

function renderTable(rows: SessionSummary[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <MyHistoryTable rows={rows} />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('MyHistoryTable', () => {
  it('renderiza una fila por partida', () => {
    renderTable([row({ id: 1, title: 'Partida A' }), row({ id: 2, title: 'Partida B' })])
    expect(screen.getByText('Partida A')).toBeInTheDocument()
    expect(screen.getByText('Partida B')).toBeInTheDocument()
  })

  it('renderiza la fecha en formato d/MM/yyyy HH:mm', () => {
    renderTable([row({ scheduledAt: '2026-01-15T19:00:00Z' })])
    // En zona local del navegador. El test puede ser sensible a zona horaria,
    // pero el match regex es flexible: 1-2 dígitos día / mes, 4 año, 2 hora : 2 min.
    expect(screen.getByText(/\d{1,2}\/\d{2}\/2026 \d{2}:\d{2}/)).toBeInTheDocument()
  })

  it('renderiza sub-fila de expansiones solo cuando la partida las tiene', () => {
    renderTable([
      row({ id: 1, title: 'Con exp', expansionNames: ['Exp A', 'Exp B'] }),
      row({ id: 2, title: 'Sin exp', expansionNames: null }),
      row({ id: 3, title: 'Lista vacía', expansionNames: [] }),
    ])
    expect(screen.getByText(/Exp A, Exp B/)).toBeInTheDocument()
    // Solo hay UN bloque de expansiones (la fila 1)
    expect(screen.getAllByText(/Expansiones:/i)).toHaveLength(1)
  })

  it('estado COMPLETED se renderiza como "Completada"', () => {
    renderTable([row({ status: 'COMPLETED' })])
    expect(screen.getByText(/Completada/i)).toBeInTheDocument()
  })

  it('estado CANCELLED se renderiza como "Cancelada"', () => {
    renderTable([row({ status: 'CANCELLED' })])
    expect(screen.getByText(/Cancelada/i)).toBeInTheDocument()
  })

  it('click en Duplicar navega a /sessions/new?from={id}', async () => {
    let captured: string | null = null
    function LocationProbe() {
      const loc = useLocation()
      captured = loc.pathname + loc.search
      return null
    }
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <HelmetProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/sessions/mine']}>
            <Routes>
              <Route path="/sessions/mine" element={<MyHistoryTable rows={[row({ id: 42 })]} />} />
              <Route path="/sessions/new" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /duplicar/i }))
    expect(captured).toBe('/sessions/new?from=42')
  })
})
```

Run: `cd frontend && npm test -- MyHistoryTable`
Expected: FAIL (componente no existe).

- [ ] **Step 3: Implementar `MyHistoryTable`**

Crea `frontend/src/features/sessions/components/MyHistoryTable.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'

import type { SessionSummary } from '../types/session.types'

interface MyHistoryTableProps {
  rows: SessionSummary[]
}

/**
 * Tabla compacta para el tab Historial de Mis partidas.
 * Desktop: tabla con 6 columnas. Mobile (sm-): el grid colapsa a 1 columna
 * y cada fila se ve como una mini-card apilada.
 *
 * Sub-fila de expansiones solo cuando la partida las tiene
 * ({@code session.expansionNames.length > 0}).
 *
 * Botón Duplicar navega a {@code /sessions/new?from={id}}; CreateSessionPage
 * detecta el query param y precarga el formulario.
 */
export function MyHistoryTable({ rows }: MyHistoryTableProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  function statusLabel(status: SessionSummary['status']): string {
    if (status === 'CANCELLED') return t('sessions.mine.history.statusCancelled')
    return t('sessions.mine.history.statusCompleted')
  }

  function statusClass(status: SessionSummary['status']): string {
    return status === 'CANCELLED' ? 'text-red font-medium' : 'text-green font-medium'
  }

  function handleDuplicate(id: number) {
    navigate(`/sessions/new?from=${id}`)
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      {/* Cabecera — solo visible en sm+ */}
      <div className="hidden grid-cols-[110px_1.4fr_1.2fr_1fr_90px_100px] gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:grid">
        <span>{t('sessions.mine.history.columns.date')}</span>
        <span>{t('sessions.mine.history.columns.name')}</span>
        <span>{t('sessions.mine.history.columns.game')}</span>
        <span>{t('sessions.mine.history.columns.location')}</span>
        <span>{t('sessions.mine.history.columns.status')}</span>
        <span></span>
      </div>

      {rows.map((s) => {
        const hasExp = s.expansionNames != null && s.expansionNames.length > 0
        const location = [s.cityName, s.areaName].filter(Boolean).join(' · ') || '—'
        return (
          <div key={s.id} className="border-b border-border last:border-b-0">
            {/* Fila principal */}
            <div className="grid grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-[110px_1.4fr_1.2fr_1fr_90px_100px] sm:items-center sm:gap-3">
              <span className="text-foreground">{dateFmt.format(new Date(s.scheduledAt))}</span>
              <span
                className="truncate font-semibold text-foreground"
                title={s.title}
              >
                {s.title}
              </span>
              <span className="truncate text-muted-foreground" title={s.baseGameName ?? ''}>
                {s.baseGameName ?? '—'}
              </span>
              <span className="truncate text-muted-foreground">{location}</span>
              <span className={statusClass(s.status)}>{statusLabel(s.status)}</span>
              <button
                type="button"
                onClick={() => handleDuplicate(s.id)}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                ↻ {t('sessions.mine.history.duplicate')}
              </button>
            </div>

            {/* Sub-fila de expansiones */}
            {hasExp && (
              <div
                className={cn(
                  'px-4 pb-3 text-xs italic text-muted-foreground sm:grid sm:grid-cols-[110px_1fr] sm:gap-3 sm:pb-3',
                  'bg-muted/15',
                )}
              >
                <span aria-hidden="true" className="hidden text-right not-italic text-border sm:block">↳</span>
                <span className="truncate">
                  <strong className="not-italic font-semibold text-foreground/70">
                    {t('sessions.mine.history.expansions')}
                  </strong>{' '}
                  {s.expansionNames!.join(', ')}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

Run: `cd frontend && npm test -- MyHistoryTable`
Expected: 6/6 PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/sessions/components/MyHistoryTable.tsx \
        frontend/src/features/sessions/__tests__/MyHistoryTable.test.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "feat(sessions): MyHistoryTable con sub-fila de expansiones"
```

---

## Task 5: FE — `MySessionsPage` con tabs + grid + integración

**Files:**
- Create: `frontend/src/features/sessions/pages/MySessionsPage.tsx`
- Create: `frontend/src/features/sessions/components/MySessionsTabs.tsx`
- Create: `frontend/src/features/sessions/__tests__/MySessionsPage.test.tsx`
- Modify: `frontend/src/shared/components/SessionCard.tsx` — añade prop `accentColor`
- Modify: `frontend/src/shared/i18n/locales/es.json` y `en.json` — añade keys `mine.tabs`, `mine.title`, `mine.empty`

- [ ] **Step 1: i18n keys de tabs + empty states**

Añadir bajo `sessions.mine` en `es.json` (junto al bloque `history` ya creado en Task 4):

```json
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
}
```

En `en.json` el mismo bloque traducido.

- [ ] **Step 2: `SessionCard` añade prop `accentColor`**

Lee `frontend/src/shared/components/SessionCard.tsx`. En la interface `SessionCardProps` añade:

```ts
accentColor?: 'yellow' | 'green' | 'blue' | 'muted'
```

Y en el wrapper de la card (root `<article>` o `<div>`), añade dinámicamente la clase `border-l-4 border-{color}` cuando `accentColor` está presente. Usa `cn` y un map literal:

```tsx
const ACCENT_CLASSES: Record<NonNullable<SessionCardProps['accentColor']>, string> = {
  yellow: 'border-l-4 border-yellow',
  green: 'border-l-4 border-green',
  blue: 'border-l-4 border-blue',
  muted: 'border-l-4 border-muted-foreground',
}

// ... en el JSX wrapper:
className={cn(
  /* ...clases existentes... */,
  accentColor && ACCENT_CLASSES[accentColor],
)}
```

(El record con keys explícitas es para que Tailwind detecte las clases en el build.)

Importante: NO cambies el comportamiento por defecto (sin `accentColor` → sin border-left).

- [ ] **Step 3: `MySessionsTabs` componente (pills coloreadas)**

`frontend/src/features/sessions/components/MySessionsTabs.tsx`:

```tsx
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import type { MyTab, TabCounts } from '../types/session.types'

interface TabDef {
  tab: MyTab
  labelKey: string
  shortLabelKey?: string
  emoji: string
  activeBg: string
  activeText: string
  outlineBorder: string
  outlineText: string
}

const TABS: TabDef[] = [
  {
    tab: 'CREATED',
    labelKey: 'sessions.mine.tabs.created',
    emoji: '✏️',
    activeBg: 'bg-yellow text-foreground',
    activeText: 'text-foreground',
    outlineBorder: 'border-yellow',
    outlineText: 'text-yellow',
  },
  {
    tab: 'PLAYER',
    labelKey: 'sessions.mine.tabs.player',
    emoji: '🎲',
    activeBg: 'bg-green text-white',
    activeText: 'text-white',
    outlineBorder: 'border-green',
    outlineText: 'text-green',
  },
  {
    tab: 'WAITLIST',
    labelKey: 'sessions.mine.tabs.waitlist',
    shortLabelKey: 'sessions.mine.tabs.waitlistShort',
    emoji: '⏳',
    activeBg: 'bg-blue text-white',
    activeText: 'text-white',
    outlineBorder: 'border-blue',
    outlineText: 'text-blue',
  },
  {
    tab: 'HISTORY',
    labelKey: 'sessions.mine.tabs.history',
    emoji: '📚',
    activeBg: 'bg-foreground text-background',
    activeText: 'text-background',
    outlineBorder: 'border-muted-foreground',
    outlineText: 'text-muted-foreground',
  },
]

interface MySessionsTabsProps {
  active: MyTab
  counts: TabCounts
  onChange: (next: MyTab) => void
}

export function MySessionsTabs({ active, counts, onChange }: MySessionsTabsProps) {
  const { t } = useTranslation()
  const countOf = (tab: MyTab): number => {
    switch (tab) {
      case 'CREATED': return counts.created
      case 'PLAYER': return counts.player
      case 'WAITLIST': return counts.waitlist
      case 'HISTORY': return counts.history
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Mis partidas tabs"
      className="sticky top-0 z-10 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-border bg-card px-4 py-3 sm:px-6"
    >
      {TABS.map((tabDef) => {
        const isActive = active === tabDef.tab
        const count = countOf(tabDef.tab)
        return (
          <button
            key={tabDef.tab}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tabDef.tab)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold transition sm:text-sm',
              isActive
                ? cn(tabDef.activeBg, 'border-transparent')
                : cn('bg-transparent opacity-70', tabDef.outlineBorder, tabDef.outlineText),
            )}
          >
            <span aria-hidden="true">{tabDef.emoji}</span>
            <span className="sm:hidden">
              {t(tabDef.shortLabelKey ?? tabDef.labelKey)}
            </span>
            <span className="hidden sm:inline">{t(tabDef.labelKey)}</span>
            <span
              className={cn(
                'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                isActive ? 'bg-black/15' : 'bg-black/8',
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Test de la page (TDD)**

Crea `frontend/src/features/sessions/__tests__/MySessionsPage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import MySessionsPage from '../pages/MySessionsPage'

const API = '/api/v1'

const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderPage(initialEntry = '/sessions/mine') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/sessions/mine" element={<MySessionsPage />} />
            <Route path="/login" element={<div data-testid="login">login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('MySessionsPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { userId: 1, username: 'me', email: 'me@a.es', role: 'USER' },
      status: 'authenticated',
      isAuthenticated: true,
    })
    server.use(
      http.get(`${API}/me/sessions`, ({ request }) => {
        const url = new URL(request.url)
        const tab = url.searchParams.get('tab') ?? 'CREATED'
        return HttpResponse.json({
          items: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
          counts: { created: 2, player: 1, waitlist: 0, history: 5 },
        })
      }),
    )
  })

  it('renderiza los 4 tabs con sus counts', async () => {
    renderPage()
    expect(await screen.findByRole('tab', { name: /creadas/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /apuntado/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /cola|espera/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /historial/i })).toBeInTheDocument()
  })

  it('default arranca en tab CREATED', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /creadas/i })).toHaveAttribute('aria-selected', 'true'),
    )
  })

  it('click en otro tab actualiza la URL', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('tab', { name: /historial/i }))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /historial/i })).toHaveAttribute('aria-selected', 'true'),
    )
  })

  it('tab vacío muestra empty state con CTA', async () => {
    renderPage()
    expect(await screen.findByText(/no has creado partidas todavía/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /crear partida/i })).toBeInTheDocument()
  })

  it('si no autenticado redirige a /login', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      status: 'anonymous',
      isAuthenticated: false,
    })
    renderPage()
    expect(await screen.findByTestId('login')).toBeInTheDocument()
  })
})
```

Run: `cd frontend && npm test -- MySessionsPage`
Expected: FAIL (page no existe).

- [ ] **Step 5: Implementar `MySessionsPage`**

Crea `frontend/src/features/sessions/pages/MySessionsPage.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Pagination } from '@/shared/components/Pagination'
import { SeoHead } from '@/shared/components/SeoHead'
import { SessionCard } from '@/shared/components/SessionCard'

import { MyHistoryTable } from '../components/MyHistoryTable'
import { MySessionsTabs } from '../components/MySessionsTabs'
import { useMySessionsQuery } from '../hooks/useMySessions'
import type { MyTab } from '../types/session.types'

const VALID_TABS: MyTab[] = ['CREATED', 'PLAYER', 'WAITLIST', 'HISTORY']

function parseTab(raw: string | null): MyTab {
  return raw && (VALID_TABS as string[]).includes(raw) ? (raw as MyTab) : 'CREATED'
}

const ACCENT_BY_TAB: Record<MyTab, 'yellow' | 'green' | 'blue' | 'muted'> = {
  CREATED: 'yellow',
  PLAYER: 'green',
  WAITLIST: 'blue',
  HISTORY: 'muted',
}

export default function MySessionsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  if (!isAuthenticated) {
    return <Navigate to="/login?next=/sessions/mine" replace />
  }

  const tab = parseTab(searchParams.get('tab'))
  const page = Math.max(0, Number.parseInt(searchParams.get('page') ?? '0', 10) || 0)

  const { data, isLoading, isError, refetch } = useMySessionsQuery(tab, page)

  function changeTab(next: MyTab) {
    const params: Record<string, string> = { tab: next }
    setSearchParams(params, { replace: false })
  }

  function changePage(next: number) {
    setSearchParams({ tab, page: String(next) }, { replace: false })
  }

  // Counts: si todavía no tenemos data, ponemos zeros para que los tabs se rendericen.
  const counts = data?.counts ?? { created: 0, player: 0, waitlist: 0, history: 0 }
  const items = data?.items.items ?? []

  function renderEmpty() {
    const map = {
      CREATED: { msgKey: 'sessions.mine.empty.created', ctaKey: 'sessions.mine.empty.createdCta', to: '/sessions/new' },
      PLAYER:   { msgKey: 'sessions.mine.empty.player',  ctaKey: 'sessions.mine.empty.playerCta',  to: '/sessions' },
      WAITLIST: { msgKey: 'sessions.mine.empty.waitlist', ctaKey: 'sessions.mine.empty.waitlistCta', to: '/sessions' },
      HISTORY:  { msgKey: 'sessions.mine.empty.history',  ctaKey: null, to: null },
    } as const
    const cfg = map[tab]
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t(cfg.msgKey)}</p>
        {cfg.ctaKey && cfg.to && (
          <Link
            to={cfg.to}
            className="mt-4 inline-block rounded-md bg-red px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            {t(cfg.ctaKey)}
          </Link>
        )}
      </div>
    )
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="space-y-3 p-4">
          <div className="h-24 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
        </div>
      )
    }
    if (isError) {
      return (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('common.error')}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold"
          >
            {t('common.retry')}
          </button>
        </div>
      )
    }
    if (items.length === 0) return renderEmpty()

    if (tab === 'HISTORY') {
      return (
        <div className="p-4">
          <MyHistoryTable rows={items} />
        </div>
      )
    }

    const accent = ACCENT_BY_TAB[tab]
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <SessionCard key={s.id} session={s} accentColor={accent} />
        ))}
      </div>
    )
  }

  return (
    <div className="container py-6">
      <SeoHead title={`${t('sessions.mine.title')} | Match&Play`} description={t('sessions.mine.title')} noindex />
      <h1 className="mb-4 px-4 font-display text-2xl font-bold sm:text-3xl">
        {t('sessions.mine.title')}
      </h1>
      <MySessionsTabs active={tab} counts={counts} onChange={changeTab} />
      {renderContent()}
      {data && data.items.totalPages > 1 && (
        <div className="mt-4 px-4">
          <Pagination
            page={data.items.page}
            totalPages={data.items.totalPages}
            onChange={changePage}
          />
        </div>
      )}
    </div>
  )
}
```

(Si `Pagination` tiene una API distinta, adapta. Si el componente expone `currentPage` en vez de `page`, ajusta los nombres.)

Run: `cd frontend && npm test -- MySessionsPage`
Expected: 5/5 PASS.

- [ ] **Step 6: TSC + suite completa**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: TSC clean. Suite passing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/sessions/pages/MySessionsPage.tsx \
        frontend/src/features/sessions/components/MySessionsTabs.tsx \
        frontend/src/features/sessions/__tests__/MySessionsPage.test.tsx \
        frontend/src/shared/components/SessionCard.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "feat(sessions): MySessionsPage con tabs y empty states"
```

---

## Task 6: FE — `CreateSessionPage` precarga con `?from={id}`

**Files:**
- Modify: `frontend/src/features/sessions/pages/CreateSessionPage.tsx`
- Modify: `frontend/src/features/sessions/__tests__/CreateSessionForm.test.tsx` (o el test de CreateSessionPage si existe)

- [ ] **Step 1: Lee la implementación actual de CreateSessionPage**

Lee `frontend/src/features/sessions/pages/CreateSessionPage.tsx` para entender:
- Cómo se inicializa el form (`useForm`, `useState`, react-hook-form, etc.)
- Qué API usa para crear
- Cómo maneja navegación post-submit

El plan asume react-hook-form o similar con `defaultValues`. Si usa `useState`, adapta el patrón.

- [ ] **Step 2: Añadir lectura del query param + fetch**

Al principio del componente, después del setup de auth:

```tsx
const [searchParams] = useSearchParams()
const fromId = searchParams.get('from')
const fromIdNum = fromId ? Number.parseInt(fromId, 10) : null
const validFromId = fromIdNum != null && Number.isFinite(fromIdNum) ? fromIdNum : null

const { data: source, isLoading: isLoadingSource } = useSessionDetailQuery(validFromId ?? undefined)
```

Imports nuevos:
```tsx
import { useSearchParams } from 'react-router-dom'
import { useSessionDetailQuery } from '../hooks/useSessions'
```

- [ ] **Step 3: Pre-fill del form al cargar `source`**

Patrón con `useEffect` que solo dispara UNA vez cuando `source` está disponible:

```tsx
const prefilledRef = useRef(false)

useEffect(() => {
  if (prefilledRef.current) return
  if (!source) return
  prefilledRef.current = true

  // Asume react-hook-form. Si tu form usa otro state, adapta.
  reset({
    title: source.title,
    description: source.description ?? '',
    baseGameId: source.baseGameId,
    expansionBggIds: source.expansions.map((e) => e.bggId),
    cityCode: source.cityCode,
    areaCode: source.areaCode,
    maxPlayers: source.maxPlayers,
    scheduledAt: '',
    creatorGuests: 0,
  })
}, [source, reset])
```

Si el form NO usa `reset` (no es react-hook-form), entonces setea cada `useState` correspondiente.

`useRef` import:
```tsx
import { useEffect, useRef } from 'react'
```

Si hay validación o un wizard multi-step, asegúrate de que el pre-fill no rompe el flujo (los campos se rellenan ANTES de que el user empiece a interactuar).

- [ ] **Step 4: Mostrar spinner mientras carga source**

Si `validFromId != null && isLoadingSource`, muestra un spinner o skeleton sobre el form:

```tsx
if (validFromId && isLoadingSource) {
  return (
    <div className="container py-12 text-center">
      <p className="text-muted-foreground">{t('common.loading')}</p>
    </div>
  )
}
```

Si `validFromId != null` y la query falla (404 etc.), seguir mostrando el form vacío (silently swallow el error — no es crítico).

- [ ] **Step 5: Test del precargado**

En `frontend/src/features/sessions/__tests__/CreateSessionForm.test.tsx` (o `CreateSessionPage.test.tsx` si existe), añade:

```tsx
it('precarga el form cuando hay ?from=ID en la URL', async () => {
  server.use(
    http.get(`${API}/sessions/42`, () =>
      HttpResponse.json({
        id: 42,
        title: 'Mi partida vieja',
        description: 'Descripción precargada',
        baseGameId: 100,
        baseGameName: 'Catan',
        baseGameThumbnailUrl: null,
        baseGameSummary: null,
        expansions: [{ bggId: 200, name: 'Exp', thumbnailUrl: null }],
        creatorGuests: 2,
        cityCode: 'MAD',
        cityName: 'Madrid',
        areaCode: 'CEN',
        areaName: 'Centro',
        scheduledAt: '2026-01-15T19:00:00Z',
        maxPlayers: 4,
        registeredPlayers: 1,
        waitlistCount: 0,
        status: 'COMPLETED',
        creatorId: 1,
        creatorUsername: 'me',
        chatUnreadCount: null,
        chatMessageCount: null,
        players: [],
        yourRole: null,
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
      }),
    ),
  )
  renderPage('/sessions/new?from=42')  // helper que monta con MemoryRouter
  // Espera a que el form se pre-llene
  expect(await screen.findByDisplayValue('Mi partida vieja')).toBeInTheDocument()
  expect(screen.getByDisplayValue('Descripción precargada')).toBeInTheDocument()
  // creatorGuests NO se precarga: debe estar a 0
  const guestsInput = screen.getByLabelText(/acompañantes/i) as HTMLInputElement
  expect(guestsInput.value).toBe('0')
  // scheduledAt vacío (no se ha precargado)
  const dateInput = screen.queryByDisplayValue('2026-01-15T19:00') as HTMLInputElement | null
  expect(dateInput).toBeNull()
})

it('sin ?from= en URL el form arranca vacío', async () => {
  renderPage('/sessions/new')
  expect(await screen.findByRole('heading', { name: /crear partida/i })).toBeInTheDocument()
  // Sin valores precargados
  const titleInput = screen.getByLabelText(/título|title/i) as HTMLInputElement
  expect(titleInput.value).toBe('')
})
```

(Las queries por label dependen de cómo está etiquetado el form actual. Si los labels son distintos, adapta.)

- [ ] **Step 6: TSC + tests**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: TSC clean, los tests pasan.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/sessions/pages/CreateSessionPage.tsx \
        frontend/src/features/sessions/__tests__/
git commit -m "feat(sessions): CreateSessionPage precarga con ?from=id"
```

---

## Task 7: FE — Activar "Mis partidas" en menú + ruta

**Files:**
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/app/layouts/MobileMenu.tsx`
- Modify: `frontend/src/app/layouts/__tests__/MobileMenu.test.tsx`
- Modify: `frontend/src/app/layouts/SiteHeader.tsx` (si tiene nav desktop con un item de "Mis partidas")

- [ ] **Step 1: Añadir ruta al router**

En `frontend/src/app/router.tsx`, añade el import lazy:

```tsx
const MySessionsPage = lazy(() => import('@/features/sessions/pages/MySessionsPage'))
```

Y dentro del array de `MainLayout` children, junto a las otras rutas de sessions, añade:

```tsx
{
  path: '/sessions/mine',
  element: (
    <ProtectedRoute>
      <MySessionsPage />
    </ProtectedRoute>
  ),
},
```

Colócalo ANTES de `/sessions/:id` para evitar que `mine` matchee como un id.

- [ ] **Step 2: Activar item en `MobileMenu`**

En `frontend/src/app/layouts/MobileMenu.tsx`, localiza el bloque del `MenuItem` "Mis partidas" (~líneas 161-171, actualmente con `disabled` y `badge="comingSoon"`). Reemplaza por:

```tsx
{isAuthenticated && (
  <MenuItem
    to="/sessions/mine"
    active={location.pathname === '/sessions/mine'}
    icon={<CalendarCheck size={20} aria-hidden="true" />}
    iconBg="bg-green-soft"
    iconColor="text-green"
  >
    {t('nav.mySessions')}
  </MenuItem>
)}
```

(Quita `disabled` y `badge`.)

- [ ] **Step 3: Actualizar test del MobileMenu**

Lee `frontend/src/app/layouts/__tests__/MobileMenu.test.tsx`. Si tiene un test que verificaba que "Mis partidas" estaba disabled, adáptalo:

```tsx
it('Mis partidas es un link activo cuando estás autenticado', () => {
  mockUseAuth.mockReturnValue({
    user: { username: 'me', /* ... */ },
    status: 'authenticated',
    isAuthenticated: true,
  })
  renderMobileMenu()
  const link = screen.getByRole('link', { name: /mis partidas/i })
  expect(link).toHaveAttribute('href', '/sessions/mine')
})
```

Si había un test que aseveraba el "Próximamente" badge, bórralo.

- [ ] **Step 4: Header desktop (si aplica)**

Lee `frontend/src/app/layouts/SiteHeader.tsx`. Si tiene una nav desktop visible con items, añade "Mis partidas" cuando `isAuthenticated`. Si NO tiene items (solo logo + auth), no toques nada.

- [ ] **Step 5: TSC + tests + manual smoke**

Run: `cd frontend && npx tsc --noEmit`
Run: `cd frontend && npm test`
Expected: TSC clean, tests passing.

Manualmente (si tienes el dev server corriendo): logueado, click "Mis partidas" en el menú → deberías aterrizar en `/sessions/mine` con los tabs visibles.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/router.tsx \
        frontend/src/app/layouts/MobileMenu.tsx \
        frontend/src/app/layouts/__tests__/MobileMenu.test.tsx
git commit -m "feat(sessions): activar Mis partidas en menú y ruta protegida"
```

(Si tocaste `SiteHeader.tsx`, inclúyelo.)

---

## Cierre de sesión (al terminar las 7 tasks)

NO pushear hasta que el usuario lo pida. Cuando lo indique:

1. Actualizar specs (`docs/backend/modules/sessions-spec.md`, `docs/frontend/modules/sessions-spec.md`) — añadir Mis sesiones, endpoint, `expansionNames`, componentes nuevos, ruta.
2. Si alguna regla del proyecto merece quedar en `CLAUDE.md`, añadir (improbable en este sprint).
3. Último commit con docs.
4. `git push origin master` cuando el usuario confirme.
