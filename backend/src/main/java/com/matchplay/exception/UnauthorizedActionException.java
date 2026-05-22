package com.matchplay.exception;

public class UnauthorizedActionException extends MatchplayException {

    public UnauthorizedActionException(String messageKey) {
        super(messageKey);
    }
}
