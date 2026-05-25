package com.matchplay.auth.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.auth.refresh-cookie")
public record RefreshCookieProperties(
        @NotBlank String name,
        @NotBlank String path,
        @NotBlank String sameSite,
        boolean secure,
        @Positive long maxAgeSeconds
) {}
