package com.matchplay.exception;

/**
 * Lanzada cuando se intenta escribir/leer mensajes de una partida que ya
 * está COMPLETED o CANCELLED (el chat se cerró y los mensajes se borraron).
 */
public class SessionChatClosedException extends MatchplayException {
    public SessionChatClosedException() {
        super("error.session.chat.closed");
    }
}
