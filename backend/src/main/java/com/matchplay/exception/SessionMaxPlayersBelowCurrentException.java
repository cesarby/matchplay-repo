package com.matchplay.exception;

public class SessionMaxPlayersBelowCurrentException extends MatchplayException {

    public SessionMaxPlayersBelowCurrentException(int requestedMax, int currentlyRegistered) {
        super("error.session.max.players.below.current", requestedMax, currentlyRegistered);
    }
}
