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
