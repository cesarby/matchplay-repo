package com.matchplay.auth.dto;

import java.time.Instant;

public record RefreshResponse(
        String accessToken,
        Instant accessTokenExpiresAt
) {}
