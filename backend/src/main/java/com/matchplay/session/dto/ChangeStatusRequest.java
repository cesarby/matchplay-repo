package com.matchplay.session.dto;

import com.matchplay.session.entity.SessionStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Cambio manual de estado de una partida.
 *
 * <p>El creador puede ejecutar transiciones legítimas: OPEN→FULL (cerrar
 * inscripciones), OPEN/FULL→CANCELLED, etc. Las transiciones se validan en
 * el service.</p>
 */
public record ChangeStatusRequest(
        @NotNull
        SessionStatus status
) {}
