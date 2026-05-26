package com.matchplay.session.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * Update parcial. Todos los campos opcionales (null = no se toca).
 *
 * <p>El creador no puede cambiarse, ni el juego base, ni la ciudad. Si el
 * usuario quiere cambiar esos campos, debe cancelar y crear una partida
 * nueva (regla de producto, evita confusión a los apuntados).</p>
 *
 * <p>Para {@code expansionBggIds}:
 * <ul>
 *   <li>{@code null} → no se toca la lista actual.</li>
 *   <li>{@code []} → vacía la lista de expansiones.</li>
 *   <li>{@code [a, b]} → reemplaza completamente la lista (PUT semantics
 *       sobre el sub-recurso).</li>
 * </ul></p>
 */
public record UpdateSessionRequest(
        @Size(max = 150)
        String title,

        @Size(max = 500)
        String description,

        @Size(max = 16)
        String areaCode,

        Instant scheduledAt,

        @Min(2)
        @Max(20)
        Integer maxPlayers,

        @Size(max = 20)
        List<@NotNull Long> expansionBggIds
) {}
