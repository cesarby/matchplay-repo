package com.matchplay.user.dto;

public record FavoriteGameSummary(
        Long bggId,
        String name,
        String thumbnailUrl
) {}
