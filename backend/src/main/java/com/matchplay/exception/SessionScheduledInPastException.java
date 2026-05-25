package com.matchplay.exception;

public class SessionScheduledInPastException extends MatchplayException {

    public SessionScheduledInPastException() {
        super("error.session.scheduled.in.past");
    }
}
