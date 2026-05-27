package com.matchplay.session.dto;

import com.matchplay.common.dto.PageResponse;

/**
 * Respuesta del endpoint {@code GET /api/v1/me/sessions}.
 *
 * <p>Combina la página de sesiones del tab solicitado con los 4 contadores
 * (uno por tab) para que el frontend pueda pintar los badges de cada
 * pestaña sin roundtrips adicionales.</p>
 */
public record MySessionsResponse(
        PageResponse<SessionSummaryResponse> items,
        TabCounts counts
) {}
