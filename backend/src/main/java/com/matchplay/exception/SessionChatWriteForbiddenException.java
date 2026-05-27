package com.matchplay.exception;

/**
 * Lanzada cuando un usuario WAITLIST intenta enviar un mensaje. Solo PLAYER
 * y creador pueden escribir.
 */
public class SessionChatWriteForbiddenException extends MatchplayException {
    public SessionChatWriteForbiddenException() {
        super("error.session.chat.write.forbidden");
    }
}
