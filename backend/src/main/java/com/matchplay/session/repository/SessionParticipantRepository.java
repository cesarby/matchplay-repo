package com.matchplay.session.repository;

import com.matchplay.session.entity.SessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {

    /**
     * Devuelve los apuntados de una partida ordenados por fecha de join asc
     * (los primeros que llegaron arriba).
     */
    List<SessionParticipant> findBySessionIdOrderByJoinedAtAsc(Long sessionId);

    /**
     * Busca un participante concreto por (session, user). Útil para el join/leave
     * — si está presente, el usuario ya está apuntado.
     */
    Optional<SessionParticipant> findBySessionIdAndUserId(Long sessionId, Long userId);

    /**
     * Borra el apunte de un usuario en una partida. Devuelve el número de
     * filas afectadas para detectar leave de no-participantes.
     */
    long deleteBySessionIdAndUserId(Long sessionId, Long userId);

    /**
     * Conveniencia para validaciones rápidas sin cargar la entidad completa.
     */
    boolean existsBySessionIdAndUserId(Long sessionId, Long userId);

    long countBySessionId(Long sessionId);
}
