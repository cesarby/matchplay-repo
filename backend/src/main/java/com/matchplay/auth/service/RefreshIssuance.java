package com.matchplay.auth.service;

import java.time.Instant;

/**
 * Resultado interno de refresh. El controller convierte esto en
 * RefreshResponse (recortado) + Set-Cookie (refresh rotado).
 */
public record RefreshIssuance(
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        Instant refreshTokenExpiresAt
) {}
