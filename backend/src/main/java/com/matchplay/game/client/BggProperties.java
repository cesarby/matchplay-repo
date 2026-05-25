package com.matchplay.game.client;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.bgg")
public record BggProperties(
        @NotBlank String baseUrl,
        @NotBlank String userAgent,
        @NotBlank String token,
        @Positive int connectTimeoutMs,
        @Positive int readTimeoutMs
) {}
