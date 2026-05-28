package com.matchplay.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Response del endpoint GET /api/v1/me con info completa de perfil (avatar,
 * bio, juegos favoritos, ubicación). favoriteGames siempre presente (lista
 * vacía si no hay) — el frontend renderiza el grid de slots vacíos.
 *
 * <p>provinceCode/cityCode/areaCode son los códigos de la ubicación actual del
 * usuario. Se serializan siempre (incluso null) para que el FE distinga
 * "sin ubicación" de "campo ausente". Hoy los 3 son nullable=false a nivel
 * de entity, pero exponemos como Strings opcionales para no acoplar el FE a
 * esa restricción.</p>
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record UserProfileResponse(
        String username,
        String email,
        String avatarCode,
        String bio,
        List<FavoriteGameSummary> favoriteGames,
        String provinceCode,
        String cityCode,
        String areaCode
) {}
