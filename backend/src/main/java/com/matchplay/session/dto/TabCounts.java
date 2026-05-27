package com.matchplay.session.dto;

/**
 * Conteo de partidas del usuario en cada tab de "Mis partidas".
 * Siempre populados en cada respuesta para que el frontend pinte los badges
 * sin necesidad de roundtrips adicionales.
 */
public record TabCounts(
        long created,
        long player,
        long waitlist,
        long history
) {}
