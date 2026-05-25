package com.matchplay.session.mapper;

import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.SessionPlayerResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.SessionParticipant;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mapea entidades a DTOs de respuesta.
 *
 * <p>Mantiene las clases entity libres de dependencias de presentación.
 * Toda la traducción entidad→DTO vive aquí para facilitar el cambio futuro
 * (paginación, MapStruct si crece, etc.).</p>
 */
@Component
public class SessionMapper {

    public SessionSummaryResponse toSummary(GameSession session) {
        return new SessionSummaryResponse(
                session.getId(),
                session.getTitle(),
                session.getBaseGame() != null ? session.getBaseGame().getBggId() : null,
                session.getBaseGame() != null ? session.getBaseGame().getName() : null,
                session.getCity() != null ? session.getCity().getCode() : null,
                session.getCity() != null ? session.getCity().getName() : null,
                session.getArea() != null ? session.getArea().getCode() : null,
                session.getArea() != null ? session.getArea().getName() : null,
                session.getScheduledAt(),
                session.getMaxPlayers(),
                session.getRegisteredPlayers(),
                session.getStatus(),
                session.getCreator() != null ? session.getCreator().getId() : null,
                session.getCreator() != null ? session.getCreator().getUsername() : null
        );
    }

    public SessionDetailResponse toDetail(GameSession session, List<SessionParticipant> participants) {
        List<SessionPlayerResponse> players = participants.stream()
                .map(this::toPlayer)
                .toList();

        return new SessionDetailResponse(
                session.getId(),
                session.getTitle(),
                session.getDescription(),
                session.getBaseGame() != null ? session.getBaseGame().getBggId() : null,
                session.getBaseGame() != null ? session.getBaseGame().getName() : null,
                session.getCity() != null ? session.getCity().getCode() : null,
                session.getCity() != null ? session.getCity().getName() : null,
                session.getArea() != null ? session.getArea().getCode() : null,
                session.getArea() != null ? session.getArea().getName() : null,
                session.getScheduledAt(),
                session.getMaxPlayers(),
                session.getRegisteredPlayers(),
                session.getStatus(),
                session.getCreator() != null ? session.getCreator().getId() : null,
                session.getCreator() != null ? session.getCreator().getUsername() : null,
                players,
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }

    public SessionPlayerResponse toPlayer(SessionParticipant participant) {
        return new SessionPlayerResponse(
                participant.getUser().getId(),
                participant.getUser().getUsername(),
                participant.getUser().getName(),
                participant.getRole(),
                participant.getJoinedAt()
        );
    }
}
