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

        // Auth FIRST — outsiders no deben saber siquiera si la sesión está cerrada
        boolean isCreator = session.getCreator().getId().equals(user.getId());
        SessionParticipant participant = null;
        if (!isCreator) {
            participant = participantRepository
                    .findBySessionIdAndUserId(sessionId, user.getId())
                    .orElseThrow(SessionChatForbiddenException::new);
        }

        // Status check AFTER — solo participantes/creator descubren que está cerrada
        if (session.getStatus() == SessionStatus.COMPLETED
                || session.getStatus() == SessionStatus.CANCELLED) {
            throw new SessionChatClosedException();
        }

        // Role check al final — WAITLIST que ha pasado auth pero no puede escribir
        if (!isCreator && participant.getRole() != ParticipantRole.PLAYER) {
            throw new SessionChatWriteForbiddenException();
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
                m.getUser().getUsernameValue(),
                m.getUser().getSelectedAvatar() != null
                        ? m.getUser().getSelectedAvatar().getCode()
                        : null,
                m.getContent(),
                m.getCreatedAt()
        );
    }
}
