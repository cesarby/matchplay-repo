package com.matchplay.session.dto;

import com.matchplay.session.entity.ParticipantRole;

import java.time.Instant;

/**
 * Participante (jugador o waitlist) tal y como se devuelve en el detalle/lista
 * de jugadores de una partida.
 *
 * @param position orden FIFO en la cola (solo cuando {@code role = WAITLIST}); null para PLAYER
 */
public record SessionPlayerResponse(
        Long userId,
        String username,
        ParticipantRole role,
        Integer position,
        Instant joinedAt
) {}
