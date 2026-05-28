package com.matchplay.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Response del endpoint GET /api/v1/me con info completa de perfil (avatar,
 * bio, juegos favoritos). favoriteGames siempre presente (lista vacía si no
 * hay) — el frontend renderiza el grid de slots vacíos.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record UserProfileResponse(
        String username,
        String email,
        String avatarCode,
        String bio,
        List<FavoriteGameSummary> favoriteGames
) {}
