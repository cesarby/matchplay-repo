package com.matchplay.game.exception;

import com.matchplay.exception.MatchplayException;

public class InvalidGameSearchException extends MatchplayException {

    public InvalidGameSearchException(String messageKey, Object... args) {
        super(messageKey, args);
    }
}
