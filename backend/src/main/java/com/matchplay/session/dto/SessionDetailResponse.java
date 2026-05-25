package com.matchplay.session.dto;

import com.matchplay.session.entity.ParticipantRole;
import com.matchplay.session.entity.SessionStatus;

import java.time.Instant;
import java.util.List;

/**
 * Detalle completo de una partida.
 *
 * <p>Incluye la lista de participantes (tanto PLAYER como WAITLIST, ordenados
 * por joinedAt asc), el {@code waitlistCount} y {@code yourRole} si la
 * petición la hace un usuario autenticado que está apuntado.</p>
 *
 * @param yourRole rol del usuario actual en esta partida; null si anónimo o no apuntado
 */
public record SessionDetailResponse(
        Long id,
        String title,
        String description,
        Long baseGameId,
        String baseGameName,
        String baseGameThumbnailUrl,
        String cityCode,
        String cityName,
        String areaCode,
        String areaName,
        Instant scheduledAt,
        int maxPlayers,
        int registeredPlayers,
        int waitlistCount,
        SessionStatus status,
        Long creatorId,
        String creatorUsername,
        List<SessionPlayerResponse> players,
        ParticipantRole yourRole,
        Instant createdAt,
        Instant updatedAt
) {}
