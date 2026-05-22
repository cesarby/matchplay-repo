package com.matchplay.exception;

public class SessionFullException extends MatchplayException {

    public SessionFullException() {
        super("error.session.full");
    }
}
