package com.matchplay.session.dto;

import com.matchplay.session.entity.SessionStatus;

import java.time.Instant;
import java.util.List;

/**
 * Detalle completo de una partida: incluye descripción y participantes.
 */
public record SessionDetailResponse(
        Long id,
        String title,
        String description,
        Long baseGameId,
        String baseGameName,
        String cityCode,
        String cityName,
        String areaCode,
        String areaName,
        Instant scheduledAt,
        int maxPlayers,
        int registeredPlayers,
        SessionStatus status,
        Long creatorId,
        String creatorUsername,
        List<SessionPlayerResponse> players,
        Instant createdAt,
        Instant updatedAt
) {}
