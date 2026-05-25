package com.matchplay.stats.dto;

/**
 * Respuesta del endpoint público {@code GET /api/v1/stats/public}.
 * Agregados de la comunidad mostrados en el trust strip de la landing.
 *
 * @param activeSessions partidas con estado {@code OPEN} y fecha futura
 * @param activePlayers  cuentas activas (no eliminadas, no desactivadas)
 * @param cities         ciudades distintas con al menos un usuario activo
 */
public record PublicStatsResponse(
        long activeSessions,
        long activePlayers,
        long cities
) {}
