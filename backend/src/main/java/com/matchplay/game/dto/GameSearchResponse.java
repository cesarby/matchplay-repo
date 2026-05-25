package com.matchplay.game.dto;

public record GameSearchResponse(
        Long bggId,
        String name,
        Integer year,
        Integer minPlayers,
        Integer maxPlayers,
        Integer minPlayTimeMinutes,
        Integer maxPlayTimeMinutes,
        String thumbnailUrl,
        String imageUrl,
        boolean isExpansion,
        boolean hasExpansions,
        Long baseGameBggId
) {}
