package com.matchplay.exception;

/**
 * Lanzada al intentar cerrar una mesa donde solo está el creador (más sus
 * acompañantes). No hay terceros apuntados, así que "cerrar" no tiene
 * sentido — el creador debería cancelar la partida en su lugar.
 */
public class SessionEmptyCannotCloseException extends MatchplayException {
    public SessionEmptyCannotCloseException() {
        super("error.session.empty.cannot.close");
    }
}
