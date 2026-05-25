package com.matchplay.game.exception;

import com.matchplay.exception.MatchplayException;

public class BggUnavailableException extends MatchplayException {

    public BggUnavailableException(Throwable cause) {
        super("error.games.bgg.unavailable");
        initCause(cause);
    }
}
