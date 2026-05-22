package com.matchplay.exception;

public class SessionAlreadyJoinedException extends MatchplayException {

    public SessionAlreadyJoinedException() {
        super("error.session.already.joined");
    }
}
