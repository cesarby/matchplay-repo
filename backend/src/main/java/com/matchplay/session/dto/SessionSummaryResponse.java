package com.matchplay.session.dto;

import com.matchplay.session.entity.SessionStatus;

import java.time.Instant;

/**
 * Representación compacta para listados (cards en frontend).
 * Evita cargar info pesada (descripción, lista de jugadores, expansiones detalladas)
 * cuando no hace falta. {@code expansionCount} permite mostrar un badge "+N exp."
 * en la card sin tener que cargar la lista entera.
 */
public record SessionSummaryResponse(
        Long id,
        String title,
        Long baseGameId,
        String baseGameName,
        /** Thumbnail del juego cacheado desde BGG. Nullable si BGG no lo aportó. */
        String baseGameThumbnailUrl,
        int expansionCount,
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
        String creatorUsername
) {}
