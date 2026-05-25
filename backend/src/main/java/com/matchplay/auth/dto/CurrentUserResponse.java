package com.matchplay.auth.dto;

import com.matchplay.user.entity.Role;

import java.math.BigDecimal;

public record CurrentUserResponse(
        Long userId,
        String email,
        String username,
        String name,
        Role role,
        BigDecimal ratingAvg,
        int rewardPoints,
        String selectedAvatarCode
) {}
