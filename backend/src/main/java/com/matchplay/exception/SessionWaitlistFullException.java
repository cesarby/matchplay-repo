package com.matchplay.exception;

public class SessionWaitlistFullException extends MatchplayException {

    public SessionWaitlistFullException() {
        super("error.session.waitlist.full");
    }
}
