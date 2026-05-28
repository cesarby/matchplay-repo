package com.matchplay.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body de POST /api/v1/me/profile/password. Verifica que la contraseña actual
 * sea correcta antes de aplicar la nueva.
 */
public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, message = "error.profile.password.too.short")
        String newPassword
) {}
