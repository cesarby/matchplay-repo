package com.matchplay.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body de PATCH /api/v1/me/profile. Todos los campos opcionales; sólo se
 * aplican los enviados (null = no tocar). Las validaciones de longitud y
 * formato se hacen aquí; las reglas de negocio (max 5 favoritos, bggId
 * existe, code geo existe) van en el service.
 */
public record UpdateProfileRequest(
        @Pattern(regexp = "^avatar_(0[1-9]|[12][0-9]|3[01])$",
                 message = "error.profile.invalid.avatar.code")
        String avatarCode,

        @Size(max = 280, message = "error.profile.bio.too.long")
        String bio,

        List<Long> favoriteGameBggIds,

        String provinceCode,
        String cityCode,
        String areaCode
) {}
