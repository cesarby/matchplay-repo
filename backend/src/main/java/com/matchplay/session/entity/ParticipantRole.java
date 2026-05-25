package com.matchplay.session.entity;

/**
 * Rol de un usuario apuntado a una partida.
 *
 * <ul>
 *   <li>{@code PLAYER} — apuntado a las plazas confirmadas.</li>
 *   <li>{@code WAITLIST} — en lista de espera; promociona a {@code PLAYER}
 *       automáticamente cuando un {@code PLAYER} se sale o el organizador
 *       aumenta {@code maxPlayers}.</li>
 * </ul>
 */
public enum ParticipantRole {
    PLAYER,
    WAITLIST
}
