package com.matchplay.exception;

public class SessionNotFoundException extends ResourceNotFoundException {

    public SessionNotFoundException(Long sessionId) {
        super("error.session.not.found", sessionId);
    }
}
