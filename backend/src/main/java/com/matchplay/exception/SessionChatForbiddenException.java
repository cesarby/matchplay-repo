package com.matchplay.exception;

/**
 * Lanzada cuando un usuario que no es participante ni creador intenta
 * acceder al chat de una partida.
 */
public class SessionChatForbiddenException extends MatchplayException {
    public SessionChatForbiddenException() {
        super("error.session.chat.forbidden");
    }
}
