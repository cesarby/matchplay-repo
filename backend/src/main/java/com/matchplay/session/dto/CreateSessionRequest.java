package com.matchplay.session.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * Datos para crear una partida nueva.
 *
 * <p>El creador es el usuario autenticado; no entra en el body.
 * {@code areaCode} es opcional. {@code scheduledAt} debe ser futuro
 * (validación en service).</p>
 *
 * <p>{@code expansionBggIds} es opcional. Si viene, cada id se resuelve
 * (cache local o BGG-fetch), se valida que sea expansión y pertenezca al
 * mismo {@code baseGameId}, y se persiste la asociación.</p>
 */
public record CreateSessionRequest(
        @NotBlank
        @Size(max = 150)
        String title,

        @Size(max = 500)
        String description,

        @NotNull
        Long baseGameId,

        @Size(max = 20)
        List<@NotNull Long> expansionBggIds,

        @NotBlank
        @Size(max = 8)
        String cityCode,

        @Size(max = 16)
        String areaCode,

        @NotNull
        Instant scheduledAt,

        @NotNull
        @Min(2)
        @Max(20)
        Integer maxPlayers
) {}
