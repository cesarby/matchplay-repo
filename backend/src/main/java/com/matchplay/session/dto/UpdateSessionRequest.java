package com.matchplay.session.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Update parcial. Todos los campos opcionales (null = no se toca).
 *
 * <p>El creador no puede cambiarse, ni el juego base, ni la ciudad. Si el
 * usuario quiere cambiar esos campos, debe cancelar y crear una partida
 * nueva (regla de producto, evita confusión a los apuntados).</p>
 */
public record UpdateSessionRequest(
        @Size(max = 150)
        String title,

        @Size(max = 5000)
        String description,

        @Size(max = 16)
        String areaCode,

        Instant scheduledAt,

        @Min(2)
        @Max(20)
        Integer maxPlayers
) {}
