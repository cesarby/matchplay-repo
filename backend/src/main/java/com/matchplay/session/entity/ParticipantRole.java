package com.matchplay.session.entity;

/**
 * Rol de un usuario apuntado a una partida.
 *
 * <ul>
 *   <li>{@code PLAYER} — apuntado a las plazas confirmadas.</li>
 * </ul>
 *
 * <p>Se modela como enum (en lugar de boolean) para permitir extensión
 * posterior con roles {@code WAITLIST}, {@code RESERVE}, etc. sin migración
 * de columnas.</p>
 */
public enum ParticipantRole {
    PLAYER
}
