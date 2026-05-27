package com.matchplay.game.dto;

public record GameDetailResponse(
        Long bggId,
        String name,
        Integer yearPublished,
        Integer minPlayers,
        Integer maxPlayers,
        Integer playingTime,
        String thumbnailUrl,
        String imageUrl,
        boolean isExpansion,
        Long baseGameBggId,
        String summary
) {}
