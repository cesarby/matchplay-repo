package com.matchplay.session.dto;

/**
 * Vista compacta de una expansión asociada a una partida.
 *
 * <p>Se usa dentro de {@link SessionDetailResponse#expansions()}. Los
 * listados ({@link SessionSummaryResponse}) llevan solo el conteo, no la
 * lista, para mantener el payload ligero.</p>
 */
public record ExpansionSummary(
        Long bggId,
        String name,
        String thumbnailUrl
) {}
