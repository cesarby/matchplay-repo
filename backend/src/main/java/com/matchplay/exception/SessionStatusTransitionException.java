package com.matchplay.exception;

public class SessionStatusTransitionException extends MatchplayException {

    public SessionStatusTransitionException(String currentStatus, String requestedStatus) {
        super("error.session.status.invalid.transition", currentStatus, requestedStatus);
    }
}
