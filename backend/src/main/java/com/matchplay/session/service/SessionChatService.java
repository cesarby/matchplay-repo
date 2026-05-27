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
