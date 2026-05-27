package com.matchplay.session.repository;

import com.matchplay.session.entity.SessionMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Repository
public interface SessionMessageRepository extends JpaRepository<SessionMessage, Long> {

    /** Todos los mensajes de una partida, ASC por created_at. JOIN FETCH evita N+1 en user. */
    @Query("SELECT m FROM SessionMessage m JOIN FETCH m.user WHERE m.session.id = :sessionId ORDER BY m.createdAt ASC")
    List<SessionMessage> findBySessionIdOrderByCreatedAtAsc(@Param("sessionId") Long sessionId);

    /** Mensajes con created_at > since, ASC. Para polling delta. JOIN FETCH evita N+1 en user. */
    @Query("SELECT m FROM SessionMessage m JOIN FETCH m.user WHERE m.session.id = :sessionId AND m.createdAt > :since ORDER BY m.createdAt ASC")
    List<SessionMessage> findBySessionIdAndCreatedAtAfterOrderByCreatedAtAsc(
            @Param("sessionId") Long sessionId, @Param("since") Instant since);

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

    /** Total de mensajes en una sesión. Usado para chatMessageCount público. */
    long countBySessionId(Long sessionId);

    /** Borrado masivo usado al cerrar/cancelar la partida. */
    @Modifying
    @Transactional
    @Query("DELETE FROM SessionMessage m WHERE m.session.id = :sessionId")
    int deleteBySessionId(@Param("sessionId") Long sessionId);
}
