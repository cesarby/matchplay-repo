package com.matchplay.stats.service;

import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.repository.GameSessionRepository;
import com.matchplay.stats.dto.PublicStatsResponse;
import com.matchplay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Calcula agregados públicos para el trust strip de la landing.
 *
 * <p>El cliente lo cachea 5 minutos vía {@code Cache-Control} (gestionado en el
 * controller). Si la consulta se vuelve cara con escala, se valora cache en
 * memoria o materialización en tabla.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicStatsService {

    private final GameSessionRepository sessionRepository;
    private final UserRepository userRepository;

    public PublicStatsResponse getPublicStats() {
        Instant now = Instant.now();
        long activeSessions = sessionRepository.countByStatusAndScheduledAtAfter(
                SessionStatus.OPEN, now);
        long activePlayers = userRepository.countByActiveTrueAndDeletedFalse();
        long cities = userRepository.countDistinctCitiesByActiveTrueAndDeletedFalse();
        return new PublicStatsResponse(activeSessions, activePlayers, cities);
    }
}
