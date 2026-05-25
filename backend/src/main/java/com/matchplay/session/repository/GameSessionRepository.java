package com.matchplay.session.repository;

import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface GameSessionRepository
        extends JpaRepository<GameSession, Long>, JpaSpecificationExecutor<GameSession> {

    /**
     * Cuenta partidas con un estado concreto y fecha futura.
     * Usado por el endpoint público de estadísticas (trust strip de la landing).
     */
    long countByStatusAndScheduledAtAfter(SessionStatus status, Instant after);

    /**
     * Cuenta el número de ciudades distintas con al menos una partida en el estado dado.
     * Usado para el contador de "ciudades activas" del trust strip.
     */
    @Query("SELECT COUNT(DISTINCT s.city.code) FROM GameSession s " +
           "WHERE s.status = :status AND s.scheduledAt > :after")
    long countDistinctCitiesByStatusAndScheduledAtAfter(
            @Param("status") SessionStatus status,
            @Param("after") Instant after);
}
