package com.matchplay.session.dto;

import com.matchplay.session.entity.ParticipantRole;

import java.time.Instant;

/**
 * Participante (jugador apuntado) tal y como se devuelve en el detalle/lista
 * de jugadores de una partida.
 */
public record SessionPlayerResponse(
        Long userId,
        String username,
        String name,
        ParticipantRole role,
        Instant joinedAt
) {}
