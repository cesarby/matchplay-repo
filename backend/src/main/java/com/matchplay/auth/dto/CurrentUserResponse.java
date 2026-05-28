package com.matchplay.auth.dto;

import com.matchplay.user.entity.Role;

import java.math.BigDecimal;

public record CurrentUserResponse(
        Long userId,
        String email,
        String username,
        Role role,
        String provinceCode,
        String cityCode,
        String areaCode,
        BigDecimal ratingAvg,
        int rewardPoints,
        String selectedAvatarCode,
        String bio
) {}
