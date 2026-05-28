package com.matchplay.session.dto;

import java.time.Instant;

public record SessionMessageResponse(
        Long id,
        Long userId,
        String username,
        String authorAvatarCode,
        String content,
        Instant createdAt
) {}
