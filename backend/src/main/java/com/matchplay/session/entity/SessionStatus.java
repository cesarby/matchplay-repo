package com.matchplay.session.entity;

/**
 * Estado del ciclo de vida de una partida.
 *
 * <ul>
 *   <li>{@code OPEN} — abierta, admite nuevos jugadores hasta llenar las plazas.</li>
 *   <li>{@code FULL} — todas las plazas confirmadas, no admite nuevos jugadores.</li>
 *   <li>{@code IN_PROGRESS} — la partida está jugándose (entre scheduledAt y fin estimado).</li>
 *   <li>{@code COMPLETED} — terminada, lista para valoraciones.</li>
 *   <li>{@code CANCELLED} — cancelada por el creador antes de jugarse.</li>
 * </ul>
 */
public enum SessionStatus {
    OPEN,
    FULL,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}
