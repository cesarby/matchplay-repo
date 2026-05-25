package com.matchplay.auth.service;

import com.matchplay.user.entity.Role;

import java.time.Instant;

/**
 * Resultado interno de register/login. El controller convierte esto en
 * AuthResponse (recortado) + Set-Cookie (refresh).
 */
public record AuthIssuance(
        Long userId,
        String email,
        String username,
        Role role,
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        Instant refreshTokenExpiresAt
) {}
