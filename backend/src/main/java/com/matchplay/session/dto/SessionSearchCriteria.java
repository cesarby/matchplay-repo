package com.matchplay.session.dto;

import com.matchplay.session.entity.SessionStatus;

import java.time.Instant;

/**
 * Criterios de búsqueda para el listado público de partidas.
 *
 * <p>Todos los campos son opcionales — null = sin filtro. Se construye desde
 * los query params del controller mediante {@link #of}.</p>
 */
public record SessionSearchCriteria(
        String provinceCode,
        String cityCode,
        String areaCode,
        Long gameId,
        Instant scheduledFrom,
        Instant scheduledTo,
        SessionStatus status
) {
    public static SessionSearchCriteria empty() {
        return new SessionSearchCriteria(null, null, null, null, null, null, null);
    }
}
