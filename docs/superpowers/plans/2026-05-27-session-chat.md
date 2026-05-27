# Session Chat (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar chat por partida (`GameSession`) accesible desde un drawer en la session detail page, con polling, badge de no leídos persistente, hard-delete al cerrar/cancelar la partida, y autorización por rol (PLAYER/creator escriben, WAITLIST solo lee).

**Architecture:** Una tabla nueva `session_messages` + columna `last_chat_read_at` en la tabla existente `session_participants`. Tres endpoints REST (`GET`, `POST`, `POST mark-read`). El `chatUnreadCount` se expone como nuevo campo en `SessionDetailResponse`. En frontend, el placeholder existente se convierte en botón con badge que abre un drawer derecho (desktop) o full-screen modal (mobile), con polling 20s mientras está abierto.

**Tech Stack:** Spring Boot 3 (Java 21), Flyway, JPA/Hibernate, MySQL, JUnit 5 + Mockito + AssertJ, React 18 + Vite + TS + Tailwind + TanStack Query + i18next, MSW para tests FE.

**Spec de referencia:** [docs/superpowers/specs/2026-05-27-session-chat-design.md](../specs/2026-05-27-session-chat-design.md)

---

## File Structure

### Backend — Creados
- `backend/src/main/resources/db/migration/V11__session_messages_and_chat_read.sql`
- `backend/src/main/java/com/matchplay/session/entity/SessionMessage.java`
- `backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java`
- `backend/src/main/java/com/matchplay/session/dto/SessionMessageResponse.java`
- `backend/src/main/java/com/matchplay/session/dto/CreateMessageRequest.java`
- `backend/src/main/java/com/matchplay/session/service/SessionChatService.java` (interface)
- `backend/src/main/java/com/matchplay/session/service/SessionChatServiceImpl.java`
- `backend/src/main/java/com/matchplay/session/controller/SessionChatController.java`
- `backend/src/main/java/com/matchplay/exception/SessionChatForbiddenException.java`
- `backend/src/main/java/com/matchplay/exception/SessionChatWriteForbiddenException.java`
- `backend/src/main/java/com/matchplay/exception/SessionChatClosedException.java`
- `backend/src/test/java/com/matchplay/session/service/SessionChatServiceImplTest.java`
- `backend/src/test/java/com/matchplay/session/controller/SessionChatControllerTest.java`

### Backend — Modificados
- `backend/src/main/java/com/matchplay/session/entity/SessionParticipant.java` — añadir `lastChatReadAt`
- `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java` — añadir `chatUnreadCount`
- `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java` — pasar el unread count
- `backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java` — borrar mensajes en `changeStatus`/`close` cuando target sea COMPLETED/CANCELLED; pasar unread a buildDetail
- `backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java` — 3 handlers nuevos
- `backend/src/main/resources/messages_es.properties` + `messages_en.properties` — 3 claves nuevas
- `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java` — actualizar fixtures `SessionDetailResponse` posicionalmente + tests del borrado en close/changeStatus
- `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java` — actualizar fixtures `SessionDetailResponse`
- `backend/src/test/java/com/matchplay/session/mapper/SessionMapperTest.java` — actualizar fixtures
- Toda otra fixture lejana que construya `SessionDetailResponse` posicionalmente

### Frontend — Creados
- `frontend/src/features/sessions/api/messagesApi.ts`
- `frontend/src/features/sessions/hooks/useChatMessages.ts`
- `frontend/src/features/sessions/components/SessionChatButton.tsx` (renombre del placeholder, ver Task 5)
- `frontend/src/features/sessions/components/SessionChatDrawer.tsx`
- `frontend/src/features/sessions/components/ChatMessageRow.tsx`
- `frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx`
- `frontend/src/features/sessions/__tests__/SessionChatDrawer.test.tsx`

### Frontend — Modificados
- `frontend/src/features/sessions/types/session.types.ts` — añadir `SessionMessage` + `chatUnreadCount` en `SessionDetail`
- `frontend/src/features/sessions/pages/SessionDetailPage.tsx` — sustituir `<SessionChatPlaceholder/>` por `<SessionChatButton session={data}/>` que gestiona el drawer
- `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx` — actualizar fixture `detail()` con `chatUnreadCount: null` por defecto
- `frontend/src/shared/i18n/locales/es.json` y `en.json` — claves nuevas bajo `sessions.chat.*`
- `frontend/src/features/sessions/components/SessionChatPlaceholder.tsx` — **eliminado** (su contenido se mueve a `SessionChatButton.tsx`)

### Convenciones del repo a respetar (extraídas de CLAUDE.md)
- Trabajamos directo sobre `master`, sin feature branches.
- Pre-commit hook (husky + lint-staged) corre prettier + eslint --fix automáticamente.
- Push solo al cierre de sesión cuando el usuario lo pida.
- Al añadir un campo a un record Java (especialmente `SessionDetailResponse`), grep `new SessionDetailResponse(` en `**/test/**` y actualiza cada constructor posicional.

---

## Task 1: BE — Migración V11, entidad y repository

**Files:**
- Create: `backend/src/main/resources/db/migration/V11__session_messages_and_chat_read.sql`
- Create: `backend/src/main/java/com/matchplay/session/entity/SessionMessage.java`
- Create: `backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java`
- Modify: `backend/src/main/java/com/matchplay/session/entity/SessionParticipant.java`

- [ ] **Step 1: Crear migración V11**

Crea `backend/src/main/resources/db/migration/V11__session_messages_and_chat_read.sql` con este contenido exacto:

```sql
CREATE TABLE session_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(500) NOT NULL,
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

- [ ] **Step 2: Crear entidad `SessionMessage`**

Crea `backend/src/main/java/com/matchplay/session/entity/SessionMessage.java`:

```java
package com.matchplay.session.entity;

import com.matchplay.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Mensaje del chat de coordinación de una partida.
 *
 * <p>Se borra en cascada cuando la {@link GameSession} pasa a COMPLETED o
 * CANCELLED (ver {@code GameSessionServiceImpl.changeStatus} y
 * {@code close}). No editable ni borrable individualmente por el usuario.</p>
 */
@Entity
@Table(
        name = "session_messages",
        indexes = {
                @Index(name = "idx_session_messages_session_created",
                        columnList = "session_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class SessionMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    public SessionMessage(GameSession session, User user, String content) {
        this.session = session;
        this.user = user;
        this.content = content;
    }
}
```

- [ ] **Step 3: Añadir `lastChatReadAt` a `SessionParticipant`**

En `backend/src/main/java/com/matchplay/session/entity/SessionParticipant.java`, justo después del campo `promotedAt`, añade:

```java
    /**
     * Última vez que el usuario ha consultado el chat de esta partida.
     * NULL si nunca lo ha abierto. Usado para calcular {@code chatUnreadCount}
     * en el detail response.
     */
    @Column(name = "last_chat_read_at")
    private Instant lastChatReadAt;
```

- [ ] **Step 4: Crear repository**

Crea `backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java`:

```java
package com.matchplay.session.repository;

import com.matchplay.session.entity.SessionMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SessionMessageRepository extends JpaRepository<SessionMessage, Long> {

    /** Todos los mensajes de una partida, ASC por created_at. */
    List<SessionMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    /** Mensajes con created_at > since, ASC. Para polling delta. */
    List<SessionMessage> findBySessionIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long sessionId, Instant since);

    /**
     * Cuenta mensajes de la sesión posteriores a {@code since} y que NO sean
     * del propio {@code excludeUserId}. Base del {@code chatUnreadCount}.
     */
    @Query("SELECT COUNT(m) FROM SessionMessage m " +
           "WHERE m.session.id = :sessionId " +
           "AND m.user.id <> :excludeUserId " +
           "AND m.createdAt > :since")
    long countUnread(@Param("sessionId") Long sessionId,
                     @Param("excludeUserId") Long excludeUserId,
                     @Param("since") Instant since);

    /** Borrado masivo usado al cerrar/cancelar la partida. */
    @Modifying
    @Query("DELETE FROM SessionMessage m WHERE m.session.id = :sessionId")
    int deleteBySessionId(@Param("sessionId") Long sessionId);
}
```

- [ ] **Step 5: Compilar y arrancar para validar la migración**

Run: `cd backend && ./mvnw compile`
Expected: BUILD SUCCESS.

(No arrancamos la app ahora — la migración se ejecutará la próxima vez que alguien arranque. Si querías validarla, levantar el backend en local sería el sanity check.)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V11__session_messages_and_chat_read.sql \
        backend/src/main/java/com/matchplay/session/entity/SessionMessage.java \
        backend/src/main/java/com/matchplay/session/entity/SessionParticipant.java \
        backend/src/main/java/com/matchplay/session/repository/SessionMessageRepository.java
git commit -m "feat(chat): migración V11 y entidad SessionMessage"
```

---

## Task 2: BE — Excepciones, mensajes i18n y handlers

**Files:**
- Create: `backend/src/main/java/com/matchplay/exception/SessionChatForbiddenException.java`
- Create: `backend/src/main/java/com/matchplay/exception/SessionChatWriteForbiddenException.java`
- Create: `backend/src/main/java/com/matchplay/exception/SessionChatClosedException.java`
- Modify: `backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/resources/messages_es.properties`
- Modify: `backend/src/main/resources/messages_en.properties`

- [ ] **Step 1: Crear las 3 excepciones**

Las 3 extienden `MatchplayException` (verifica leyendo `backend/src/main/java/com/matchplay/exception/MatchplayException.java` y otras excepciones como `SessionEmptyCannotCloseException` para confirmar el patrón).

Crea `backend/src/main/java/com/matchplay/exception/SessionChatForbiddenException.java`:

```java
package com.matchplay.exception;

/**
 * Lanzada cuando un usuario que no es participante ni creador intenta
 * acceder al chat de una partida.
 */
public class SessionChatForbiddenException extends MatchplayException {
    public SessionChatForbiddenException() {
        super("error.session.chat.forbidden");
    }
}
```

Crea `backend/src/main/java/com/matchplay/exception/SessionChatWriteForbiddenException.java`:

```java
package com.matchplay.exception;

/**
 * Lanzada cuando un usuario WAITLIST intenta enviar un mensaje. Solo PLAYER
 * y creador pueden escribir.
 */
public class SessionChatWriteForbiddenException extends MatchplayException {
    public SessionChatWriteForbiddenException() {
        super("error.session.chat.write.forbidden");
    }
}
```

Crea `backend/src/main/java/com/matchplay/exception/SessionChatClosedException.java`:

```java
package com.matchplay.exception;

/**
 * Lanzada cuando se intenta escribir/leer mensajes de una partida que ya
 * está COMPLETED o CANCELLED (el chat se cerró y los mensajes se borraron).
 */
public class SessionChatClosedException extends MatchplayException {
    public SessionChatClosedException() {
        super("error.session.chat.closed");
    }
}
```

- [ ] **Step 2: Añadir claves i18n**

En `backend/src/main/resources/messages_es.properties`, al final:

```properties
error.session.chat.forbidden=No tienes acceso al chat de esta partida.
error.session.chat.write.forbidden=Solo los jugadores apuntados pueden escribir en el chat.
error.session.chat.closed=El chat de esta partida ya está cerrado.
```

En `backend/src/main/resources/messages_en.properties`:

```properties
error.session.chat.forbidden=You don't have access to this game's chat.
error.session.chat.write.forbidden=Only registered players can write in the chat.
error.session.chat.closed=This game's chat is already closed.
```

- [ ] **Step 3: Añadir handlers**

En `backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java`, después del handler de `SessionEmptyCannotCloseException` (línea ~145), añade los 3 nuevos handlers. Sigue el patrón EXACTO de los existentes (un método por excepción):

```java
@ExceptionHandler(SessionChatForbiddenException.class)
public ResponseEntity<ErrorResponse> handleSessionChatForbidden(
        SessionChatForbiddenException ex, HttpServletRequest request, Locale locale) {
    String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ErrorResponse.of(403, "Forbidden", ex.getMessageKey(), message, request.getRequestURI()));
}

@ExceptionHandler(SessionChatWriteForbiddenException.class)
public ResponseEntity<ErrorResponse> handleSessionChatWriteForbidden(
        SessionChatWriteForbiddenException ex, HttpServletRequest request, Locale locale) {
    String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ErrorResponse.of(403, "Forbidden", ex.getMessageKey(), message, request.getRequestURI()));
}

@ExceptionHandler(SessionChatClosedException.class)
public ResponseEntity<ErrorResponse> handleSessionChatClosed(
        SessionChatClosedException ex, HttpServletRequest request, Locale locale) {
    String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
    return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
}
```

Añade los imports correspondientes al header del archivo.

- [ ] **Step 4: Compilar**

Run: `cd backend && ./mvnw compile`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/matchplay/exception/SessionChatForbiddenException.java \
        backend/src/main/java/com/matchplay/exception/SessionChatWriteForbiddenException.java \
        backend/src/main/java/com/matchplay/exception/SessionChatClosedException.java \
        backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java \
        backend/src/main/resources/messages_es.properties \
        backend/src/main/resources/messages_en.properties
git commit -m "feat(chat): excepciones y handlers del módulo chat"
```

---

## Task 3: BE — Service, DTOs y endpoints REST

**Files:**
- Create: `backend/src/main/java/com/matchplay/session/dto/SessionMessageResponse.java`
- Create: `backend/src/main/java/com/matchplay/session/dto/CreateMessageRequest.java`
- Create: `backend/src/main/java/com/matchplay/session/service/SessionChatService.java`
- Create: `backend/src/main/java/com/matchplay/session/service/SessionChatServiceImpl.java`
- Create: `backend/src/main/java/com/matchplay/session/controller/SessionChatController.java`
- Create: `backend/src/test/java/com/matchplay/session/service/SessionChatServiceImplTest.java`
- Create: `backend/src/test/java/com/matchplay/session/controller/SessionChatControllerTest.java`

- [ ] **Step 1: Crear DTOs**

`backend/src/main/java/com/matchplay/session/dto/SessionMessageResponse.java`:

```java
package com.matchplay.session.dto;

import java.time.Instant;

public record SessionMessageResponse(
        Long id,
        Long userId,
        String username,
        String content,
        Instant createdAt
) {}
```

`backend/src/main/java/com/matchplay/session/dto/CreateMessageRequest.java`:

```java
package com.matchplay.session.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMessageRequest(
        @NotBlank @Size(max = 500) String content
) {}
```

- [ ] **Step 2: Crear interface del service**

`backend/src/main/java/com/matchplay/session/service/SessionChatService.java`:

```java
package com.matchplay.session.service;

import com.matchplay.session.dto.CreateMessageRequest;
import com.matchplay.session.dto.SessionMessageResponse;

import java.time.Instant;
import java.util.List;

public interface SessionChatService {

    /**
     * Lista mensajes de la sesión. Si {@code since} es null, devuelve todos;
     * si está informado, solo los posteriores. Caller debe ser participante
     * (PLAYER/WAITLIST) o creador, si no {@link com.matchplay.exception.SessionChatForbiddenException}.
     */
    List<SessionMessageResponse> list(Long sessionId, Instant since);

    /**
     * Crea un mensaje. Caller debe ser PLAYER o creador. WAITLIST no puede
     * escribir ({@link com.matchplay.exception.SessionChatWriteForbiddenException}).
     * Si la sesión está COMPLETED o CANCELLED, lanza
     * {@link com.matchplay.exception.SessionChatClosedException}.
     */
    SessionMessageResponse send(Long sessionId, CreateMessageRequest request);

    /**
     * Marca el chat como leído por el caller actualizando {@code last_chat_read_at}.
     * Idempotente. Caller debe ser participante o creador.
     */
    void markRead(Long sessionId);
}
```

- [ ] **Step 3: Escribir tests del service (TDD) que fallan**

Crea `backend/src/test/java/com/matchplay/session/service/SessionChatServiceImplTest.java`. Sigue el estilo del existente `GameSessionServiceImplTest` (Mockito directo, no `@SpringBootTest`):

```java
package com.matchplay.session.service;

import com.matchplay.exception.SessionChatClosedException;
import com.matchplay.exception.SessionChatForbiddenException;
import com.matchplay.exception.SessionChatWriteForbiddenException;
import com.matchplay.exception.SessionNotFoundException;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.CreateMessageRequest;
import com.matchplay.session.dto.SessionMessageResponse;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.entity.SessionMessage;
import com.matchplay.session.entity.SessionParticipant;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.SessionMessageRepository;
import com.matchplay.session.repository.SessionParticipantRepository;
import com.matchplay.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionChatServiceImplTest {

    @Mock GameSessionRepository sessionRepository;
    @Mock SessionMessageRepository messageRepository;
    @Mock SessionParticipantRepository participantRepository;
    @Mock CurrentUserProvider currentUserProvider;

    @InjectMocks SessionChatServiceImpl service;

    private User creator;
    private User player;
    private User waitlistUser;
    private User outsider;
    private GameSession session;

    @BeforeEach
    void setUp() {
        creator = new User();
        creator.setId(1L);
        creator.setUsername("creator");

        player = new User();
        player.setId(2L);
        player.setUsername("player2");

        waitlistUser = new User();
        waitlistUser.setId(3L);
        waitlistUser.setUsername("wait3");

        outsider = new User();
        outsider.setId(99L);
        outsider.setUsername("outsider");

        session = new GameSession();
        session.setId(10L);
        session.setCreator(creator);
        session.setStatus(SessionStatus.OPEN);
    }

    private SessionParticipant participant(User u, ParticipantRole role) {
        SessionParticipant p = new SessionParticipant();
        p.setSession(session);
        p.setUser(u);
        p.setRole(role);
        return p;
    }

    // ---------- list ----------

    @Test
    void list_returnsMessagesAsc_forCreator() {
        when(currentUserProvider.requireCurrentUserId()).thenReturn(creator.getId());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        SessionMessage m1 = new SessionMessage(session, creator, "hola");
        m1.setId(1L);
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(10L))
                .thenReturn(List.of(m1));

        List<SessionMessageResponse> out = service.list(10L, null);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).content()).isEqualTo("hola");
    }

    @Test
    void list_filtersBySince() {
        when(currentUserProvider.requireCurrentUserId()).thenReturn(creator.getId());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        Instant since = Instant.parse("2026-01-01T00:00:00Z");
        when(messageRepository.findBySessionIdAndCreatedAtAfterOrderByCreatedAtAsc(10L, since))
                .thenReturn(List.of());

        List<SessionMessageResponse> out = service.list(10L, since);

        assertThat(out).isEmpty();
        verify(messageRepository, never()).findBySessionIdOrderByCreatedAtAsc(any());
    }

    @Test
    void list_throws_whenOutsider() {
        when(currentUserProvider.requireCurrentUserId()).thenReturn(outsider.getId());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(participantRepository.findBySessionIdAndUserId(10L, outsider.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list(10L, null))
                .isInstanceOf(SessionChatForbiddenException.class);
    }

    @Test
    void list_ok_forWaitlist() {
        when(currentUserProvider.requireCurrentUserId()).thenReturn(waitlistUser.getId());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(participantRepository.findBySessionIdAndUserId(10L, waitlistUser.getId()))
                .thenReturn(Optional.of(participant(waitlistUser, ParticipantRole.WAITLIST)));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(10L))
                .thenReturn(List.of());

        List<SessionMessageResponse> out = service.list(10L, null);

        assertThat(out).isEmpty();
    }

    @Test
    void list_throws_whenSessionNotFound() {
        when(sessionRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list(10L, null))
                .isInstanceOf(SessionNotFoundException.class);
    }

    // ---------- send ----------

    @Test
    void send_ok_asPlayer() {
        when(currentUserProvider.requireCurrentUser()).thenReturn(player);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(participantRepository.findBySessionIdAndUserId(10L, player.getId()))
                .thenReturn(Optional.of(participant(player, ParticipantRole.PLAYER)));
        when(messageRepository.save(any(SessionMessage.class))).thenAnswer(inv -> {
            SessionMessage m = inv.getArgument(0);
            m.setId(42L);
            m.setCreatedAt(Instant.now());
            return m;
        });

        SessionMessageResponse out = service.send(10L, new CreateMessageRequest("hola"));

        assertThat(out.content()).isEqualTo("hola");
        assertThat(out.userId()).isEqualTo(player.getId());
        assertThat(out.username()).isEqualTo("player2");
    }

    @Test
    void send_ok_asCreator() {
        when(currentUserProvider.requireCurrentUser()).thenReturn(creator);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(messageRepository.save(any(SessionMessage.class))).thenAnswer(inv -> {
            SessionMessage m = inv.getArgument(0);
            m.setId(42L);
            m.setCreatedAt(Instant.now());
            return m;
        });

        SessionMessageResponse out = service.send(10L, new CreateMessageRequest("anuncio"));

        assertThat(out.username()).isEqualTo("creator");
        // creator no necesita figura en session_participants — el service lo detecta por id
        verify(participantRepository, never()).findBySessionIdAndUserId(any(), any());
    }

    @Test
    void send_throws_asWaitlist() {
        when(currentUserProvider.requireCurrentUser()).thenReturn(waitlistUser);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(participantRepository.findBySessionIdAndUserId(10L, waitlistUser.getId()))
                .thenReturn(Optional.of(participant(waitlistUser, ParticipantRole.WAITLIST)));

        assertThatThrownBy(() -> service.send(10L, new CreateMessageRequest("hola")))
                .isInstanceOf(SessionChatWriteForbiddenException.class);
        verify(messageRepository, never()).save(any());
    }

    @Test
    void send_throws_asOutsider() {
        when(currentUserProvider.requireCurrentUser()).thenReturn(outsider);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(participantRepository.findBySessionIdAndUserId(10L, outsider.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.send(10L, new CreateMessageRequest("hola")))
                .isInstanceOf(SessionChatForbiddenException.class);
    }

    @Test
    void send_throws_whenCompleted() {
        session.setStatus(SessionStatus.COMPLETED);
        when(currentUserProvider.requireCurrentUser()).thenReturn(creator);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.send(10L, new CreateMessageRequest("hola")))
                .isInstanceOf(SessionChatClosedException.class);
    }

    @Test
    void send_throws_whenCancelled() {
        session.setStatus(SessionStatus.CANCELLED);
        when(currentUserProvider.requireCurrentUser()).thenReturn(creator);
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.send(10L, new CreateMessageRequest("hola")))
                .isInstanceOf(SessionChatClosedException.class);
    }

    // ---------- markRead ----------

    @Test
    void markRead_setsLastChatReadAt_forParticipant() {
        when(currentUserProvider.requireCurrentUserId()).thenReturn(player.getId());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        SessionParticipant p = participant(player, ParticipantRole.PLAYER);
        when(participantRepository.findBySessionIdAndUserId(10L, player.getId()))
                .thenReturn(Optional.of(p));

        service.markRead(10L);

        assertThat(p.getLastChatReadAt()).isNotNull();
        verify(participantRepository, times(1)).save(p);
    }

    @Test
    void markRead_noop_forCreator() {
        // El creador no tiene fila en session_participants (es el creador, no
        // "participante" en el sentido de la tabla). markRead es no-op para él.
        when(currentUserProvider.requireCurrentUserId()).thenReturn(creator.getId());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));

        service.markRead(10L);

        verify(participantRepository, never()).save(any());
    }

    @Test
    void markRead_throws_whenOutsider() {
        when(currentUserProvider.requireCurrentUserId()).thenReturn(outsider.getId());
        when(sessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(participantRepository.findBySessionIdAndUserId(10L, outsider.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(10L))
                .isInstanceOf(SessionChatForbiddenException.class);
    }
}
```

- [ ] **Step 4: Ejecutar tests y verificar que fallan**

Run: `cd backend && ./mvnw test -Dtest=SessionChatServiceImplTest`
Expected: FAIL (clase `SessionChatServiceImpl` no existe).

- [ ] **Step 5: Implementar el service**

Crea `backend/src/main/java/com/matchplay/session/service/SessionChatServiceImpl.java`:

```java
package com.matchplay.session.service;

import com.matchplay.exception.SessionChatClosedException;
import com.matchplay.exception.SessionChatForbiddenException;
import com.matchplay.exception.SessionChatWriteForbiddenException;
import com.matchplay.exception.SessionNotFoundException;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.session.dto.CreateMessageRequest;
import com.matchplay.session.dto.SessionMessageResponse;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.entity.SessionMessage;
import com.matchplay.session.entity.SessionParticipant;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.session.repository.SessionMessageRepository;
import com.matchplay.session.repository.SessionParticipantRepository;
import com.matchplay.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionChatServiceImpl implements SessionChatService {

    private final GameSessionRepository sessionRepository;
    private final SessionMessageRepository messageRepository;
    private final SessionParticipantRepository participantRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public List<SessionMessageResponse> list(Long sessionId, Instant since) {
        GameSession session = requireSession(sessionId);
        Long userId = currentUserProvider.requireCurrentUserId();
        assertParticipantOrCreator(session, userId);

        List<SessionMessage> messages = since == null
                ? messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                : messageRepository.findBySessionIdAndCreatedAtAfterOrderByCreatedAtAsc(sessionId, since);

        return messages.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public SessionMessageResponse send(Long sessionId, CreateMessageRequest request) {
        GameSession session = requireSession(sessionId);
        User user = currentUserProvider.requireCurrentUser();

        if (session.getStatus() == SessionStatus.COMPLETED
                || session.getStatus() == SessionStatus.CANCELLED) {
            throw new SessionChatClosedException();
        }

        boolean isCreator = session.getCreator().getId().equals(user.getId());
        if (!isCreator) {
            SessionParticipant participant = participantRepository
                    .findBySessionIdAndUserId(sessionId, user.getId())
                    .orElseThrow(SessionChatForbiddenException::new);
            if (participant.getRole() != ParticipantRole.PLAYER) {
                throw new SessionChatWriteForbiddenException();
            }
        }

        SessionMessage saved = messageRepository.save(
                new SessionMessage(session, user, request.content()));
        log.debug("Session {} message saved: id={} by user {}", sessionId, saved.getId(), user.getId());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void markRead(Long sessionId) {
        GameSession session = requireSession(sessionId);
        Long userId = currentUserProvider.requireCurrentUserId();
        assertParticipantOrCreator(session, userId);

        // El creador no tiene fila en session_participants — no hay nada que persistir.
        if (session.getCreator().getId().equals(userId)) {
            return;
        }
        participantRepository.findBySessionIdAndUserId(sessionId, userId)
                .ifPresent(p -> {
                    p.setLastChatReadAt(Instant.now());
                    participantRepository.save(p);
                });
    }

    // ---------- helpers ----------

    private GameSession requireSession(Long sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));
    }

    private void assertParticipantOrCreator(GameSession session, Long userId) {
        if (session.getCreator().getId().equals(userId)) return;
        Optional<SessionParticipant> p = participantRepository
                .findBySessionIdAndUserId(session.getId(), userId);
        if (p.isEmpty()) throw new SessionChatForbiddenException();
    }

    private SessionMessageResponse toResponse(SessionMessage m) {
        return new SessionMessageResponse(
                m.getId(),
                m.getUser().getId(),
                m.getUser().getUsername(),
                m.getContent(),
                m.getCreatedAt()
        );
    }
}
```

- [ ] **Step 6: Ejecutar tests del service y verificar que pasan**

Run: `cd backend && ./mvnw test -Dtest=SessionChatServiceImplTest`
Expected: PASS (todos los tests del service).

- [ ] **Step 7: Crear el controller**

`backend/src/main/java/com/matchplay/session/controller/SessionChatController.java`:

```java
package com.matchplay.session.controller;

import com.matchplay.session.dto.CreateMessageRequest;
import com.matchplay.session.dto.SessionMessageResponse;
import com.matchplay.session.service.SessionChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sessions/{id}/messages")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Partidas de juegos de mesa: listar, crear, unirse y gestionar")
public class SessionChatController {

    private final SessionChatService chatService;

    @GetMapping
    @Operation(summary = "Lista los mensajes del chat de la partida (delta opcional con ?since=)")
    public List<SessionMessageResponse> list(
            @PathVariable Long id,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since
    ) {
        return chatService.list(id, since);
    }

    @PostMapping
    @Operation(summary = "Envía un mensaje al chat (PLAYER o creador)")
    public SessionMessageResponse send(
            @PathVariable Long id,
            @Valid @RequestBody CreateMessageRequest request
    ) {
        return chatService.send(id, request);
    }

    @PostMapping("/mark-read")
    @Operation(summary = "Marca el chat como leído por el caller (idempotente)")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        chatService.markRead(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
```

- [ ] **Step 8: Crear tests del controller**

Sigue el patrón de `GameSessionControllerTest` (standaloneSetup, `@WebMvcTest` o el mismo estilo). Lee `GameSessionControllerTest` para confirmar la convención. Crea `backend/src/test/java/com/matchplay/session/controller/SessionChatControllerTest.java`:

```java
package com.matchplay.session.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchplay.exception.GlobalExceptionHandler;
import com.matchplay.exception.SessionChatClosedException;
import com.matchplay.exception.SessionChatForbiddenException;
import com.matchplay.exception.SessionChatWriteForbiddenException;
import com.matchplay.session.dto.CreateMessageRequest;
import com.matchplay.session.dto.SessionMessageResponse;
import com.matchplay.session.service.SessionChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.context.MessageSource;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SessionChatControllerTest {

    private MockMvc mockMvc;
    private SessionChatService chatService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        chatService = Mockito.mock(SessionChatService.class);
        SessionChatController controller = new SessionChatController(chatService);

        ResourceBundleMessageSource ms = new ResourceBundleMessageSource();
        ms.setBasename("messages");
        ms.setDefaultEncoding("UTF-8");
        MessageSource messageSource = ms;

        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(handler)
                .setLocaleResolver(new AcceptHeaderLocaleResolver())
                .build();
    }

    @Test
    void list_returns200WithMessages() throws Exception {
        SessionMessageResponse m = new SessionMessageResponse(
                1L, 2L, "alice", "hola", Instant.parse("2026-01-01T10:00:00Z"));
        when(chatService.list(eq(10L), eq(null))).thenReturn(List.of(m));

        mockMvc.perform(get("/api/v1/sessions/10/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].content").value("hola"));
    }

    @Test
    void list_returns403_whenForbidden() throws Exception {
        when(chatService.list(eq(10L), any())).thenThrow(new SessionChatForbiddenException());

        mockMvc.perform(get("/api/v1/sessions/10/messages"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("error.session.chat.forbidden"));
    }

    @Test
    void send_returns200_withCreatedMessage() throws Exception {
        SessionMessageResponse m = new SessionMessageResponse(
                42L, 2L, "alice", "hola", Instant.parse("2026-01-01T10:00:00Z"));
        when(chatService.send(eq(10L), any())).thenReturn(m);

        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("hola"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.content").value("hola"));
    }

    @Test
    void send_returns400_whenContentBlank() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("   "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_returns403_whenWaitlist() throws Exception {
        when(chatService.send(eq(10L), any())).thenThrow(new SessionChatWriteForbiddenException());

        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("hola"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("error.session.chat.write.forbidden"));
    }

    @Test
    void send_returns409_whenChatClosed() throws Exception {
        when(chatService.send(eq(10L), any())).thenThrow(new SessionChatClosedException());

        mockMvc.perform(post("/api/v1/sessions/10/messages")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new CreateMessageRequest("hola"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("error.session.chat.closed"));
    }

    @Test
    void markRead_returns204() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/10/messages/mark-read"))
                .andExpect(status().isNoContent());
    }
}
```

- [ ] **Step 9: Ejecutar suite completa**

Run: `cd backend && ./mvnw test`
Expected: todos PASS. Baseline antes era 141; ahora ~155 (≈14 nuevos service + 6 controller).

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/matchplay/session/dto/SessionMessageResponse.java \
        backend/src/main/java/com/matchplay/session/dto/CreateMessageRequest.java \
        backend/src/main/java/com/matchplay/session/service/SessionChatService.java \
        backend/src/main/java/com/matchplay/session/service/SessionChatServiceImpl.java \
        backend/src/main/java/com/matchplay/session/controller/SessionChatController.java \
        backend/src/test/java/com/matchplay/session/service/SessionChatServiceImplTest.java \
        backend/src/test/java/com/matchplay/session/controller/SessionChatControllerTest.java
git commit -m "feat(chat): service y endpoints REST de mensajes"
```

---

## Task 4: BE — `chatUnreadCount` en `SessionDetailResponse` + borrado en lifecycle

**Files:**
- Modify: `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java`
- Modify: `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java`
- Modify: `backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java`
- Modify: tests existentes que construyan `SessionDetailResponse` posicionalmente:
  - `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java`
  - `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java`
  - `backend/src/test/java/com/matchplay/session/mapper/SessionMapperTest.java`
  - cualquier otra detectada por grep

- [ ] **Step 1: Añadir `chatUnreadCount` al record**

En `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java`, añade el campo `Integer chatUnreadCount` después de `creatorUsername` y antes de `players`:

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
        List<SessionPlayerResponse> players,
        ParticipantRole yourRole,
        Instant createdAt,
        Instant updatedAt
) {}
```

Conserva el orden de los demás campos.

- [ ] **Step 2: Actualizar todos los constructores posicionales en tests**

Run (PowerShell): `Select-String -Path "backend/src/test/**/*.java" -Pattern "new SessionDetailResponse\(" -List`

O (bash): `grep -rln "new SessionDetailResponse(" backend/src/test/`

Para cada match, abre el archivo y añade `null,` en la posición correspondiente (entre `creatorUsername` y `players`). Los locales conocidos:

- `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java` — helper `detail(...)`.
- `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java`.
- `backend/src/test/java/com/matchplay/session/mapper/SessionMapperTest.java`.

Hazlo metódicamente. Por cada `new SessionDetailResponse(...)`, cuenta los argumentos y añade `null,` después del argumento que corresponde a `creatorUsername`.

- [ ] **Step 3: Actualizar el `SessionMapper.toDetail`**

Ubica `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java` y abre el método `toDetail`. Le va a llegar un nuevo parámetro `Integer chatUnreadCount` (null si no aplica).

Cambia la firma a:

```java
public SessionDetailResponse toDetail(GameSession session,
                                      List<SessionParticipant> participants,
                                      ParticipantRole yourRole,
                                      Integer chatUnreadCount) {
```

Y pásalo al constructor del response en la nueva posición (entre `creatorUsername` y `players`).

- [ ] **Step 4: Actualizar el callsite en `GameSessionServiceImpl`**

En `GameSessionServiceImpl.java`, el `buildDetail` actual probablemente llama a `mapper.toDetail(session, participants, yourRole)`. Cambia la lógica para calcular el unread y pasarlo:

```java
private SessionDetailResponse buildDetail(GameSession session) {
    List<SessionParticipant> participants = participantRepository
            .findBySessionIdOrderByJoinedAtAsc(session.getId());

    Optional<Long> currentUserIdOpt = currentUserProvider.getCurrentUserId();
    ParticipantRole yourRole = currentUserIdOpt
            .flatMap(uid -> participants.stream()
                    .filter(p -> p.getUser().getId().equals(uid))
                    .findFirst()
                    .map(SessionParticipant::getRole))
            .orElse(null);

    Integer chatUnreadCount = computeChatUnreadCount(session, participants, currentUserIdOpt);

    return mapper.toDetail(session, participants, yourRole, chatUnreadCount);
}

/**
 * Devuelve null si el caller es anónimo o no participa (ni creador ni participante).
 * Devuelve 0 si está al día o el chat está cerrado. Devuelve N>0 si hay mensajes
 * posteriores a su {@code lastChatReadAt} que no son del propio caller.
 */
private Integer computeChatUnreadCount(GameSession session,
                                       List<SessionParticipant> participants,
                                       Optional<Long> currentUserIdOpt) {
    if (currentUserIdOpt.isEmpty()) return null;
    Long uid = currentUserIdOpt.get();

    boolean isCreator = session.getCreator().getId().equals(uid);
    Optional<SessionParticipant> myParticipant = participants.stream()
            .filter(p -> p.getUser().getId().equals(uid))
            .findFirst();
    if (!isCreator && myParticipant.isEmpty()) return null;

    if (session.getStatus() == SessionStatus.COMPLETED
            || session.getStatus() == SessionStatus.CANCELLED) {
        return 0;
    }

    // El creador no tiene fila en session_participants → su "última lectura" no
    // se persiste. Tratamos como "siempre al día" — 0. Pragmático para MVP.
    Instant since = myParticipant.map(SessionParticipant::getLastChatReadAt).orElse(null);
    if (since == null) {
        // Nunca lo abrió: usar epoch para contar TODOS los mensajes ajenos.
        since = Instant.EPOCH;
    }
    long count = messageRepository.countUnread(session.getId(), uid, since);
    return (int) count;
}
```

Añade `private final SessionMessageRepository messageRepository;` al campo del service (junto a los demás). El `@RequiredArgsConstructor` lo inyecta solo.

Añade el import: `import com.matchplay.session.repository.SessionMessageRepository;`

- [ ] **Step 5: Borrar mensajes en `changeStatus` y `close`**

En el mismo `GameSessionServiceImpl.java`, dentro de `changeStatus(...)`, justo después de `session.setStatus(target);` y antes de `sessionRepository.save(session);`, añade:

```java
if (target == SessionStatus.COMPLETED || target == SessionStatus.CANCELLED) {
    int removed = messageRepository.deleteBySessionId(sessionId);
    if (removed > 0) log.info("Deleted {} chat messages on status change to {}", removed, target);
}
```

Dentro del método `close(...)`, después de `session.setStatus(SessionStatus.FULL);` NO hace falta borrar (FULL no cierra el chat). Pero busca cualquier transición a COMPLETED/CANCELLED — en este service solo `changeStatus` puede hacerlo, así que el bloque de arriba cubre los dos casos.

- [ ] **Step 6: Tests de borrado en lifecycle**

En `GameSessionServiceImplTest.java`, añade:

```java
@Test
void changeStatus_toCompleted_deletesAllChatMessages() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    s.setStatus(SessionStatus.IN_PROGRESS);  // estado válido para transicionar a COMPLETED
    when(currentUserProvider.requireCurrentUserId()).thenReturn(s.getCreator().getId());
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    service.changeStatus(s.getId(), new ChangeStatusRequest(SessionStatus.COMPLETED));

    verify(messageRepository, times(1)).deleteBySessionId(s.getId());
}

@Test
void changeStatus_toCancelled_deletesAllChatMessages() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    when(currentUserProvider.requireCurrentUserId()).thenReturn(s.getCreator().getId());
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    service.changeStatus(s.getId(), new ChangeStatusRequest(SessionStatus.CANCELLED));

    verify(messageRepository, times(1)).deleteBySessionId(s.getId());
}

@Test
void changeStatus_toFull_doesNotDeleteMessages() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    when(currentUserProvider.requireCurrentUserId()).thenReturn(s.getCreator().getId());
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    service.changeStatus(s.getId(), new ChangeStatusRequest(SessionStatus.FULL));

    verify(messageRepository, never()).deleteBySessionId(any());
}
```

Si la clase de test no tiene `@Mock SessionMessageRepository messageRepository;`, añádelo arriba con los demás `@Mock`. Mockito lo inyectará en el `@InjectMocks`.

- [ ] **Step 7: Tests del chatUnreadCount en buildDetail**

En el mismo `GameSessionServiceImplTest.java`, añade:

```java
@Test
void getDetail_chatUnreadCount_isNullForAnonymous() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    when(currentUserProvider.getCurrentUserId()).thenReturn(Optional.empty());
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.chatUnreadCount()).isNull();
}

@Test
void getDetail_chatUnreadCount_isNullForOutsider() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    when(currentUserProvider.getCurrentUserId()).thenReturn(Optional.of(999L));
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.chatUnreadCount()).isNull();
}

@Test
void getDetail_chatUnreadCount_zeroWhenSessionCompleted() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    s.setStatus(SessionStatus.COMPLETED);
    when(currentUserProvider.getCurrentUserId())
            .thenReturn(Optional.of(s.getCreator().getId()));
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participantsOf(s));

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.chatUnreadCount()).isZero();
}

@Test
void getDetail_chatUnreadCount_countsMessagesAfterLastRead_excludingOwn() {
    GameSession s = givenOpenSessionWithCreatorAnd(1, 4, 0);
    // El otro player (no creador) consulta el detail
    List<SessionParticipant> participants = participantsOf(s);
    SessionParticipant me = participants.stream()
            .filter(p -> !p.getUser().getId().equals(s.getCreator().getId()))
            .findFirst().orElseThrow();
    me.setLastChatReadAt(Instant.parse("2026-01-01T10:00:00Z"));

    when(currentUserProvider.getCurrentUserId()).thenReturn(Optional.of(me.getUser().getId()));
    when(sessionRepository.findById(s.getId())).thenReturn(Optional.of(s));
    when(participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId()))
            .thenReturn(participants);
    when(messageRepository.countUnread(s.getId(), me.getUser().getId(),
            Instant.parse("2026-01-01T10:00:00Z"))).thenReturn(3L);

    SessionDetailResponse out = service.findById(s.getId());

    assertThat(out.chatUnreadCount()).isEqualTo(3);
}
```

- [ ] **Step 8: Ejecutar suite completa**

Run: `cd backend && ./mvnw test`
Expected: todos PASS. Si algún test rompe por fixture sin actualizar de `SessionDetailResponse`, arregla el constructor posicional.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java \
        backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java \
        backend/src/main/java/com/matchplay/session/service/GameSessionServiceImpl.java \
        backend/src/test/java/com/matchplay/session/
git commit -m "feat(chat): expone chatUnreadCount y borra mensajes al cerrar/cancelar"
```

---

## Task 5: FE — API, hooks y types

**Files:**
- Create: `frontend/src/features/sessions/api/messagesApi.ts`
- Create: `frontend/src/features/sessions/hooks/useChatMessages.ts`
- Modify: `frontend/src/features/sessions/types/session.types.ts`

- [ ] **Step 1: Añadir tipos**

En `frontend/src/features/sessions/types/session.types.ts`:

Después de los tipos existentes (al final del archivo o en la zona donde están `SessionPlayer` y similares), añade:

```ts
/** Mensaje del chat de coordinación de una partida. */
export interface SessionMessage {
  id: number
  userId: number
  username: string
  content: string
  createdAt: string // ISO Instant
}
```

Dentro de `SessionDetail`, añade el campo (cerca de `creatorUsername` para mantener coherencia con el backend):

```ts
/**
 * Mensajes no leídos en el chat de esta partida.
 * null si el caller es anónimo o no participa (chat invisible).
 * 0 si está al día o el chat está cerrado.
 */
chatUnreadCount: number | null
```

- [ ] **Step 2: Crear API client**

`frontend/src/features/sessions/api/messagesApi.ts`:

```ts
import { httpClient } from '@/shared/api/httpClient'

import type { SessionMessage } from '../types/session.types'

const BASE = '/sessions'

export const messagesApi = {
  list: (sessionId: number, since?: string): Promise<SessionMessage[]> => {
    const params = since ? { since } : undefined
    return httpClient
      .get<SessionMessage[]>(`${BASE}/${sessionId}/messages`, { params })
      .then((r) => r.data)
  },

  send: (sessionId: number, content: string): Promise<SessionMessage> =>
    httpClient
      .post<SessionMessage>(`${BASE}/${sessionId}/messages`, { content })
      .then((r) => r.data),

  markRead: (sessionId: number): Promise<void> =>
    httpClient.post<void>(`${BASE}/${sessionId}/messages/mark-read`).then(() => undefined),
}
```

- [ ] **Step 3: Crear hooks**

`frontend/src/features/sessions/hooks/useChatMessages.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { messagesApi } from '../api/messagesApi'
import { sessionKeys } from './useSessions'
import type { SessionDetail, SessionMessage } from '../types/session.types'

const POLL_INTERVAL_MS = 20_000

export const chatKeys = {
  all: ['chat'] as const,
  messages: (sessionId: number) => [...chatKeys.all, 'messages', sessionId] as const,
}

/**
 * Polling de mensajes mientras el drawer del chat está abierto.
 * `enabled=false` detiene el polling al cerrar el drawer.
 */
export function useChatMessagesQuery(sessionId: number, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.messages(sessionId),
    queryFn: () => messagesApi.list(sessionId),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
    staleTime: 0,
  })
}

/**
 * Envía un mensaje. Optimistic update: inserta una versión temporal con id
 * negativo y la reemplaza por la real al recibir respuesta. Rollback en error.
 */
export function useSendMessageMutation(sessionId: number, currentUser: { id: number; username: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => messagesApi.send(sessionId, content),
    onMutate: async (content: string) => {
      await qc.cancelQueries({ queryKey: chatKeys.messages(sessionId) })
      const previous = qc.getQueryData<SessionMessage[]>(chatKeys.messages(sessionId)) ?? []
      const optimistic: SessionMessage = {
        id: -Date.now(), // id temporal negativo (no choca con reales)
        userId: currentUser.id,
        username: currentUser.username,
        content,
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData<SessionMessage[]>(chatKeys.messages(sessionId), [...previous, optimistic])
      return { previous, optimisticId: optimistic.id }
    },
    onError: (_err, _content, ctx) => {
      if (ctx) qc.setQueryData(chatKeys.messages(sessionId), ctx.previous)
    },
    onSuccess: (real, _content, ctx) => {
      qc.setQueryData<SessionMessage[]>(chatKeys.messages(sessionId), (curr) => {
        const list = curr ?? []
        // reemplaza el optimista por el real
        return list.map((m) => (m.id === ctx?.optimisticId ? real : m))
      })
    },
  })
}

/**
 * Marca el chat como leído. Pone optimísticamente chatUnreadCount=0 en la
 * cache del detail para que el badge desaparezca instantáneo.
 */
export function useMarkChatReadMutation(sessionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => messagesApi.markRead(sessionId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: sessionKeys.detail(sessionId) })
      const previous = qc.getQueryData<SessionDetail>(sessionKeys.detail(sessionId))
      if (previous && previous.chatUnreadCount !== null) {
        qc.setQueryData<SessionDetail>(sessionKeys.detail(sessionId), {
          ...previous,
          chatUnreadCount: 0,
        })
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(sessionKeys.detail(sessionId), ctx.previous)
    },
  })
}
```

- [ ] **Step 4: Verificar TSC**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 5: Actualizar fixtures `SessionDetail` que rompan TSC**

Si TSC se queja, abre el(los) archivo(s) y añade `chatUnreadCount: null` al fixture. Más probable: `frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx` en su `detail(overrides)` helper.

```ts
// dentro de detail(...)
chatUnreadCount: null,
```

Run `cd frontend && npx tsc --noEmit` de nuevo. 0 errores.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/sessions/api/messagesApi.ts \
        frontend/src/features/sessions/hooks/useChatMessages.ts \
        frontend/src/features/sessions/types/session.types.ts \
        frontend/src/features/sessions/__tests__/SessionDetailPage.test.tsx
git commit -m "feat(chat): types, api y hooks del chat en frontend"
```

(No corremos `npm test` aquí porque solo es capa de datos sin UI nueva — los tests cambiarán en las siguientes tasks.)

---

## Task 7: FE — `SessionChatButton` (renombre del placeholder + badge) + wire en la page

**Files:**
- Create: `frontend/src/features/sessions/components/SessionChatButton.tsx`
- Create: `frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx`
- Delete: `frontend/src/features/sessions/components/SessionChatPlaceholder.tsx`
- Modify: `frontend/src/features/sessions/pages/SessionDetailPage.tsx`
- Modify: `frontend/src/shared/i18n/locales/es.json` y `en.json`

- [ ] **Step 1: Añadir claves i18n base del chat**

En `frontend/src/shared/i18n/locales/es.json`, bajo `sessions`, añade un bloque nuevo `chat`:

```json
"chat": {
  "title": "Chat",
  "headerTitle": "Chat — {{session}}",
  "inputPlaceholder": "Escribe un mensaje…",
  "waitlistNotice": "Entrarás al chat al apuntarte como jugador.",
  "send": "Enviar",
  "empty": "Sé el primero en escribir.",
  "loadError": "No se han podido cargar los mensajes.",
  "sendError": "No se ha podido enviar tu mensaje."
}
```

En `en.json`:

```json
"chat": {
  "title": "Chat",
  "headerTitle": "Chat — {{session}}",
  "inputPlaceholder": "Write a message…",
  "waitlistNotice": "You'll join the chat when you sign up as a player.",
  "send": "Send",
  "empty": "Be the first to write something.",
  "loadError": "Couldn't load the messages.",
  "sendError": "Your message couldn't be sent."
}
```

Quita las claves antiguas `sessions.detail.chatHeading` y `sessions.detail.chatComingSoon` en ambos archivos — el placeholder ya no existe.

- [ ] **Step 2: Crear `SessionChatButton`**

`frontend/src/features/sessions/components/SessionChatButton.tsx`:

```tsx
import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import type { SessionDetail } from '../types/session.types'

import { SessionChatDrawer } from './SessionChatDrawer'

interface SessionChatButtonProps {
  session: SessionDetail
}

/**
 * Punto de entrada al chat de coordinación de una partida. Solo visible para
 * participantes (PLAYER o WAITLIST) y para el creador — si {@code session.chatUnreadCount}
 * es null (anónimo / no participante), el componente devuelve null.
 *
 * Muestra un badge rojo con el número de mensajes no leídos. Click abre el drawer.
 */
export function SessionChatButton({ session }: SessionChatButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (session.chatUnreadCount === null) return null

  const unread = session.chatUnreadCount

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded border border-dashed border-border bg-muted/20 p-4',
          'text-left transition hover:bg-muted/40',
        )}
      >
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <MessageSquare size={14} aria-hidden="true" />
          {t('sessions.chat.title')}
        </span>
        {unread > 0 && (
          <span
            aria-label={`${unread} ${t('sessions.chat.title').toLowerCase()}`}
            className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red px-2 py-0.5 text-xs font-bold text-white"
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

(El `SessionChatDrawer` ya existe — se creó en la Task 6 anterior.)

- [ ] **Step 3: Borrar `SessionChatPlaceholder.tsx`**

Borra el archivo `frontend/src/features/sessions/components/SessionChatPlaceholder.tsx`.

- [ ] **Step 4: Wire en `SessionDetailPage`**

En `frontend/src/features/sessions/pages/SessionDetailPage.tsx`:

- Quita el import `import { SessionChatPlaceholder } from '../components/SessionChatPlaceholder'`.
- Añade `import { SessionChatButton } from '../components/SessionChatButton'`.
- En el render, sustituye `<SessionChatPlaceholder />` por `<SessionChatButton session={data} />`.

- [ ] **Step 5: Tests del botón**

Crea `frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { describe, expect, it, vi } from 'vitest'

import { SessionChatButton } from '../components/SessionChatButton'
import type { SessionDetail } from '../types/session.types'

// Stub del drawer — los tests del drawer viven en su propio fichero.
vi.mock('../components/SessionChatDrawer', () => ({
  SessionChatDrawer: () => null,
}))

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
    chatUnreadCount: 0,
    players: [],
    yourRole: 'PLAYER',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderButton(s: SessionDetail) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <SessionChatButton session={s} />
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('SessionChatButton', () => {
  it('no renderiza nada cuando chatUnreadCount es null (anónimo/no participante)', () => {
    const { container } = renderButton(baseSession({ chatUnreadCount: null }))
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza sin badge cuando chatUnreadCount es 0', () => {
    renderButton(baseSession({ chatUnreadCount: 0 }))
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renderiza badge con N cuando chatUnreadCount > 0', () => {
    renderButton(baseSession({ chatUnreadCount: 5 }))
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Ejecutar tests + TSC**

Run: `cd frontend && npm test -- SessionChatButton`
Expected: 3/3 PASS.

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors.

Si la suite global se queja del placeholder borrado (test antiguo), bórralo también:
`frontend/src/features/sessions/__tests__/SessionChatPlaceholder.test.tsx` (si existe).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/sessions/components/SessionChatButton.tsx \
        frontend/src/features/sessions/components/SessionChatPlaceholder.tsx \
        frontend/src/features/sessions/__tests__/SessionChatButton.test.tsx \
        frontend/src/features/sessions/pages/SessionDetailPage.tsx \
        frontend/src/shared/i18n/locales/es.json \
        frontend/src/shared/i18n/locales/en.json
git commit -m "feat(chat): reemplaza placeholder por SessionChatButton con badge"
```

(El `git add` del placeholder borrado lo registra como deletion.)

---

## Task 6: FE — `SessionChatDrawer` (mensajes, send, polling, mark-read)

**Files:**
- Create: `frontend/src/features/sessions/components/ChatMessageRow.tsx`
- Create: `frontend/src/features/sessions/components/SessionChatDrawer.tsx`
- Create: `frontend/src/features/sessions/__tests__/SessionChatDrawer.test.tsx`

- [ ] **Step 1: Crear `ChatMessageRow`**

`frontend/src/features/sessions/components/ChatMessageRow.tsx`:

```tsx
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import type { SessionMessage } from '../types/session.types'

interface ChatMessageRowProps {
  message: SessionMessage
  mine: boolean
}

export function ChatMessageRow({ message, mine }: ChatMessageRowProps) {
  const { i18n } = useTranslation()
  const time = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(message.createdAt))
  const isPending = message.id < 0

  return (
    <li
      className={cn(
        'flex flex-col gap-1 rounded-md px-3 py-2 max-w-[85%]',
        mine ? 'self-end bg-red text-white' : 'self-start bg-muted text-foreground',
        isPending && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className={cn(mine ? 'text-white/80' : 'text-muted-foreground')}>
          @{message.username}
        </span>
        <span className={cn(mine ? 'text-white/60' : 'text-muted-foreground')}>{time}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-snug">{message.content}</p>
    </li>
  )
}
```

- [ ] **Step 2: Crear `SessionChatDrawer`**

`frontend/src/features/sessions/components/SessionChatDrawer.tsx`:

```tsx
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/cn'

import {
  useChatMessagesQuery,
  useMarkChatReadMutation,
  useSendMessageMutation,
} from '../hooks/useChatMessages'
import type { SessionDetail } from '../types/session.types'

import { ChatMessageRow } from './ChatMessageRow'

interface SessionChatDrawerProps {
  session: SessionDetail
  open: boolean
  onClose: () => void
}

/**
 * Drawer/modal del chat de una partida. Polling 20s mientras está abierto.
 * Al abrir: marca como leído (optimistic). WAITLIST ve mensajes pero no puede
 * escribir (input oculto, solo aviso).
 */
export function SessionChatDrawer({ session, open, onClose }: SessionChatDrawerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [draft, setDraft] = useState('')

  const isWaitlist = session.yourRole === 'WAITLIST'

  const { data: messages, isLoading, isError } = useChatMessagesQuery(session.id, open)
  const markRead = useMarkChatReadMutation(session.id)
  const sendMessage = useSendMessageMutation(
    session.id,
    user ? { id: user.userId, username: user.username } : { id: 0, username: '' },
  )

  // Mark read al abrir
  useEffect(() => {
    if (open) markRead.mutate()
    // intencionalmente sin markRead en deps — solo al cambiar open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close con Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-scroll al fondo al cambiar mensajes
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

  if (!open) return null

  function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed.length > 500) return
    sendMessage.mutate(trimmed, {
      onSuccess: () => setDraft(''),
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const counter = `${draft.length}/500`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />
      <div
        className={cn(
          'relative flex h-full w-full flex-col bg-card shadow-xl',
          'sm:max-w-[420px] sm:border-l-2 sm:border-border',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="chat-drawer-title" className="font-display text-lg font-bold text-foreground">
            {t('sessions.chat.headerTitle', { session: session.title })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Lista de mensajes */}
        <ul
          ref={listRef}
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
          aria-live="polite"
        >
          {isLoading && (
            <li className="text-center text-sm text-muted-foreground">…</li>
          )}
          {isError && (
            <li className="text-center text-sm text-red">{t('sessions.chat.loadError')}</li>
          )}
          {!isLoading && !isError && (messages?.length ?? 0) === 0 && (
            <li className="text-center text-sm italic text-muted-foreground">
              {t('sessions.chat.empty')}
            </li>
          )}
          {messages?.map((m) => (
            <ChatMessageRow
              key={m.id}
              message={m}
              mine={user != null && m.userId === user.userId}
            />
          ))}
        </ul>

        {/* Footer */}
        <div className="border-t border-border p-3">
          {isWaitlist ? (
            <p className="text-center text-sm italic text-muted-foreground">
              {t('sessions.chat.waitlistNotice')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('sessions.chat.inputPlaceholder')}
                maxLength={500}
                rows={2}
                className="w-full resize-none rounded border-2 border-border bg-card px-3 py-2 text-sm outline-none focus:border-red focus:ring-2 focus:ring-yellow/30"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{counter}</span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={draft.trim().length === 0 || sendMessage.isPending}
                  className="rounded-md bg-red px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {t('sessions.chat.send')}
                </button>
              </div>
              {sendMessage.isError && (
                <p className="text-xs text-red">{t('sessions.chat.sendError')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Tests del drawer**

Crea `frontend/src/features/sessions/__tests__/SessionChatDrawer.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import { SessionChatDrawer } from '../components/SessionChatDrawer'
import type { SessionDetail } from '../types/session.types'

const API = '/api/v1'

const mockUseAuth = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

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
    chatUnreadCount: 0,
    players: [],
    yourRole: 'PLAYER',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderDrawer(s: SessionDetail, open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <SessionChatDrawer session={s} open={open} onClose={() => {}} />
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('SessionChatDrawer', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { userId: 1, username: 'alice', email: 'a@a.es', role: 'USER' },
      status: 'authenticated',
      isAuthenticated: true,
    })
  })

  it('no renderiza nada cuando open=false', () => {
    const { container } = renderDrawer(baseSession(), false)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza mensajes recibidos del endpoint', async () => {
    server.use(
      http.get(`${API}/sessions/7/messages`, () =>
        HttpResponse.json([
          {
            id: 1,
            userId: 2,
            username: 'bob',
            content: '¡A las 20h en mi casa!',
            createdAt: '2026-01-01T10:00:00Z',
          },
        ]),
      ),
    )
    renderDrawer(baseSession())
    expect(await screen.findByText(/a las 20h/i)).toBeInTheDocument()
  })

  it('muestra el aviso de waitlist y oculta el input', async () => {
    renderDrawer(baseSession({ yourRole: 'WAITLIST' }))
    expect(
      await screen.findByText(/entrarás al chat al apuntarte/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument()
  })

  it('envía un mensaje al pulsar Enviar', async () => {
    let posted: { content?: string } = {}
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(`${API}/sessions/7/messages`, async ({ request }) => {
        posted = (await request.json()) as { content?: string }
        return HttpResponse.json({
          id: 42,
          userId: 1,
          username: 'alice',
          content: posted.content,
          createdAt: new Date().toISOString(),
        })
      }),
    )
    renderDrawer(baseSession())
    const textarea = await screen.findByRole('textbox')
    await userEvent.type(textarea, 'hola a todos')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))
    await waitFor(() => expect(posted.content).toBe('hola a todos'))
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''))
  })

  it('Enter envía y Shift+Enter no envía', async () => {
    let postCount = 0
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(`${API}/sessions/7/messages`, async () => {
        postCount++
        return HttpResponse.json({
          id: 1,
          userId: 1,
          username: 'alice',
          content: 'x',
          createdAt: new Date().toISOString(),
        })
      }),
    )
    renderDrawer(baseSession())
    const textarea = await screen.findByRole('textbox')
    await userEvent.type(textarea, 'linea1{Shift>}{Enter}{/Shift}linea2')
    expect(postCount).toBe(0)
    await userEvent.type(textarea, '{Enter}')
    await waitFor(() => expect(postCount).toBe(1))
  })

  it('dispara mark-read al abrir', async () => {
    let markReadCalled = false
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
      http.post(`${API}/sessions/7/messages/mark-read`, () => {
        markReadCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderDrawer(baseSession({ chatUnreadCount: 3 }))
    await waitFor(() => expect(markReadCalled).toBe(true))
  })

  it('muestra el contador X/500', async () => {
    server.use(
      http.get(`${API}/sessions/7/messages`, () => HttpResponse.json([])),
    )
    renderDrawer(baseSession())
    const textarea = await screen.findByRole('textbox')
    await userEvent.type(textarea, 'hola')
    expect(screen.getByText('4/500')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Ejecutar tests + TSC**

Run: `cd frontend && npm test`
Expected: todos PASS. Cuenta sube de ~108 a ~118 (≈3 button + 7 drawer).

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/sessions/components/ChatMessageRow.tsx \
        frontend/src/features/sessions/components/SessionChatDrawer.tsx \
        frontend/src/features/sessions/__tests__/SessionChatDrawer.test.tsx
git commit -m "feat(chat): drawer con polling, send optimista y autoscroll"
```

---

## Cierre del sprint

Al terminar las 7 tasks, NO pushear. Cuando el usuario indique cierre:

1. Actualizar specs:
   - `docs/backend/modules/sessions-spec.md` — añadir el módulo chat (endpoints, lifecycle, DTOs).
   - `docs/frontend/modules/sessions-spec.md` — añadir `SessionChatButton`, `SessionChatDrawer`, nuevos hooks.
2. Si hay alguna regla nueva del proyecto que merezca, actualizar `CLAUDE.md` (improbable en este sprint, las convenciones están estables).
3. Último commit con los docs.
4. `git push origin master` cuando el usuario confirme.
