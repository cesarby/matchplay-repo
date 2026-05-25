package com.matchplay.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 3, max = 50) String username,
        @NotBlank @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$",
                message = "{error.auth.password.weak}"
        ) String password,
        @NotBlank @Size(max = 2) String provinceCode,
        @NotBlank @Size(max = 8) String cityCode,
        @NotBlank @Size(max = 16) String areaCode
) {}
