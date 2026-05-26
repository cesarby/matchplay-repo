package com.matchplay.session.mapper;

import com.matchplay.game.entity.Game;
import com.matchplay.session.dto.ExpansionSummary;
import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.SessionPlayerResponse;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.entity.GameSession;
import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.entity.SessionParticipant;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mapea entidades a DTOs de respuesta.
 *
 * <p>El mapper es puro: no inyecta repositorios ni el current user.
 * Los datos calculados ({@code waitlistCount}, {@code yourRole}) se pasan
 * como argumentos desde el service, que es quien tiene contexto.</p>
 */
@Component
public class SessionMapper {

    public SessionSummaryResponse toSummary(GameSession session) {
        return toSummary(session, 0);
    }

    public SessionSummaryResponse toSummary(GameSession session, int waitlistCount) {
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
                session.getCreator() != null ? session.getCreator().getUsernameValue() : null
        );
    }

    public SessionDetailResponse toDetail(GameSession session,
                                          List<SessionParticipant> participants,
                                          ParticipantRole yourRole) {
        List<SessionPlayerResponse> players = participants.stream()
                .map(this::toPlayer)
                .toList();

        int waitlistCount = (int) participants.stream()
                .filter(p -> p.getRole() == ParticipantRole.WAITLIST)
                .count();

        List<ExpansionSummary> expansions = session.getExpansions() == null
                ? List.of()
                : session.getExpansions().stream()
                        .map(this::toExpansionSummary)
                        .toList();

        return new SessionDetailResponse(
                session.getId(),
                session.getTitle(),
                session.getDescription(),
                session.getBaseGame() != null ? session.getBaseGame().getBggId() : null,
                session.getBaseGame() != null ? session.getBaseGame().getName() : null,
                session.getBaseGame() != null ? session.getBaseGame().getThumbnailUrl() : null,
                expansions,
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
                players,
                yourRole,
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }

    public SessionPlayerResponse toPlayer(SessionParticipant participant) {
        return new SessionPlayerResponse(
                participant.getUser().getId(),
                participant.getUser().getUsernameValue(),
                participant.getRole(),
                participant.getPosition(),
                participant.getJoinedAt()
        );
    }

    public ExpansionSummary toExpansionSummary(Game expansion) {
        return new ExpansionSummary(
                expansion.getBggId(),
                expansion.getName(),
                expansion.getThumbnailUrl()
        );
    }
}
