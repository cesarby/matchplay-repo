package com.matchplay.auth.dto;

import com.matchplay.user.entity.Role;

import java.time.Instant;

public record AuthResponse(
        Long userId,
        String email,
        String username,
        Role role,
        String accessToken,
        Instant accessTokenExpiresAt
) {}
