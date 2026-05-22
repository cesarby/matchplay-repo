package com.matchplay.session.entity;

public enum SessionStatus {
    OPEN,       // aceptando jugadores
    FULL,       // completa, sin plazas
    CANCELLED,  // cancelada por el creador
    FINISHED    // partida jugada
}
